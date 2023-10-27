# Food Catalog Microsoft Graph connector

Sample project that uses Teams Toolkit to simplify the process of creating a [Microsoft Graph connector](https://learn.microsoft.com/graph/connecting-external-content-connectors-overview) that pushes data from a custom API to Microsoft Graph and includes the [simplified admin experience](https://learn.microsoft.com/graph/connecting-external-content-deploy-teams).

Sample data is taken from [Open Food Facts API](https://openfoodfacts.github.io/openfoodfacts-server/api/).

## Prerequisites

- [Azure Function Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
- [Dev Tunnels CLI](https://learn.microsoft.com/azure/developer/dev-tunnels/get-started#install)
- Teams Toolkit for Visual Studio Code
- Microsoft 365 tenant with [uploading custom apps enabled](https://learn.microsoft.com/microsoftteams/platform/m365-apps/prerequisites#prepare-a-developer-tenant-for-testing)

## Get started

- Login to dev tunnels, `devtunnel user login`
- First run:
  - Create permanent dev tunnel, `devtunnel create`, take note of the tunnel id or name
  - Create dev tunnel port, `devtunnel port create <tunnel-id-or-name> -p 7071`
  - Open port, `devtunnel access create <tunnel-id-or-name> -p 7071 -a`
- Start tunnel, `devtunnel host <tunnel-id-or-name>`, take note of the tunnel URL shown in output
- Clone repo
- Open repo in VSCode
- Update `env/.env.local`
  - Set `NOTIFICATION_ENDPOINT` to the tunnel URL
  - Set `NOTIFICATION_DOMAIN` to the tunnel URL without `https://`
- Press `F5`

## Architecture

### Activating connector

```mermaid
sequenceDiagram
  actor Admin
  participant TAC
  participant Notification fn
  participant Connector q
  participant Connector fn
  participant Content q
  participant Microsoft Graph
  
  activate TAC
  activate Connector q
  activate Content q
  activate Microsoft Graph

  Admin->>TAC:Activate connector
  TAC->>Notification fn:Webhook(state)
  activate Notification fn
  Notification fn->>Connector q:message(create, id, ticket)
  Connector q-->>Notification fn:response(201 Created)
  Notification fn-->>TAC:response(202 Accepted)
  deactivate Notification fn
  TAC-->>Admin:activated

  alt message=create
    Connector q->>Connector fn:message(create, id, ticket)
    activate Connector fn
    Connector fn->>Microsoft Graph:createConnection(id, ticket, connectionInfo)
    Microsoft Graph-->>Connector fn:response(201 Created)
    Connector fn->>Microsoft Graph:createSchema(connectionId)
    Microsoft Graph-->>Connector fn:response(202 Accepted, location)
    Connector fn->>Connector q:message(status, location)
    Connector q-->>Connector fn:response(201 Created)
  else message=status
    Connector q->>Connector fn:message(status, location)
    Connector fn->>Microsoft Graph:operationStatus(location)
    Microsoft Graph-->>Connector fn:response(status)
    
    alt status=inprogress
      Connector fn->>Connector fn:sleep(5000)
      Connector fn->>Connector q:message(status, location)
      Connector q-->>Connector fn:response(201 Created)
    else status=completed
      Connector fn->>Content q:message(crawl, full)
      Content q-->>Connector fn:response(201 Created)
    end
    deactivate Connector fn
  end
  
  deactivate Microsoft Graph
  deactivate Content q
  deactivate Connector q
  deactivate TAC
```

### Deactivating connector

```mermaid
sequenceDiagram
  actor Admin
  participant TAC
  participant Notification fn
  participant Connector q
  participant Connector fn
  participant Microsoft Graph
  
  activate TAC
  activate Connector q
  activate Microsoft Graph

  Admin->>TAC:Deactivate connector
  TAC->>Notification fn:Webhook(state)
  activate Notification fn
  Notification fn->>Connector q:message(delete)
  Connector q-->>Notification fn:response(201 Created)
  Notification fn-->>TAC:response(202 Accepted)
  deactivate Notification fn
  TAC-->>Admin:deactivated

  Connector q->>Connector fn:message(delete)
  activate Connector fn
  Connector fn->>Microsoft Graph:deleteConnection(id)
  Microsoft Graph-->>Connector fn:response(202 Accepted)
  deactivate Connector fn
  
  deactivate Microsoft Graph
  deactivate Connector q
  deactivate TAC
```

### Scheduled crawl

Scheduled crawl can be either incremental crawl or removing items deleted from the external source.

```mermaid
sequenceDiagram
  participant Timer
  participant Content timer fn
  participant Content q
  
  activate Timer
  activate Content q

  Timer->>Content timer fn:onTimer
  activate Content timer fn
  Content timer fn->>Content q:message(crawl, crawlType)
  Content q-->>Content timer fn:response(201 Created)
  deactivate Content timer fn

  deactivate Content q
  deactivate Timer
```

### On-demand crawl

```mermaid
sequenceDiagram
  actor User
  participant Content HTTP trigger fn
  participant Content q
  
  activate Content q

  User->>Content HTTP trigger fn:crawl(crawlType)
  activate Content HTTP trigger fn
  alt type=full
    Content HTTP trigger fn->>Content q:message(crawl, crawlType)
    Content q-->>Content HTTP trigger fn:response(201 Created)
    Content HTTP trigger fn-->>User:response(202 Accepted)
  else type=incremental
    Content HTTP trigger fn->>Content q:message(crawl, incremental)
    Content q-->>Content HTTP trigger fn:response(201 Created)
    Content HTTP trigger fn-->>User:response(202 Accepted)
  else type=removeDeleted
    Content HTTP trigger fn->>Content q:message(crawl, removeDeleted)
    Content q-->>Content HTTP trigger fn:response(201 Created)
    Content HTTP trigger fn-->>User:response(202 Accepted)
  else else
    Content HTTP trigger fn-->>User:response(400 Bad Request)  
  end
  deactivate Content HTTP trigger fn
  
  deactivate Content q
```

### Crawl

```mermaid
sequenceDiagram
  participant Content q
  participant Content fn
  participant State storage
  participant Microsoft Graph
  participant External content
  
  activate Content q
  activate State storage
  activate Microsoft Graph
  activate External content

  alt message=crawl
    Content q->>Content fn:message(crawl, crawlType)
    activate Content fn
    alt crawlType=full
      Content fn->>External content:getContent
      External content-->>Content fn:content
    else crawlType=incremental
      Content fn->>State storage:getLatestItemDate
      State storage-->>Content fn:response(latestItemDate)
      Content fn->>External content:getContent(latestItemDate)
      External content-->>Content fn:content
    end
    
    loop each content item
      Content fn->>Content q:message(item, update, itemId)
      Content q-->>Content fn:response(201 Created)
    end
    deactivate Content fn
  else message=item
    Content q->>Content fn:message(item, update, itemId)
    activate Content fn
    Content fn->>External content:getContent(itemId)
    External content-->>Content fn:content(item)
    Content fn->>Content fn:transform(item)
    Content fn->>Microsoft Graph:PUT externalItem(item)
    Microsoft Graph-->>Content fn:response(200 OK)

    Content fn->>State storage:getLastModified
    State storage-->>Content fn:response(lastModifiedDate)

    alt lastModifiedDate<itemDate
      Content fn->>State storage:recordLastModified(itemDate)
      State storage-->>Content fn:response(204 No Content)
    end
    deactivate Content fn
  end
  
  deactivate External content
  deactivate Microsoft Graph
  deactivate Content q
  deactivate State storage
```

### Removing deleted content

```mermaid
sequenceDiagram
  participant Content q
  participant Content fn
  participant State storage
  participant Microsoft Graph
  participant External content
  
  activate Content q
  activate State storage
  activate Microsoft Graph
  activate External content

  alt message=crawl
    Content q->>Content fn:message(crawl, removeDeleted)
    activate Content fn
    
    Content fn->>State storage:getIngestedItems
    State storage-->>Content fn:response(ingestedItems)
    Content fn->>External content:getContent
    External content-->>Content fn:response(content)
  
    loop each ingested item
        alt ingested item not in content
          Content fn->>Content q:message(item, delete, itemId)
          Content q-->>Content fn:response(201 Created)
        end
      end
  
    deactivate Content fn
  end

  alt message=item
    Content q->>Content fn:message(item, delete, itemId)

    Content fn->>Microsoft Graph:DELETE externalItem(itemId)
    Microsoft Graph-->>Content fn:response(204 No Content)

    Content fn->>State storage:removeIngestedItem(itemId)
    State storage-->>Content fn:response(204 No Content)
  end
  
  deactivate External content
  deactivate Microsoft Graph
  deactivate Content q
  deactivate State storage
```

## Test function

- Go to `Start local tunnel` terminal window to discover forwarding URL e.g. `https://<tunnelid>-7071.<region>.devtunnels.ms`
- `curl https://<tunnelid>-7071.<region>.devtunnels.ms/api/notification`

### Products API

Get products

```http
GET /api/products
```

Get product

```http
GET /api/product/{id}
```

Create product

```http
POST api/products

{"product_name":"New product"}
```

Update product

```http
PATCH api/products/{id}

{"product_name":"Updated product name"}
```

Delete product

```http
DELETE api/products/{id}
```

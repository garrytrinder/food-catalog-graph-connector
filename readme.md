# Food Catalog Microsoft Graph connector

Sample project that uses Teams Toolkit to simplify the process of creating a [Microsoft Graph connector](https://learn.microsoft.com/graph/connecting-external-content-connectors-overview) that pushes data from a custom API to Microsoft Graph and includes the [simplified admin experience](https://learn.microsoft.com/graph/connecting-external-content-deploy-teams).

Sample data is taken from [Open Food Facts API](https://openfoodfacts.github.io/openfoodfacts-server/api/).

## Prerequisites

 - [Azure Function Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
 - [Dev Tunnels CLI](https://learn.microsoft.com/azure/developer/dev-tunnels/get-started#install)
 - Teams Toolkit for Visual Studio Code
 - Microsoft 365 tenant with [uploading custom apps enabled](https://learn.microsoft.com/microsoftteams/platform/m365-apps/prerequisites#prepare-a-developer-tenant-for-testing)

 ## Get started

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
  participant MAC
  participant Webhook fn
  participant Connector q
  participant Connector fn
  participant Content q
  participant Graph
  
  activate MAC
  activate Connector q
  activate Content q
  activate Graph

  Admin->>MAC:Activate connector
  MAC->>Webhook fn:Webhook(state)
  activate Webhook fn
  Webhook fn->>Connector q:message(create, id, ticket)
  Connector q-->>Webhook fn:response(201 Created)
  Webhook fn-->>MAC:response(202 Accepted)
  deactivate Webhook fn
  MAC-->>Admin:activated

  alt message=create
    Connector q->>Connector fn:message(create, id, ticket)
    activate Connector fn
    Connector fn->>Graph:createConnection(id, ticket, connectionInfo)
    Graph-->>Connector fn:response(201 Created)
    Connector fn->>Graph:createSchema(connectionId)
    Graph-->>Connector fn:response(202 Accepted, location)
    Connector fn->>Connector q:message(status, location)
    Connector q-->>Connector fn:response(201 Created)
  else message=status
    Connector q->>Connector fn:message(status, location)
    Connector fn->>Graph:operationStatus(location)
    Graph-->>Connector fn:response(status)
    
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
  
  deactivate Graph
  deactivate Content q
  deactivate Connector q
  deactivate MAC
```

### Deactivating connector

```mermaid
sequenceDiagram
  actor Admin
  participant MAC
  participant Webhook fn
  participant Connector q
  participant Connector fn
  participant Graph
  
  activate MAC
  activate Connector q
  activate Graph

  Admin->>MAC:Deactivate connector
  MAC->>Webhook fn:Webhook(state)
  activate Webhook fn
  Webhook fn->>Connector q:message(delete)
  Connector q-->>Webhook fn:response(201 Created)
  Webhook fn-->>MAC:response(202 Accepted)
  deactivate Webhook fn
  MAC-->>Admin:deactivated

  Connector q->>Connector fn:message(delete)
  activate Connector fn
  Connector fn->>Graph:deleteConnection(id)
  Graph-->>Connector fn:response(202 Accepted)
  deactivate Connector fn
  
  deactivate Graph
  deactivate Connector q
  deactivate MAC
```

### Scheduled crawl

```mermaid
sequenceDiagram
  participant Timer
  participant Content timer fn
  participant Content q
  
  activate Timer
  activate Content q

  Timer->>Content timer fn:onTimer
  activate Content timer fn
  Content timer fn->>Content q:message(crawl, incremental)
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

  User->>Content HTTP trigger fn:crawl(type)
  activate Content HTTP trigger fn
  alt type=full
    Content HTTP trigger fn->>Content q:message(crawl, full)
    Content q-->>Content HTTP trigger fn:response(201 Created)
  else type=incremental
    Content HTTP trigger fn->>Content q:message(crawl, incremental)
    Content q-->>Content HTTP trigger fn:response(201 Created)
  end
  Content HTTP trigger fn-->>User:response(202 Accepted)
  deactivate Content HTTP trigger fn
  
  deactivate Content q
```

### Crawl

```mermaid
sequenceDiagram
  participant Content q
  participant Content fn
  participant Content storage
  participant Graph
  participant External content
  
  activate Content q
  activate Content storage
  activate Graph
  activate External content

  alt message=crawl
    Content q->>Content fn:message(crawl, type)
    activate Content fn
    alt type=full
      Content fn->>External content:getContent
      External content-->>Content fn:content
    else type=incremental
      Content fn->>Content storage:getLatestItemDate
      Content storage-->>Content fn:response(latestItemDate)
      Content fn->>External content:getContent(latestItemDate)
      External content-->>Content fn:content
    end
    
    loop each content item
      Content fn->>Content q:message(item, item)
      Content q-->>Content fn:response(201 Created)
    end
    deactivate Content fn
  else message=item
    Content q->>Content fn:message(item, item)
    activate Content fn
    Content fn->>External content:getContent(item)
    External content-->>Content fn:content(item)
    Content fn->>Content fn:transform(item)
    Content fn->>Graph:externalItem(item)
    Graph-->>Content fn:response(200 OK)

    Content fn->>Content storage:getLatestItemDate
    Content storage-->>Content fn:response(latestItemDate)

    alt latestItemDate<itemDate
      Content fn->>Content storage:updateLatestItemDate(itemDate)
      Content storage-->>Content fn:response(204 No Content)
    end
    deactivate Content fn
  end
  
  deactivate External content
  deactivate Graph
  deactivate Content q
  deactivate Content storage
```

## Test function

 - Go to `Start local tunnel` terminal window to discover forwarding URL e.g. `https://<tunnelid>-7071.<region>.devtunnels.ms`
 - `curl https://<tunnelid>-7071.<region>.devtunnels.ms/api/notification`

### Queue

 - Open Microsoft Azure Storage Explorer
 - Expand `Emulated & Attached` > `Emulator Default Ports` > `Queues`
 - Create new queue called `queue-connection`
 - Create new queue called `queue-content`
 - Create message in queue

### Products API

Get products

```
GET /api/products
```
Get product

```
GET /api/product/{id}
```

Create product

```
POST api/products
{"product_name":"New product"}
```

Update product

```
PATCH api/products/{id}
{"product_name":"Updated product name"}
```

Delete product

```
DELETE api/products/{id}
```
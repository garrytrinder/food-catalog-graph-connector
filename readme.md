# GitHub Microsoft Graph connector

Sample project that uses Teams Toolkit to simplify the process of creating a [Microsoft Graph connector](https://learn.microsoft.com/graph/connecting-external-content-connectors-overview) that pushes data from GitHub to Microsoft Graph and includes the [simplified admin experience](https://learn.microsoft.com/graph/connecting-external-content-deploy-teams).

## Prerequisities

 - [Azure Function Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
 - Teams Toolkit for Visual Studio Code
 - Microsoft 365 tenant with [uploading custom apps enabled](https://learn.microsoft.com/microsoftteams/platform/m365-apps/prerequisites#prepare-a-developer-tenant-for-testing)

 ## Get started

 - Clone repo
 - Open in VSCode
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
  participant Content fn
  participant Content storage
  participant Graph
  participant External content
  
  activate MAC
  activate Connector q
  activate Content q
  activate Content storage
  activate Graph
  activate External content

  Admin->>MAC:Toggle connector
  MAC->>Webhook fn:Webhook(state)
  activate Webhook fn
  Webhook fn->>Connector q:message(create, id, ticket)
  Webhook fn-->>MAC:response(202 Accepted)
  MAC-->>Admin:activated
  deactivate Webhook fn

  alt message=create
    Connector q->>Connector fn:message(create, id, ticket)
    activate Connector fn
    Connector fn->>Graph:createConnection(id, ticket, connectionInfo)
    Graph-->>Connector fn:response(201 Created)
    Connector fn->>Graph:createSchema(connectionId)
    Graph-->>Connector fn:response(202 Accepted, location)
    Connector fn->>Connector q:message(status, location)
  else message=status
    Connector q->>Connector fn:message(status, location)
    Connector fn->>Graph:operationStatus(location)
    Graph-->>Connector fn:response(status)
    
    alt status=inprogress
      Connector fn->>Connector fn:sleep(5000)
      Connector fn->>Connector q:message(status, location)
    else status=completed
      Connector fn->>Content q:message(start, full)
    end
  end

  alt message=start
    Content q->>Content fn:message(start)
    activate Content fn
    Content fn->>External content:getContent
    External content-->>Content fn:content
    
    loop each content item
      Content fn->>Content q:message(crawl, item)
    end
  else message=crawl
    Content q->>Content fn:message(crawl, item)
    Content fn->>External content:getContent(item)
    External content-->>Content fn:content(item)
    Content fn->>Content fn:transform(item)
    Content fn->>Graph:externalItem(item)
    Graph-->>Content fn:response(200 OK)

    Content fn->>Content storage:getLatestItemDate
    Content storage-->>Content fn:response(latestItemDate)

    alt latestItemDate<itemDate
      Content fn->>Content storage:updateLatestItemDate(itemDate)
    end
    deactivate Content fn
  end
  
  deactivate External content
  deactivate Graph
  deactivate Content q
  deactivate Content storage
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
  participant External content
  
  activate MAC
  activate Connector q
  activate Graph
  activate External content

  Admin->>MAC:Toggle connector
  MAC->>Webhook fn:Webhook(state)
  activate Webhook fn
  Webhook fn->>Connector q:message(delete)
  Webhook fn-->>MAC:response(202 Accepted)
  MAC-->>Admin:deactivated
  deactivate Webhook fn

  Connector q->>Connector fn:message(delete)
  activate Connector fn
  Connector fn->>Graph:deleteConnection(id)
  Graph-->>Connector fn:response(202 Accepted)
  deactivate Connector fn
  
  deactivate Graph
  deactivate Connector q
  deactivate MAC
```

### Incremental crawl

### On-demand crawl

## Test function

 - Go to `Start local tunnel` terminal window to discover forwarding URL e.g. `https://<tunnelid>-7071.<region>.devtunnels.ms`
 - `curl https://<tunnelid>-7071.<region>.devtunnels.ms/api/notification`

### Queue

 - Open Microsoft Azure Storage Explorer
 - Expand `Emulated & Attached` > `Emulator Default Ports` > `Queues`
 - Create new queue called `queue-items`
 - Create message in queue
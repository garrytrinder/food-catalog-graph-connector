import { TableClient, TableServiceClient } from "@azure/data-tables";
import { InvocationContext } from "@azure/functions";

interface StateRecord {
    date: number;
}

export async function getTableClient(tableName: string) {
    const connectionString = process.env.AzureWebJobsStorage;
    const tableServiceClient = TableServiceClient.fromConnectionString(connectionString);
    await tableServiceClient.createTable(tableName);
    return TableClient.fromConnectionString(connectionString, tableName);
}

export async function addItem(itemId: string, context: InvocationContext) {
    context.debug(`Getting table client for externalitems...`);
    const tableClient = await getTableClient('externalitems');
    const entity = {
        partitionKey: 'products',
        rowKey: itemId
    }

    context.debug(`Upserting entity ${JSON.stringify(entity, null, 2)}...`);
    await tableClient.upsertEntity(entity);
}

export async function recordLastModified(lastModifiedDate: number, context: InvocationContext) {
    context.debug(`Getting table client for state...`);
    const tableClient = await getTableClient('state');
    let lastModified
    try {
        context.debug(`Getting entity lastModified...`);
        lastModified = await tableClient.getEntity<StateRecord>('state', 'lastModified');
    }
    catch (e) {
        context.debug(`Error getting entity lastModified: ${e.message}`);
    }
    if (lastModified && lastModified.date > lastModifiedDate) {
        context.debug(`Last modified date ${lastModified.date} is newer than ${lastModifiedDate}`);
        // we've got a newer record already
        return;
    }

    const entity = {
        partitionKey: 'state',
        rowKey: 'lastModified',
        date: lastModifiedDate
    };
    context.debug(`Upserting entity ${JSON.stringify(entity, null, 2)}...`);
    await tableClient.upsertEntity(entity);
}
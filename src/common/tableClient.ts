import { TableClient, TableServiceClient } from "@azure/data-tables";

export async function getTableClient(tableName: string) {
    const connectionString = process.env.AzureWebJobsStorage;
    const tableServiceClient = TableServiceClient.fromConnectionString(connectionString);
    await tableServiceClient.createTable(tableName);
    return TableClient.fromConnectionString(connectionString, tableName);
}

export async function addItem(itemId: string) {
    const tableClient = await getTableClient('externalitems');
    const entity = {
        partitionKey: 'products',
        rowKey: itemId
    }
    await tableClient.createEntity(entity);
}
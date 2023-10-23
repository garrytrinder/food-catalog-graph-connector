import { TableClient } from "@azure/data-tables";

export function getTableClient(tableName: string) {
    return TableClient.fromConnectionString(process.env.AzureWebJobsStorage, tableName);
}
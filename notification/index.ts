import { TableClient, TableServiceClient } from "@azure/data-tables";
import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { randomUUID } from "crypto";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  const tableServiceClient = TableServiceClient.fromConnectionString("UseDevelopmentStorage=true");
  await tableServiceClient.createTable('table');
  const tableClient = TableClient.fromConnectionString("UseDevelopmentStorage=true", 'table');
  await tableClient.createEntity({
    partitionKey: 'table',
    rowKey: randomUUID(),
    date: new Date().toISOString()
  })
  context.res = {
    body: `Hello, world! Client ID: ${process.env.AAD_APP_CLIENT_ID}`,
  };
};

export default httpTrigger;

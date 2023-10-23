import { InvocationContext, app } from "@azure/functions";

app.storageQueue("contentQueue", {
    connection: "AzureWebJobsStorage",
    queueName: "queue-content",
    handler: async (message: any, context: InvocationContext) => {
        context.log('Queue trigger function processed work item', message);
    }
});
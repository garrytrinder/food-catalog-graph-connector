import { QueueServiceClient } from '@azure/storage-queue';
import { ConnectionMessage } from './ConnectionMessage';

export async function getQueueClient(queueName: string) {
  const connectionString = process.env.AzureWebJobsStorage;
  const queueServiceClient = QueueServiceClient.fromConnectionString(connectionString);
  await queueServiceClient.createQueue(queueName);
  return queueServiceClient.getQueueClient(queueName);
}

export async function enqueueCheckStatus(location: string) {
  const message: ConnectionMessage = {
      action: 'status',
      location
  }
  const queueClient = await getQueueClient('queue-connection');
  // wait 60s before polling again for status
  await queueClient.sendMessage(btoa(JSON.stringify(message)), { visibilityTimeout: 60 });
}

export async function startFullCrawl() {
  const queueClient = await getQueueClient('queue-content');
  const message = {
    action: 'crawl',
    crawl: 'full'
  }
  await queueClient.sendMessage(btoa(JSON.stringify(message)));
}
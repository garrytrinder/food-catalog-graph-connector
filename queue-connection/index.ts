import { AzureFunction, Context } from '@azure/functions';
import { ResponseType } from '@microsoft/microsoft-graph-client';
import { ExternalConnectors } from '@microsoft/microsoft-graph-types';
import * as fs from 'fs';
import { ConnectionMessage } from '../common/ConnectionMessage';
import { config } from '../common/config';
import { client } from '../common/graphClient';
import { enqueueCheckStatus, startFullCrawl } from '../common/queueClient';

async function createConnection(connectorId: string, connectorTicket: string) {
    const { id, name, description, activitySettings, searchSettings } = config.connector;
    const adaptiveCard = fs.readFileSync('./resultLayout.json', 'utf8');
    searchSettings.searchResultTemplates[0].layout = JSON.parse(adaptiveCard);

    await client
        .api('/external/connections')
        .version('beta')
        .header('GraphConnectors-Ticket', connectorTicket)
        .post({
            id,
            connectorId,
            name,
            description,
            activitySettings,
            searchSettings
        });
}

async function createSchema() {
    const { id, schema } = config.connector;
    const res: Response = await client
        .api(`/external/connections/${id}/schema`)
        .responseType(ResponseType.RAW)
        .header('content-type', 'application/json')
        .patch({
            baseType: 'microsoft.graph.externalItem',
            properties: schema
        });

    const location: string = res.headers.get('Location');
    await enqueueCheckStatus(location);
}

async function checkSchemaStatus(location: string) {
    const res: ExternalConnectors.ConnectionOperation = await client
        .api(location)
        .get();

    switch (res.status) {
        case 'inprogress':
            await enqueueCheckStatus(location);
            break;
        case 'completed':
            await startFullCrawl();
            break;
    }
}

async function deleteConnection() {
    await this.graphClient
        .api(`/external/connections/${config.connector.id}`)
        .delete();
}

const queueTrigger: AzureFunction = async function (context: Context, myQueueItem: any): Promise<void> {
    const message: ConnectionMessage = JSON.parse(myQueueItem);

    switch (message.action) {
        case 'create':
            await createConnection(message.connectorId, message.connectorTicket);
            createSchema();
            break;
        case 'delete':
            await deleteConnection();
            break;
        case 'status':
            await checkSchemaStatus(message.location);
            break;
        default:
            break;
    }
};

export default queueTrigger;
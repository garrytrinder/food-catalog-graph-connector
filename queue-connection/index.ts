import { AzureFunction, Context } from '@azure/functions';
import { ResponseType } from '@microsoft/microsoft-graph-client';
import { ExternalConnectors } from '@microsoft/microsoft-graph-types';
import { ConnectionMessage } from '../common/ConnectionMessage';
import { config } from '../common/config';
import { client } from '../common/graphClient';
import { enqueueCheckStatus, startFullCrawl } from '../common/queueClient';
import { resultLayout } from '../common/resultLayout';

async function createConnection(connectorId: string, connectorTicket: string) {
    const { id, name, description, activitySettings, searchSettings } = config.connector;
    searchSettings.searchResultTemplates[0].layout = resultLayout;

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

const queueTrigger: AzureFunction = async function (context: Context, message: ConnectionMessage): Promise<void> {
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

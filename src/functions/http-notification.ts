import { app, HttpRequest, InvocationContext } from "@azure/functions";
import { ConnectionMessage } from "../common/ConnectionMessage";
import { getQueueClient } from "../common/queueClient";
import { validateToken } from "../common/validateToken";
import { streamToJson } from "../common/utils";

enum TargetConnectorState {
    Enabled = 'enabled',
    Disabled = 'disabled',
}

app.http('notification', {
    methods: ['POST'],
    handler: async (request: HttpRequest, context: InvocationContext) => {
        const body = await streamToJson(request.body);
        context.debug('Received notification');
        context.debug(JSON.stringify(body, null, 2));

        const tenantId = process.env.AAD_APP_TENANT_ID;
        const clientId = process.env.AAD_APP_CLIENT_ID;

        const token = body?.validationTokens[0];
        context.debug(`Validating token: ${token}, tenantId: ${tenantId}, clientId: ${clientId}...`);
        await validateToken(token, tenantId, clientId);
        context.log('Token validated');

        const changeDetails = body?.value[0]?.resourceData;
        const targetConnectorState = changeDetails?.state;

        const message: ConnectionMessage = {
            connectorId: changeDetails?.id,
            connectorTicket: changeDetails?.connectorsTicket
        }

        if (targetConnectorState === TargetConnectorState.Enabled) {
            message.action = 'create';
        }
        else if (targetConnectorState === TargetConnectorState.Disabled) {
            message.action = 'delete';
        }

        if (!message.action) {
            context.error('Invalid action');
            return;
        }

        context.debug(JSON.stringify(message, null, 2));

        const queueClient = await getQueueClient('queue-connection');
        const messageString = btoa(JSON.stringify(message));
        context.debug('Sending message to queue queue-connection: ${message}');
        // must base64 encode
        await queueClient.sendMessage(messageString);
        context.debug('Message sent');

        return {
            status: 202
        }
    }
})
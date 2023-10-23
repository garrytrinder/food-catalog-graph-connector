import { app, HttpRequest } from "@azure/functions";
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
    handler: async (request: HttpRequest) => {
        const body = await streamToJson(request.body);

        const tenantId = process.env.AAD_APP_TENANT_ID;
        const clientId = process.env.AAD_APP_CLIENT_ID;

        const token = body?.validationTokens[0];
        await validateToken(token, tenantId, clientId);

        const changeDetails = body?.resourceData;
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
            return;
        }

        const queueClient = await getQueueClient('queue-connection');
        // must base64 encode
        await queueClient.sendMessage(btoa(JSON.stringify(message)));

        return {
            status: 202
        }
    }
})
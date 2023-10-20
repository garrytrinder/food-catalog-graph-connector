import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { ConnectionMessage } from '../common/ConnectionMessage';
import { getQueueClient } from '../common/queueClient';
import { validateToken } from './validateToken';

enum TargetConnectorState {
  Enabled = 'enabled',
  Disabled = 'disabled',
}

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  // send a 202 to acknowledge receiving the request
  context.res = {
    status: 202
  };

  const tenantId = process.env.TenantId;
  const clientId = process.env.ClientId;

  const token = req.body?.validationTokens[0];
  await validateToken(token, tenantId, clientId);

  const changeDetails = req.body?.value[0]?.resourceData;
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
  await queueClient.sendMessage(JSON.stringify(message));
};

export default httpTrigger;
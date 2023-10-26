import { ClientSecretCredential } from '@azure/identity';
import { Client, MiddlewareFactory } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';
import { DebugMiddleware } from './debugMiddleware';

const credential = new ClientSecretCredential(
  process.env.AAD_APP_TENANT_ID,
  process.env.AAD_APP_CLIENT_ID,
  process.env.AAD_APP_CLIENT_SECRET
);

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ['https://graph.microsoft.com/.default'],
});

const middleware = MiddlewareFactory.getDefaultMiddlewareChain(authProvider);
// middleware.splice(-1, 0, new (DebugMiddleware as any)());

export const client = Client.initWithMiddleware({ middleware });

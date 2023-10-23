import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';

const credential = new ClientSecretCredential(
  process.env.AAD_APP_TENANT_ID,
  process.env.AAD_APP_CLIENT_ID,
  process.env.AAD_APP_CLIENT_SECRET
);

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ['https://graph.microsoft.com/.default'],
});

export const client = Client.initWithMiddleware({ authProvider });

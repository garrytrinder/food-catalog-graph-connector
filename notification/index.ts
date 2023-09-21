import { AzureFunction, Context, HttpRequest } from "@azure/functions";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.res = {
    body: `Hello, world! Client ID: ${process.env.AAD_APP_CLIENT_ID}`,
  };
};

export default httpTrigger;

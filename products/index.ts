import { TableClient } from "@azure/data-tables";
import { AzureFunction, Context, HttpRequest } from "@azure/functions"

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const tableClient = TableClient.fromConnectionString(process.env.AzureWebJobsStorage, 'products');

    const { method } = req;
    const { id } = req.query;

    // GET api/products
    if (method === 'GET' && !id) {
        let products = [];
        const entities = tableClient.listEntities();
        for await (const entity of entities) {
            products.push(entity);
        }

        context.res = {
            status: 200,
            body: products
        }
    }

    // GET api/products?id={id}
    if (method === 'GET' && id) {
        const product = await tableClient.getEntity('products', id);
        context.res = {
            status: 200,
            body: product
        }
    }

    // POST api/products
    if (method === 'POST') {
        context.res = {
            status: 501,
            body: 'Not implemented'
        }
    }

    // PATCH api/products?id={id}
    if (method === 'PATCH' && id) {
        context.res = {
            status: 501,
            body: 'Not implemented'
        }
    }

    // DELETE api/products?id={id}
    if (method === 'DELETE' && id) {
        context.res = {
            status: 501,
            body: 'Not implemented'
        }
    }
};

export default httpTrigger;
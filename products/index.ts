import { TableClient } from "@azure/data-tables";
import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { randomUUID } from "crypto";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const tableClient = TableClient.fromConnectionString(process.env.AzureWebJobsStorage, 'products');

    const { method, body } = req;
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
        try {
            const product = await tableClient.getEntity('products', id);
            context.res = {
                status: 200,
                body: product
            }
        } catch (error) {
            context.res = {
                status: error.statusCode,
            }
        }
    }

    // POST api/products
    if (method === 'POST' && !id) {
        try {
            const newProduct = {
                partitionKey: "products",
                rowKey: randomUUID().replace(/-|[a-z]/g, ''),
                last_modified_t: Date.now(),
                ...body,
            }
            await tableClient.createEntity(newProduct);
            context.res = {
                status: 201
            }
        } catch (error) {
            context.res = {
                status: error.statusCode,
            }
        }
    }

    // PATCH api/products?id={id}
    if (method === 'PATCH' && id) {
        try {
            const product = await tableClient.getEntity("products", id);
            await tableClient.updateEntity({ ...product, ...body, last_modified_t: Date.now(), }, "Merge");
            context.res = {
                status: 200
            }
        } catch (error) {
            context.res = {
                status: error.statusCode,
            }
        }
    }

    // DELETE api/products?id={id}
    if (method === 'DELETE' && id) {
        try {
            await tableClient.getEntity("products", id);
            await tableClient.deleteEntity('products', id);
            context.res = {
                status: 200
            }
        } catch (error) {
            context.res = {
                status: error.statusCode,
            }
        }
    }
};

export default httpTrigger;
import { HttpRequest, app } from "@azure/functions";
import { getTableClient } from "../common/tableClient";
import { randomUUID } from "crypto";
import { streamToJson } from "../common/utils";

app.http('getProducts', {
    methods: ['GET'],
    route: 'products',
    handler: async () => {
        let products = [];
        const tableClient = getTableClient('products');
        const entities = tableClient.listEntities();
        for await (const entity of entities) {
            products.push({
                id: entity.rowKey,
                last_modified: entity.last_modified_t
            });
        }

        return {
            status: 200,
            body: JSON.stringify(products, null, 2),
            headers: {
                'Content-Type': 'application/json'
            }
        }
    }
});

app.http('getProduct', {
    methods: ['GET'],
    route: 'products/{id}',
    handler: async (request: HttpRequest) => {
        const { id } = request.params;

        try {
            const tableClient = getTableClient('products');
            const product = await tableClient.getEntity('products', id);
            return {
                status: 200,
                body: JSON.stringify(product, null, 2),
            }
        } catch (error) {
            return {
                status: error.statusCode,
            }
        }
    }
});

app.http('createProduct', {
    methods: ['POST'],
    route: 'products',
    handler: async (request: HttpRequest) => {
        const { body } = request;

        try {
            const tableClient = getTableClient('products');
            const newProduct = {
                partitionKey: "products",
                rowKey: randomUUID().replace(/-|[a-z]/g, ''),
                last_modified_t: Date.now(),
                ...await streamToJson(body),
            }
            await tableClient.createEntity(newProduct);
            return {
                status: 201
            }
        } catch (error) {
            return {
                status: error.statusCode,
            }
        }
    }
});

app.http('updateProduct', {
    methods: ['PATCH'],
    route: 'products/{id}',
    handler: async (request: HttpRequest) => {
        const { id } = request.params;
        const { body } = request;
        try {
            const tableClient = getTableClient('products');
            const product = await tableClient.getEntity("products", id);
            await tableClient.updateEntity({ ...product, ...await streamToJson(body), last_modified_t: Date.now(), }, "Merge");
            return {
                status: 200
            }
        } catch (error) {
            return {
                status: error.statusCode,
            }
        }
    }
});

app.http('deleteProduct', {
    methods: ['DELETE'],
    route: 'products/{id}',
    handler: async (request: HttpRequest) => {
        const { id } = request.params;
        try {
            const tableClient = getTableClient('products');
            await tableClient.getEntity("products", id);
            await tableClient.deleteEntity('products', id);
            return {
                status: 200
            }
        } catch (error) {
            return {
                status: error.statusCode,
            }
        }
    }
});
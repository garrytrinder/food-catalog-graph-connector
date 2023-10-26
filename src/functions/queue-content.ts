import { InvocationContext, app } from "@azure/functions";
import { ContentMessage, CrawlType, ItemAction } from "../common/ContentMessage";
import { config } from "../common/config";
import { client } from "../common/graphClient";
import { enqueueItemUpdate } from "../common/queueClient";
import { addItem, recordLastModified } from "../common/tableClient";

const apiUrl = process.env.NOTIFICATION_ENDPOINT;

async function crawl(crawlType: CrawlType, context: InvocationContext) {
    // TODO: add incremental crawl
    const url = `${apiUrl}/api/products`;

    context.debug(`Retrieving item from ${url}...`);

    const res = await fetch(url);
    if (!res.ok) {
        context.debug(`Error retrieving item from ${url}: ${res.statusText}`);
        return;
    }

    const products: Product[] = await res.json();
    context.debug(`Retrieved ${products.length} items from ${url}`);

    for (const product of products) {
        context.debug(`Enqueuing item update for ${product.id}...`);
        enqueueItemUpdate(product.id);
    }
}

async function processItem(itemId: string, itemAction: ItemAction, context: InvocationContext) {
    // TODO: add support for deleting item

    const url = `${apiUrl}/api/products/${itemId}`;

    context.debug(`Retrieving item from ${url}...`);

    const res = await fetch(url);
    if (!res.ok) {
        context.debug(`Error retrieving item from ${url}: ${res.statusText}`);
        return;
    }

    const product: Product = await res.json();
    context.debug(`Retrieved product from ${url}`);
    context.debug(JSON.stringify(product, null, 2));

    const externalItem = {
        id: product.id,
        properties: {
            'categories@odata.type': 'Collection(String)',
            categories: product.categories.replace(/en:/g, '').split(', '),
            ecoscore: product.ecoscore_grade,
            imageUrl: product.image_url,
            'ingredients@odata.type': 'Collection(String)',
            ingredients: product.ingredients_text.split(', '),
            nutriscore: product.nutriscore_grade,
            'traces@odata.type': 'Collection(String)',
            traces: product.traces_tags.replace(/en:/g, '').split(', '),
            name: product.product_name,
            url: product.url.replace('.net/', '.org/')
        },
        content: {
            value: product.product_name,
            type: 'text'
        },
        acl: [
            {
                accessType: 'grant',
                type: 'everyone',
                value: 'everyone'
            }
        ]
    }

    context.debug(`Transformed item`);
    context.debug(JSON.stringify(externalItem, null, 2));

    const externalItemUrl = `/external/connections/${config.connector.id}/items/${product.id}`;
    context.debug(`Updating external item ${externalItemUrl}...`)

    await client
        .api(externalItemUrl)
        .header('content-type', 'application/json')
        .put(externalItem);
    
    context.debug(`Adding item ${product.id} to table storage...`);
    // track item to support deletion
    await addItem(product.id, context);
    context.debug(`Tracking last modified date ${product.last_modified}`);
    // track last modified date for incremental crawl
    await recordLastModified(product.last_modified, context);
}

app.storageQueue("contentQueue", {
    connection: "AzureWebJobsStorage",
    queueName: "queue-content",
    handler: async (message: ContentMessage, context: InvocationContext) => {
        context.debug('Received message from queue queue-content');
        context.debug(JSON.stringify(message, null, 2));

        const { action, crawlType, itemAction, itemId } = message;

        switch (action) {
            case 'crawl':
                await crawl(crawlType, context);
                break;
            case 'item':
                await processItem(itemId, itemAction, context);
                break;
            default:
                break;
        }
    }
});
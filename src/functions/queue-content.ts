import { InvocationContext, app } from "@azure/functions";
import { ContentMessage, CrawlType, ItemAction } from "../common/ContentMessage";
import { config } from "../common/config";
import { client } from "../common/graphClient";
import { enqueueItemUpdate } from "../common/queueClient";
import { addItem } from "../common/tableClient";

const apiUrl = process.env.NOTIFICATION_ENDPOINT;

async function crawl(crawlType: CrawlType) {
    // TODO: add incremental crawl

    const res = await fetch(`${apiUrl}/api/products`);
    if (!res.ok) {
        return;
    }

    const products: Product[] = await res.json();
    for (const product of products) {
        enqueueItemUpdate(product.id);
    }
}

async function processItem(itemId: string, itemAction: ItemAction) {
    // TODO: add support for deleting item

    const res = await fetch(`${apiUrl}/api/products/${itemId}`);
    if (!res.ok) {
        return;
    }

    const product: Product = await res.json();

    const externalItem = {
        id: product.id,
        properties: {
            'categories@odata.type': 'Collection(String)',
            categories: product.categories.replace(/en:/g, '').split(', '),
            ecoscore: product.ecoscore_grade,
            image_url: product.image_url,
            'ingredients@odata.type': 'Collection(String)',
            ingredients: product.ingredients_text.split(', '),
            nutriscore: product.nutriscore_grade,
            'traces@odata.type': 'Collection(String)',
            traces: product.traces_tags.replace(/en:/g, '').split(', '),
            name: product.product_name,
            url: product.url.replace('.net/', '.org/')
        },
        content: {
            content: product.product_name,
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

    await client
        .api(`/external/connections/${config.connector.id}/items/${product.id}`)
        .header('content-type', 'application/json')
        .put(externalItem);
    
    await addItem(product.id);
}

app.storageQueue("contentQueue", {
    connection: "AzureWebJobsStorage",
    queueName: "queue-content",
    handler: async (message: ContentMessage, context: InvocationContext) => {
        const { action, crawlType, itemAction, itemId } = message;

        switch (action) {
            case 'crawl':
                await crawl(crawlType);
                break;
            case 'item':
                await processItem(itemId, itemAction);
                break;
            default:
                break;
        }
    }
});
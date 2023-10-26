const { TableClient, TableServiceClient } = require("@azure/data-tables");
const { table } = require("console");
const fs = require("fs");
const path = require("path");

(async () => {
    const connectionString = process.argv[2] ? process.argv[2] : "UseDevelopmentStorage=true";
    const reset = process.argv[3] === "--reset" || process.argv[3] === "-r" ? true : false;

    const tableServiceClient = TableServiceClient.fromConnectionString(connectionString);

    let tables = [];
    for await (const table of tableServiceClient.listTables()) {
        tables.push(table.name);
    }
    if (tables.includes('products')) {
        console.log('Table already exists');
        if (reset) {
            const tableClient = TableClient.fromConnectionString(connectionString, 'products');
            for await (const entity of tableClient.listEntities()) {
                await tableClient.deleteEntity(entity.partitionKey, entity.rowKey);
            }
        } else {
            return;
        }
    }

    const jsonString = fs.readFileSync(path.resolve(__dirname, "products.json"), "utf8");
    const { products } = JSON.parse(jsonString);

    await tableServiceClient.createTable('products');
    const tableClient = TableClient.fromConnectionString(connectionString, 'products');

    const rows = products.map(product => {
        let {
            _id: rowKey,
            categories_hierarchy,
            ecoscore_grade,
            image_url,
            ingredients_text_en: ingredients_text,
            last_modified_t,
            nutriscore_grade,
            product_name,
            traces_tags,
            url
        } = product;

        traces_tags = traces_tags.join(', ');
        const categories = categories_hierarchy.join(', ');

        return {
            rowKey,
            categories,
            ecoscore_grade,
            image_url,
            ingredients_text,
            last_modified_t,
            nutriscore_grade,
            product_name,
            traces_tags,
            url
        }
    });

    rows.forEach(async row => {
        console.log(`Adding ${row.product_name}...`);
        await tableClient.createEntity({
            partitionKey: 'products',
            ...row
        });
    });

})();
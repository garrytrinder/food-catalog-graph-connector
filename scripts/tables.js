const { TableClient, TableServiceClient } = require("@azure/data-tables");
const fs = require("fs");
const path = require("path");

(async () => {
    const jsonString = fs.readFileSync(path.resolve(__dirname, "products.json"), "utf8");
    const { products } = JSON.parse(jsonString);

    const tableServiceClient = TableServiceClient.fromConnectionString("UseDevelopmentStorage=true");
    let tables = [];
    for await (const table of tableServiceClient.listTables()) {
        tables.push(table.name);
    }
    if (tables.includes('products')) {
        console.log('Table already exists');
        return;
    }

    await tableServiceClient.createTable('products');
    const tableClient = TableClient.fromConnectionString("UseDevelopmentStorage=true", 'products');

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
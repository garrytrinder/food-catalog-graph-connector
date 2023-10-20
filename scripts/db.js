const { TableClient, TableServiceClient } = require("@azure/data-tables");
const fs = require("fs");
const path = require("path");

(async () => {
    const jsonString = fs.readFileSync(path.resolve(__dirname, "products.json"), "utf8");
    const { products } = JSON.parse(jsonString);

    const tableServiceClient = TableServiceClient.fromConnectionString("UseDevelopmentStorage=true");
    await tableServiceClient.createTable('products');
    const tableClient = TableClient.fromConnectionString("UseDevelopmentStorage=true", 'products');

    const rows = products.map(product => {
        const { _id: rowKey, product_name, last_modified_t } = product;
        return {
            rowKey,
            product_name,
            last_modified_t
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

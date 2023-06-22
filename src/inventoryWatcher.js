const fs = require("fs");
const path = require("path");
const logger = require("./logger");
const read = require("./readExcel");
const shopify = require("./shopifyApi");
const collectionOrder = require("./collectionOrder");
const updateCombined = require("./updateCombinedSKU");

// Testing Location
//const inventoryFilePath = path.join(__dirname, "../input-test/Inventory-count-1.xlsx");
// Live NavInventory Location
const inventoryFilePath = "P:/Stk Cnt & Ord Sheets/NAVInventory.xlsx";

const productsFilePath = path.join(__dirname, "../data/Products.xlsx");
const collectionsFilePath = path.join(__dirname, "../data/Collections.xlsx");

let timeoutId;

function start() {
  fs.watch(inventoryFilePath, async (eventType, filename) => {
    clearTimeout(timeoutId); // Clear the previous timeout
    timeoutId = setTimeout(async () => {
      try {
        logger.info(`New data from ${filename}`);

        const inventoryData = read.readExcel(inventoryFilePath);
        const productMapData = read.readExcel(productsFilePath);

        let noUpdatesCount = 0;
        let updatedCount = 0;
        for (let i = 0; i < inventoryData.length; i++) {
          const quantity = inventoryData[i]["Qty. Available"];
          const sku = String(inventoryData[i].SKU).trim();
          const backorder = false;

          //set backorder = true for this product if that is the case in 'NAVInventory'
          if (inventoryData[i].BACKORDER === 'Backorder') {
            backorder = true;
          }

          // Find correct Shopify Id's from 'Products.xlsx'
          const currentProductIDs = productMapData.find(
            (item) => sku === item["Variant SKU"]
          );

          if (currentProductIDs !== undefined) {
            console.log(`${sku} - ${quantity}`);
            // Update each with inventory
            const result = await shopify.updateInventoryLevel(
              currentProductIDs,
              quantity
            );
            logger.info(
              `Updated Inventory ${
                currentProductIDs["Variant SKU"]
              }  -  ${JSON.stringify(result)}`
            );
            
            // updateProduct updates the compare at price and adds tag 'on-back-order if necessary
            await shopify.updateProduct(currentProductIDs.ID, sku, inventoryData[i].RRP, backorder);

            updatedCount++;
          } else {
            noUpdatesCount++;
          }
        }

        // Update Inventory of Combined SKU's
        try{
          const combinedResult = await updateCombined.updateCombinedSKUs();
          logger.info(`updateCombinedSkus result: ${combinedResult}`);
          updatedCount = updatedCount + combinedResult;
        } catch(err) {
          logger.error(`Error running updateCombinedSkus: - ${err}`);
        }



        logger.info(`${updatedCount} Products have been updated`);
        logger.info(`${noUpdatesCount} Products NOT updated`);
        logger.info(`Completed Inventory Updates`);

        // Update the collections
        const collectionData = read.readExcel(collectionsFilePath);
        for (const collection of collectionData) {
          await collectionOrder.collectionUpdate(
            collection.ID,
            collection.Title
          );
        }

        

        logger.info(`Completed Processing`);
      } catch (err) {
        logger.error(`Error  -  ${err}`);
      }
    }, 1000);
  });
}

module.exports = { start };

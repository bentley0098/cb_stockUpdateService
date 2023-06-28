const path = require("path");
const read = require("./readExcel");
const shopify = require("./shopifyApi");
const logger = require("./logger");

const productsFilePath = path.join(__dirname, "../data/Products.xlsx");
const inventoryFilePath = "P:/Stk Cnt & Ord Sheets/NAVInventory.xlsx";

const inventoryData = read.readExcel(inventoryFilePath);

async function updateCombinedSKUs() {
  try {
    const productMapData = read.readExcel(productsFilePath);
    const combinedSKUs = [];
    let count = 0;
    // Find SKUs with a '+'
    productMapData.forEach((object) => {
      if (object["Variant SKU"] !== undefined) {
        if (object["Variant SKU"].includes("+")) {
          combinedSKUs.push(object);
        }
      }
    });

    for (let i = 0; i < combinedSKUs.length; i++) {
      // Separate each combined SKU
      const separatedSKUs = combinedSKUs[i]["Variant SKU"]
        .split("+")
        .map((sku) => sku.trim());

      // Find the lowest quantity of every SKU, set to 0 if individual sku not found or lowest is less than 0
      let lowestQty = 0;
      let rrp = 0;
      let isBackorder = false;
      separatedSKUs.forEach((sku, index) => {
        const inventoryObj = inventoryData.find((item) => item.SKU === sku);
        if (inventoryObj) {
          if (index === 0) {
            lowestQty = inventoryObj["Qty. Available"];
          } else if (inventoryObj["Qty. Available"] < lowestQty) {
            lowestQty = inventoryObj["Qty. Available"];
          }

          // Flag if any are on 'Backorder' or not, and add together the RRP's
          if (inventoryObj.BACKORDER === "BACKORDER") {
            isBackorder = true;
          }
          rrp = rrp + Math.round(inventoryObj.RRP);

          //console.log(`${index} Inventory Data: ${JSON.stringify(inventoryObj)}`);
          //console.log(`rrp: ${rrp}`);
          //console.log(`isBackorder: ${isBackorder}`);
        } else {
          lowestQty = 0;
        }
      });
      if (lowestQty < 0) {
        lowestQty = 0;
      }
      console.log(
        `${JSON.stringify(combinedSKUs[i]["Variant SKU"])} - ${lowestQty}`
      );
      // Set the combined SKU to that lowest qty
      let result = await shopify.updateInventoryLevel(
        combinedSKUs[i],
        lowestQty
      );

      logger.info(
        `Updated Inventory ${
          combinedSKUs[i]["Variant SKU"]
        }  -  ${JSON.stringify(result)}`
      );

      // Update Backorder tag and RRP on Combined SKU
      await shopify.updateProduct(
        combinedSKUs[i].ID,
        combinedSKUs[i]["Variant SKU"],
        rrp,
        isBackorder
      );

      count++;
    }

    return count;
  } catch (error) {
    console.error(`Error occured in 'updateCombinedSkus': - ${error}`);
    logger.error(`Error occured in 'updateCombinedSkus': - ${error}`);
    return error;
  }
}

module.exports = {
  updateCombinedSKUs,
};

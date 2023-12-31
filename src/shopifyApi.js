require("dotenv").config();
const logger = require("./logger");

const Shopify = require("shopify-api-node");

const shopify = new Shopify({
  shopName: process.env.SHOPIFY_SHOP_NAME,
  accessToken: process.env.SHOPIFY_API_KEY_1,
  autoLimit: true,
});


async function updateInventoryLevel(ids, quantity) {
  try {
    const result = await shopify.inventoryLevel.set({
      location_id: 61292740652,
      inventory_item_id: ids["Variant Inventory Item ID"],
      available: quantity,
    });
    return result;
  } catch (error) {
    logger.error(`Error in shopifyApi - updateInventoryLevel(${ids["Variant SKU"]}):  ${error}`);
    return null;
  }
}


async function makeGraphQlCall(query) {
  try {
    const result = await shopify.graphql(query);
    return result;
  } catch (error) {
    logger.error(`Error in shopifyApi - makeGraphQlCall:  ${error}`);
    throw error;
  }
}

async function makeProductPlacementGraphQlCall(query, variables) {
  try {
    const result = await shopify.graphql(query, variables);
    return result;
  } catch (error) {
    logger.error(
      `Error in shopifyApi - makeProductPlacementGraphQlCall:  ${error}`
    );
    throw error;
  }
}

async function getCollection(id) {
  try {
    let params = { limit: 50 };
    let result = [];

    do {
      const products = await shopify.collection.products(id, params);

      for (var i = 0; i < products.length; i++) {
        result.push(products[i]);
      }
      params = products.nextPageParameters;
    } while (params !== undefined);

    return result;
  } catch (error) {
    logger.error(`Error in shopifyApi - getCollection:  ${error}`);
    throw error;
  }
}

async function updateProduct(productId, sku, rrp, backorder) {
  try {
    console.log(`ID: ${productId}, SKU: ${sku}, RRP: ${rrp}, Back Order: ${backorder}`);
    let roundedRRP = Math.round(rrp).toString();
    shopify.product
      .get(productId)
      .then((product) => {

        // Update the 'on-back-order' tag
        if (backorder === true) {
          // Add the new tag to the existing tags
          let tags = product.tags ? product.tags.split(",") : [];
          tags.push("on-back-order");
          product.tags = tags.join(",");
        } else {
          // Remove the 'on-back-order' tag if it exists
          let tags = product.tags ? product.tags.split(",") : [];
          const index = tags.findIndex((tag) => tag.trim() === "on-back-order");
          if (index !== -1) {
            tags.splice(index, 1);
            product.tags = tags.join(",");
          }
        }



        for (variant of product.variants){
          // If SKU matches then set RRP to NAV's RRP
          if ( variant.sku === sku ) {
            variant.compare_at_price = roundedRRP;
          }
          
        }
        
        // Update the product with the updated tags & RRP
        return shopify.product.update(productId, product);
      })
      .then((updatedProduct) => {
        logger.info(`(shopifyAPI/updateProduct) Updated - ${updatedProduct.title}`);
        console.log("(shopifyAPI/updateProduct) Updated -", updatedProduct.title);
      })
      .catch((err) => {
        logger.error(`Error updating product (shopifyAPI/updateProduct) ${sku}:  ${err}`);
        console.error("Error updating product (shopifyAPI/updateProduct): " + sku + ' : ' + err);
      });
  } catch (error) {
    logger.error(`Error in shopifyAPI - setToBackorder:  ${error}`);
    throw error;
  }
}


module.exports = {
  updateInventoryLevel,
  makeGraphQlCall,
  getCollection,
  makeProductPlacementGraphQlCall,
  updateProduct,
};

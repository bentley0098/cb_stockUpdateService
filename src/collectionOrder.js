const shopify = require("./shopifyApi");
const read = require("./readExcel");
const path = require("path");
const logger = require("./logger");

// Function to move same-brand objects to non-adjacent positions
function moveSameBrandObjects(arr) {
  var result = [];
  var groupedObjects = {};

  // Group objects by brand
  arr.forEach((obj) => {
    if (!groupedObjects[obj.brand]) {
      groupedObjects[obj.brand] = [];
    }
    groupedObjects[obj.brand].push(obj);
  });

  // Determine maximum count of same-brand objects
  var maxCount = 0;
  Object.keys(groupedObjects).forEach((brand) => {
    var count = groupedObjects[brand].length;
    if (count > maxCount) {
      maxCount = count;
    }
  });

  // Iterate through each group and distribute objects to non-adjacent positions
  for (var i = 0; i < maxCount; i++) {
    Object.keys(groupedObjects).forEach((brand) => {
      var group = groupedObjects[brand];
      if (group.length > i) {
        result.push(group[i]);
      }
    });
  }

  return result;
}

const updateCollectionSortOrder = async (collectionId, sortOrder) => {
  const mutation = `
    mutation updateCollectionSortOrder {
      collectionUpdate(input: {
        id: "gid://shopify/Collection/${collectionId}",
        sortOrder: ${sortOrder}
      }) {
        collection {
          id
          title
          sortOrder
          handle
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  const response = await shopify.makeGraphQlCall(mutation);
  return response;
};

const updateProductPosition = async (collectionId, productId, position) => {
  const mutation = `mutation 
      collectionReorderProducts ($id : ID!, $moves: [MoveInput!]!) { 
        collectionReorderProducts(id: $id, moves: $moves) {
          job {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`;

  const variables = {
    id: `gid://shopify/Collection/${collectionId}`,
    moves: {
      id: `gid://shopify/Product/${productId}`,
      newPosition: `${position}`,
    },
  };

  const response = await shopify.makeProductPlacementGraphQlCall(
    mutation,
    variables
  );
  return response;
};

const inventoryFilePath = "P:/Stk Cnt & Ord Sheets/NAVInventory.xlsx";
const productsFilePath = path.join(__dirname, "../data/Products.xlsx");

async function collectionUpdate(collectionId, collectionTitle) {
  try {
    console.log(`Updating ${collectionTitle}`);

    // Read inventory & product map files
    const inventoryData = read.readExcel(inventoryFilePath);
    const productMapData = read.readExcel(productsFilePath);

    //const collID = 448281903403;
    // Test with Toilet Suites - 286182637612
    // Bath Tapware - 280096899116
    //const collID = 280096899116;
    const collID = collectionId;

    // Set collection to 'Best Selling' sort type
    let updatedCollection = await updateCollectionSortOrder(
      collID,
      "BEST_SELLING"
    );

    // Get collection products
    const collectionData = await shopify.getCollection(collID);
    // Sort the products to how we want
    let productArray = [];
    let productsWithQty = [];
    let createdRecentlyProducts = [];
    const recentDate = new Date();
    recentDate.setMonth(recentDate.getMonth() - 2);
    //console.log(recentDate);
    console.log(collectionData.length);
    for (let i = 0; i < collectionData.length; i++) {
      const productId = collectionData[i].id;
      // Find the sku matching productId
      const productData = productMapData.find((obj) => obj.ID == productId);
      // Find the qty of the sku in inventoryData
      if (productData) {
        const product = inventoryData.find(
          (item) => item.SKU == productData["Variant SKU"]
        );
        const qty = product ? product["Qty. Available"] : 0;
        const createdAt = new Date(collectionData[i].created_at);

        if (qty > 0) {
          productsWithQty.push({
            id: productId,
            created_at: collectionData[i].created_at,
            qty,
            brand: collectionData[i].vendor,
          });
        } else if (createdAt > recentDate) {
          createdRecentlyProducts.push({
            id: productId,
            created_at: collectionData[i].created_at,
            qty,
            brand: collectionData[i].vendor,
          });
        } else {
          productArray.push({
            id: productId,
            created_at: collectionData[i].created_at,
            qty,
            brand: collectionData[i].vendor,
          });
        }
      }
    }

    // Sort productWithQty by highest Qty
    productsWithQty.sort((a, b) => b.qty - a.qty);

    // Place products with quantity at beginning of productArray
    productArray.unshift(...productsWithQty);

    // Randomly insert createdRecentlyProducts every 2-4 places into productArray
    let j = 0;
    for (let i = 0; i < createdRecentlyProducts.length; i++) {
      let randomIndex = Math.floor(Math.random() * 3) + 1; // Generate a random index between 1 & 4
      randomIndex += j;
      productArray.splice(randomIndex, 0, createdRecentlyProducts[i]);
      j = randomIndex + 1;
    }

    //Move products of the same brand
    // Move same-brand objects to non-adjacent positions while maintaining order
    var shuffledArray = moveSameBrandObjects(productArray);
    
    console.log(shuffledArray.length);

    // Set collection to 'Manual' sort type
    updatedCollection = await updateCollectionSortOrder(collID, "MANUAL");

    // Update the order of the products
    for (let i = 0; i < shuffledArray.length; i++) {
      await updateProductPosition(collID, shuffledArray[i].id, i);
      // Test without this delay
      // await delay(500);
    }
    logger.info(`Updated ${collectionTitle}`);
  } catch (error) {
    logger.error(`Error in Collection Update: ${error}`);
  }
}

module.exports = {
  collectionUpdate,
};

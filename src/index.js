const logger= require('./logger');
const inventoryWatcher = require('./inventoryWatcher');
const shopifyAPI = require('./shopifyApi');


//logger.info('Starting Info');
//logger.error('Starting Error');

// Start watching the file for updates
logger.info('****************************** Starting Stock Updater ******************************');
inventoryWatcher.start();

// Call the function from shopifyAPI.js that retrieves the orders
//shopifyAPI.updateInventoryLevel( 3 )
//  .then((orders) => {
//    // Process the orders as needed
//    console.log('Updated:', orders);
//  })
//  .catch((error) => {
//    // Handle any errors that occurred
//    console.error('Failed to update:', error);
//  });

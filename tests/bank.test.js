const assert = require('node:assert/strict');
const { isDiscretionary } = require('../src/bank');
function tx({name='',merchant_name='',amount=10,pfc_primary='',pfc_detailed='',pending=0}={}) { return {name,merchant_name,amount,pfc_primary,pfc_detailed,pending}; }
assert.equal(isDiscretionary(tx({merchant_name:'Walmart',amount:84,pfc_primary:'GENERAL_MERCHANDISE'})), false);
assert.equal(isDiscretionary(tx({merchant_name:'Amazon',amount:42})), true);
assert.equal(isDiscretionary(tx({merchant_name:'JBA-ANDREWS MAIN STORE',amount:22})), true);
assert.equal(isDiscretionary(tx({merchant_name:'7-Eleven',amount:12})), true);
assert.equal(isDiscretionary(tx({merchant_name:'7-Eleven',amount:48})), false);
assert.equal(isDiscretionary(tx({merchant_name:'Texas Roadhouse',amount:70,pfc_primary:'FOOD_AND_DRINK'})), true);
assert.equal(isDiscretionary(tx({merchant_name:'Albemarle Movies',amount:38,pfc_primary:'ENTERTAINMENT'})), true);
assert.equal(isDiscretionary(tx({merchant_name:'Salon Example',amount:60,pfc_primary:'GENERAL_SERVICES'})), true);
assert.equal(isDiscretionary(tx({merchant_name:'Amazon',amount:-20})), false);
assert.equal(isDiscretionary(tx({merchant_name:'Amazon',amount:20,pending:1})), false);
console.log('bank classification tests passed');

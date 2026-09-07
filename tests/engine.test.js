const assert=require('node:assert/strict');
const {calculateDecisionPlan}=require('../src/engine');
let p=calculateDecisionPlan({checking:2500.01,reserve:447.95,checkingFloor:1000,reserveTarget:2552.10,civilianPaycheck:2303,operatingHoldback:0});
assert.equal(p.reserveGap,2104.15);assert.equal(p.toReserveNow,1500.01);assert.equal(p.toSavingsNow,0);assert.equal(p.safeToSpendNow,0);assert.equal(p.projected.toReserve,2104.15);assert.equal(p.projected.toSavings,1698.86);
p=calculateDecisionPlan({checking:8000,reserve:2552.10,checkingFloor:1000,reserveTarget:2552.10,civilianPaycheck:2303,operatingHoldback:4862.76});
assert.equal(p.operatingHoldback,4862.76);assert.equal(p.protectedChecking,5862.76);assert.equal(p.toSavingsNow,2137.24);assert.equal(p.action,'SWEEP_SAVINGS');
p=calculateDecisionPlan({checking:8000,reserve:2552.10,checkingFloor:1000,reserveTarget:2552.10,civilianPaycheck:2303,operatingHoldback:0});
assert.equal(p.toSavingsNow,7000);assert.equal(p.action,'SWEEP_SAVINGS');
console.log('engine tests passed');

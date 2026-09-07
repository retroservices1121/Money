function cents(n){return Math.round((Number(n)||0)*100)}function dollars(c){return Math.round(c)/100}
function autoAdjustedHoldback(requested){const raw=Math.max(0,Number(requested)||0);if(!raw)return 0;const ctx=globalThis.__moneyMovesBillContext;if(!ctx?.txs)return raw;try{const I=require('./insights');const r=I.firstBillReconciliation(ctx.txs,{today:ctx.today,target:raw,overrides:ctx.overrides||{}});return Math.max(0,Math.min(raw,Number(r.remaining)||0));}catch{return raw}}
function calculateDecisionPlan(input){
  const checking=cents(input.checking),reserve=cents(input.reserve),floor=cents(input.checkingFloor),target=cents(input.reserveTarget),paycheck=cents(input.civilianPaycheck),holdback=cents(autoAdjustedHoldback(input.operatingHoldback||0));
  const reserveGap=Math.max(0,target-reserve),protectedChecking=floor+holdback,checkingExcess=Math.max(0,checking-protectedChecking);
  const toReserveNow=Math.min(reserveGap,checkingExcess),remainingExcess=Math.max(0,checkingExcess-toReserveNow),toSavingsNow=reserveGap<=checkingExcess?remainingExcess:0,safeToSpendNow=Math.max(0,checking-protectedChecking-reserveGap);
  const projectedAvailable=checkingExcess+paycheck,projectedToReserve=Math.min(reserveGap,projectedAvailable),projectedToSavings=Math.max(0,projectedAvailable-projectedToReserve);
  let action='HOLD',message=holdback>0?`Protect ${dollars(holdback).toFixed(2)} for first-of-month bills not yet matched to posted transactions.`:'Keep checking above the floor and wait for the next income or bill event.';
  if(toReserveNow>0){action='FUND_RESERVE';message=`After protecting the checking floor${holdback>0?' and unmatched first-of-month bills':''}, move ${dollars(toReserveNow).toFixed(2)} to the 15th bills reserve.`}
  else if(toSavingsNow>0){action='SWEEP_SAVINGS';message=`Reserve and required checking holdbacks are protected. Move ${dollars(toSavingsNow).toFixed(2)} of true excess cash to long-term savings.`}
  else if(holdback===0&&reserveGap===0){action='ON_TRACK';message='15th bills reserve is fully funded and checking is protected.'}
  return{action,message,reserveGap:dollars(reserveGap),operatingHoldback:dollars(holdback),protectedChecking:dollars(protectedChecking),checkingExcess:dollars(checkingExcess),toReserveNow:dollars(toReserveNow),toSavingsNow:dollars(toSavingsNow),safeToSpendNow:dollars(safeToSpendNow),checkingFloor:dollars(floor),reserveTarget:dollars(target),nextPaycheck:dollars(paycheck),projected:{toReserve:dollars(projectedToReserve),toSavings:dollars(projectedToSavings),checkingFloor:dollars(floor),operatingHoldback:dollars(holdback)}};
}
function calculatePaydayPlan(input){return calculateDecisionPlan(input)}module.exports={calculateDecisionPlan,calculatePaydayPlan};

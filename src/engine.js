function cents(n){ return Math.round((Number(n)||0)*100); }
function dollars(c){ return Math.round(c)/100; }

function calculateDecisionPlan(input){
  const checking=cents(input.checking);
  const reserve=cents(input.reserve);
  const floor=cents(input.checkingFloor);
  const target=cents(input.reserveTarget);
  const paycheck=cents(input.civilianPaycheck);

  const reserveGap=Math.max(0,target-reserve);
  const checkingExcess=Math.max(0,checking-floor);

  // Live recommendation: only use money that is actually in checking now.
  const toReserveNow=Math.min(reserveGap,checkingExcess);
  const remainingExcess=Math.max(0,checkingExcess-toReserveNow);
  const toSavingsNow=reserveGap<=checkingExcess?remainingExcess:0;
  const safeToSpendNow=Math.max(0,checking-floor-reserveGap);

  // Projection: what the plan would become after the next normal civilian paycheck posts.
  const projectedAvailable=checkingExcess+paycheck;
  const projectedToReserve=Math.min(reserveGap,projectedAvailable);
  const projectedToSavings=Math.max(0,projectedAvailable-projectedToReserve);

  let action='HOLD';
  let message='Keep checking above the floor and wait for the next income or bill event.';
  if(toReserveNow>0){action='FUND_RESERVE';message=`Move ${dollars(toReserveNow).toFixed(2)} to the 15th bills reserve now.`;}
  else if(toSavingsNow>0){action='SWEEP_SAVINGS';message=`Reserve is funded. Move ${dollars(toSavingsNow).toFixed(2)} of true excess cash to long-term savings.`;}
  else if(reserveGap===0){action='ON_TRACK';message='15th bills reserve is fully funded and checking is protected.';}

  return {
    action,
    message,
    reserveGap:dollars(reserveGap),
    checkingExcess:dollars(checkingExcess),
    toReserveNow:dollars(toReserveNow),
    toSavingsNow:dollars(toSavingsNow),
    safeToSpendNow:dollars(safeToSpendNow),
    checkingFloor:dollars(floor),
    reserveTarget:dollars(target),
    nextPaycheck:dollars(paycheck),
    projected:{
      toReserve:dollars(projectedToReserve),
      toSavings:dollars(projectedToSavings),
      checkingFloor:dollars(floor)
    }
  };
}

// Kept for compatibility with older callers, but now returns the safer live decision structure.
function calculatePaydayPlan(input){ return calculateDecisionPlan(input); }

module.exports={calculateDecisionPlan,calculatePaydayPlan};

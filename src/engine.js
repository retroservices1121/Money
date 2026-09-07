function cents(n){ return Math.round((Number(n)||0)*100); }
function dollars(c){ return Math.round(c)/100; }
function calculatePaydayPlan(input){
  const checking=cents(input.checking), reserve=cents(input.reserve), floor=cents(input.checkingFloor), target=cents(input.reserveTarget), paycheck=cents(input.civilianPaycheck);
  const reserveGap=Math.max(0,target-reserve);
  const checkingExcess=Math.max(0,checking-floor);
  const available=checkingExcess+paycheck;
  const toReserve=Math.min(reserveGap,available);
  const toSavings=Math.max(0,available-toReserve);
  return {reserveGap:dollars(reserveGap),checkingExcess:dollars(checkingExcess),paycheck:dollars(paycheck),toReserve:dollars(toReserve),toSavings:dollars(toSavings),checkingFloor:dollars(floor),reserveTarget:dollars(target)};
}
module.exports={calculatePaydayPlan};

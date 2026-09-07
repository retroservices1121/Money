const assert=require('node:assert/strict');const I=require('../src/insights');
const tx=[
{transaction_id:'1',merchant_name:'Amazon',amount:50,date:'2026-09-07',pending:0,pfc_primary:'GENERAL_MERCHANDISE'},
{transaction_id:'2',merchant_name:'Walmart',amount:100,date:'2026-09-07',pending:0,pfc_primary:'GENERAL_MERCHANDISE'},
{transaction_id:'3',merchant_name:'7-Eleven',amount:20,date:'2026-09-06',pending:0,pfc_primary:'TRANSPORTATION'},
{transaction_id:'4',merchant_name:'7-Eleven',amount:60,date:'2026-09-06',pending:0,pfc_primary:'TRANSPORTATION'},
{transaction_id:'5',merchant_name:'Payroll',amount:-2303,date:'2026-09-07',pending:0,pfc_primary:'INCOME'}
];
assert.equal(I.classify(tx[0]),'discretionary');assert.equal(I.classify(tx[1]),'groceries');assert.equal(I.classify(tx[2]),'discretionary');assert.equal(I.classify(tx[3]),'gas');
const s=I.spendSummary(tx,{today:'2026-09-07',cap:850});assert.equal(s.monthToDate.discretionary,70);assert.equal(s.today.total,150);
const ev=I.detectIncomeEvents(tx,{today:'2026-09-07',paycheck:2303,guaranteedIncome:7053});assert.equal(ev.payday.detected,true);
const rw=I.billRunway({today:'2026-09-07',reserve:447.95,reserveTarget:2552.10,checking:2500,checkingFloor:1000,firstBills:4862.76,fifteenthBills:2552.10});assert.equal(rw.gap,2104.15);
console.log('insights tests passed');

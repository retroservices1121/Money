// Fictional household data for product demos. Never reads the production database.
const TODAY=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function date(dayOffset=0){const d=new Date(`${TODAY()}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+dayOffset);return d.toISOString().slice(0,10)}
const tx=(id,merchant,amount,offset,category,detailed,pending=false,accountMask='4421')=>({id,accountId:`demo-${accountMask}`,accountName:accountMask==='4421'?'Everyday Checking':'Savings',accountMask,merchant,name:merchant,amount,date:date(offset),pending,plaidCategory:category,plaidDetailed:detailed,logoUrl:null});
function transactions(){return[
 tx('d01','Acme Payroll',-2650,-2,'INCOME','INCOME_WAGES'),
 tx('d02','McDonald’s',14.82,-1,'FOOD_AND_DRINK','FOOD_AND_DRINK_FAST_FOOD'),
 tx('d03','Walmart',126.44,-1,'GENERAL_MERCHANDISE','GENERAL_MERCHANDISE_SUPERSTORES'),
 tx('d04','Starbucks',7.65,0,'FOOD_AND_DRINK','FOOD_AND_DRINK_COFFEE',true),
 tx('d05','Shell',48.20,-2,'TRANSPORTATION','TRANSPORTATION_GAS'),
 tx('d06','Verizon',142.18,-4,'RENT_AND_UTILITIES','RENT_AND_UTILITIES_TELEPHONE'),
 tx('d07','Netflix',22.99,-6,'ENTERTAINMENT','ENTERTAINMENT_TV_AND_MOVIES'),
 tx('d08','Duke Energy',184.36,-8,'RENT_AND_UTILITIES','RENT_AND_UTILITIES_GAS_AND_ELECTRICITY'),
 tx('d09','Target',73.28,-3,'GENERAL_MERCHANDISE','GENERAL_MERCHANDISE_DEPARTMENT_STORES'),
 tx('d10','Chick-fil-A',23.47,-5,'FOOD_AND_DRINK','FOOD_AND_DRINK_FAST_FOOD'),
 tx('d11','Amazon',61.95,-7,'GENERAL_MERCHANDISE','GENERAL_MERCHANDISE_ONLINE_MARKETPLACES'),
 tx('d12','State Farm',168.40,-10,'GENERAL_SERVICES','GENERAL_SERVICES_INSURANCE'),
 tx('d13','City Water',68.12,-11,'RENT_AND_UTILITIES','RENT_AND_UTILITIES_OTHER_UTILITIES'),
 tx('d14','Mortgage Payment',-0+1875,-12,'LOAN_PAYMENTS','LOAN_PAYMENTS_MORTGAGE_PAYMENT'),
 tx('d15','Kroger',94.72,-9,'FOOD_AND_DRINK','FOOD_AND_DRINK_GROCERIES'),
 tx('d16','DoorDash',36.81,-13,'FOOD_AND_DRINK','FOOD_AND_DRINK_RESTAURANTS'),
 tx('d17','Spotify',11.99,-15,'ENTERTAINMENT','ENTERTAINMENT_MUSIC_AND_AUDIO'),
 tx('d18','Acme Payroll',-2650,-16,'INCOME','INCOME_WAGES'),
 tx('d19','Transfer to Savings',500,-2,'TRANSFER_OUT','TRANSFER_OUT_SAVINGS',false,'8840'),
 tx('d20','Savings Deposit',-500,-2,'TRANSFER_IN','TRANSFER_IN_SAVINGS',false,'1198')
].sort((a,b)=>b.date.localeCompare(a.date));}
function state(){const today=TODAY(),month=today.slice(0,7),day=Number(today.slice(-2));const discSpent=144.70,cap=900,remaining=755.30,daily=Math.round(remaining/Math.max(1,30-day+1)*100)/100;return{
 state:{checking:6842.17,reserve:2180,savings:18450,discretionary_spent:discSpent,updated_at:new Date().toISOString()},
 rules:{checking_floor:1200,reserve_target:2500,discretionary_cap:cap,budget_eligible_va:0,civilian_paycheck:2650},
 budget:{spendableIncome:8750,monthlyExpenses:5420,operatingSurplus:3330,savingsBuffer:500,totalSavingsTarget:3830,guaranteedIncome:3450,firstBills:3120,fifteenthBills:2300,anchorPayday:date(-2)},
 plan:{toReserveNow:320,toSavingsNow:0,nextPaycheck:2650,safeToSpendNow:412.17,message:'Move $320 to Bills Reserve. Your upcoming bills stay covered.',projected:{toReserve:320,toSavings:2330}},
 spend:{today:{date:today,total:0,discretionary:0},yesterday:{date:date(-1),total:141.26,discretionary:14.82},monthToDate:{month,total:2961.37,discretionary:discSpent,transactionCount:14},discretionary:{cap,remaining,monthProgress:Math.round(day/30*100),spendProgress:Math.round(discSpent/cap*100),paceDelta:-10,dailyAllowance:daily,status:'good'},topTransactions:[{id:'d14',merchant:'Mortgage Payment',amount:1875,date:date(-12),category:'bills',plaidCategory:'LOAN_PAYMENTS'},{id:'d08',merchant:'Duke Energy',amount:184.36,date:date(-8),category:'utilities',plaidCategory:'RENT_AND_UTILITIES'},{id:'d06',merchant:'Verizon',amount:142.18,date:date(-4),category:'utilities',plaidCategory:'RENT_AND_UTILITIES'},{id:'d03',merchant:'Walmart',amount:126.44,date:date(-1),category:'groceries',plaidCategory:'GENERAL_MERCHANDISE'}]},
 brief:'Bills are covered. You have $755.30 left for flexible spending and no urgent action is needed.',
 runway:{checkpoint:'15th bills',nextDue:`${month}-15`,required:2500,funded:2180,gap:320,checkingFloor:1200,floorGap:0,status:'needs_funding',firstBillsConfirmed:true},
 incomeEvents:{payday:{detected:true,date:date(-2),amount:2650,merchant:'Acme Payroll'},firstOfMonth:{detected:false,total:0}},
 subscriptions:[{merchant:'Netflix',amount:22.99,frequencyDays:30,nextExpected:date(24),priceChange:0},{merchant:'Spotify',amount:11.99,frequencyDays:30,nextExpected:date(15),priceChange:0}],alerts:[],
 weekly:{from:date(-6),to:today,spent:436.04,discretionary:94.22,income:2650,transactions:8},
 scorecard:{target:3830,actual:500,gap:3330,operatingSurplus:3330,savingsBuffer:500},
 forecast:{startingLiquid:9022.17,through:date(30),events:[{date:date(12),type:'income',label:'Paycheck',amount:2650,projectedLiquid:11672.17},{date:date(15),type:'bill',label:'Upcoming bills',amount:-2300,projectedLiquid:9372.17}]},
 routing:[],savingsRoutes:[{name:'Emergency savings',percent:70,sort_order:1},{name:'Vacation',percent:30,sort_order:2}],activity:[{id:1,actor:'Demo Household',type:'bank_sync',detail:'Bank data updated automatically',created_at:new Date().toISOString()}],merchantRules:[],
 bank:{configured:true,environment:'sandbox',items:[{item_id:'demo-item',institution_name:'Plaid Sandbox Bank',status:'active',sync_error:null,last_synced_at:new Date().toISOString()}],accounts:[{account_id:'demo-4421',name:'Everyday Checking',mask:'4421',role:'checking',current_balance:6842.17},{account_id:'demo-8840',name:'Bills Reserve',mask:'8840',role:'reserve',current_balance:2180},{account_id:'demo-1198',name:'Savings',mask:'1198',role:'savings',current_balance:18450}]},security:{configured:true},push:{configured:false},demo:true};}
function bills(){return{month:TODAY().slice(0,7),today:TODAY(),bills:[{id:1,name:'Mortgage',merchantMatch:'',amount:1875,dueDay:1,bucket:'first',status:'paid_auto',paid:true,matchedTransaction:{id:'d14',merchant:'Mortgage Payment',amount:1875,date:date(-12)}},{id:2,name:'Electric',merchantMatch:'',amount:184.36,dueDay:8,bucket:'first',status:'paid_auto',paid:true,matchedTransaction:{id:'d08',merchant:'Duke Energy',amount:184.36,date:date(-8)}},{id:3,name:'Phone',merchantMatch:'',amount:142.18,dueDay:12,bucket:'fifteenth',status:'paid_auto',paid:true,matchedTransaction:{id:'d06',merchant:'Verizon',amount:142.18,date:date(-4)}},{id:4,name:'Car insurance',merchantMatch:'',amount:168.40,dueDay:18,bucket:'fifteenth',status:'upcoming',paid:false,matchedTransaction:null}],summary:{first:{planned:2059.36,paid:2059.36,remaining:0},fifteenth:{planned:310.58,paid:142.18,remaining:168.40}}};}
module.exports={state,transactions,bills};

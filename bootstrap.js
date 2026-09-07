// Money Moves production bootstrap.
// Push notifications are optional and must never prevent the core app from starting.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const http=require('node:http');
const {DatabaseSync}=require('node:sqlite');

function disablePush(reason){
  console.warn(`[Money Moves] Push notifications disabled: ${reason}`);
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  delete process.env.VAPID_SUBJECT;
}

const pub=process.env.VAPID_PUBLIC_KEY;
const priv=process.env.VAPID_PRIVATE_KEY;
const subject=process.env.VAPID_SUBJECT;
if(pub||priv||subject){
  if(!(pub&&priv&&subject)) disablePush('VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT must all be configured together.');
  else{
    try{require('web-push').setVapidDetails(subject,pub,priv)}
    catch(err){disablePush(err?.message||'invalid VAPID configuration')}
  }
}

const H='household_beta';
const ACCESS_KEY=process.env.MONEY_MOVES_ACCESS_KEY||'';
const SESSION_SECRET=process.env.SESSION_SECRET||process.env.BANK_TOKEN_ENCRYPTION_KEY||'money-moves-dev-session';
const DB_PATH=process.env.DB_PATH||path.join(__dirname,'data','money-moves.db');
function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),decodeURIComponent(x.slice(i+1))]}));}
function sign(v){return crypto.createHmac('sha256',SESSION_SECRET).update(v).digest('base64url')}
function validSession(req){if(!ACCESS_KEY)return true;const token=cookies(req).mm_session;if(!token)return false;const [exp,sig]=token.split('.');if(!exp||!sig||Number(exp)<Date.now())return false;const expected=sign(exp);try{return crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))}catch{return false}}
function sendJson(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
function txLogo(raw){try{const j=JSON.parse(raw||'{}');return j.logo_url||j.counterparties?.find(x=>x.logo_url)?.logo_url||null}catch{return null}}
function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
function localDate(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`}
function openDb(readOnly=false){if(!fs.existsSync(DB_PATH)&&readOnly)return null;const db=new DatabaseSync(DB_PATH,{readOnly});if(!readOnly)db.exec(`CREATE TABLE IF NOT EXISTS planned_bills(id INTEGER PRIMARY KEY AUTOINCREMENT,household_id TEXT NOT NULL,name TEXT NOT NULL,merchant_match TEXT,amount REAL NOT NULL,due_day INTEGER NOT NULL,bucket TEXT NOT NULL DEFAULT 'first',active INTEGER NOT NULL DEFAULT 1,created_at TEXT,updated_at TEXT);CREATE TABLE IF NOT EXISTS bill_overrides(bill_id INTEGER NOT NULL,month TEXT NOT NULL,paid INTEGER NOT NULL,actor TEXT,updated_at TEXT,PRIMARY KEY(bill_id,month));CREATE INDEX IF NOT EXISTS idx_planned_bills_household ON planned_bills(household_id,active);`);return db}
function initBillTables(){try{const db=openDb(false);db?.close()}catch(err){console.warn('[Money Moves] Bill planner tables:',err.message)}}
initBillTables();
function readTransactions(url){
  const db=openDb(true);if(!db)return [];
  try{
    const limit=Math.max(1,Math.min(250,Number(url.searchParams.get('limit')||120)));
    const q=String(url.searchParams.get('q')||'').trim().toLowerCase();
    const rows=db.prepare(`SELECT bt.transaction_id,bt.account_id,bt.name,bt.merchant_name,bt.amount,bt.date,bt.pending,bt.pfc_primary,bt.pfc_detailed,bt.raw_json,ba.name AS account_name,ba.mask AS account_mask FROM bank_transactions bt JOIN bank_accounts ba ON ba.account_id=bt.account_id WHERE ba.household_id=? ORDER BY bt.date DESC,bt.updated_at DESC LIMIT ?`).all(H,limit);
    return rows.map(r=>({id:r.transaction_id,accountId:r.account_id,accountName:r.account_name,accountMask:r.account_mask,merchant:r.merchant_name||r.name||'Transaction',name:r.name||'',amount:Number(r.amount||0),date:r.date,pending:!!r.pending,plaidCategory:r.pfc_primary||'OTHER',plaidDetailed:r.pfc_detailed||'',logoUrl:txLogo(r.raw_json)})).filter(x=>!q||`${x.merchant} ${x.name} ${x.plaidCategory} ${x.plaidDetailed}`.toLowerCase().includes(q));
  }finally{db.close()}
}
function reconcileBills(){
  const db=openDb(true);if(!db)return{month:localDate().slice(0,7),bills:[],summary:{first:{planned:0,paid:0,remaining:0},fifteenth:{planned:0,paid:0,remaining:0}}};
  try{
    const today=localDate(),month=today.slice(0,7),todayDay=Number(today.slice(-2));
    const bills=db.prepare('SELECT id,name,merchant_match,amount,due_day,bucket,active FROM planned_bills WHERE household_id=? AND active=1 ORDER BY due_day,id').all(H);
    const overrides=new Map(db.prepare('SELECT bill_id,paid,actor,updated_at FROM bill_overrides WHERE month=?').all(month).map(x=>[Number(x.bill_id),x]));
    const txs=db.prepare(`SELECT transaction_id,name,merchant_name,amount,date,pending FROM bank_transactions bt JOIN bank_accounts ba ON ba.account_id=bt.account_id WHERE ba.household_id=? AND bt.date LIKE ? AND bt.pending=0 AND bt.amount>0 ORDER BY bt.date`).all(H,`${month}-%`);
    const used=new Set(),out=[];
    for(const b of bills){
      const ov=overrides.get(Number(b.id));let match=null;
      if(!ov?.paid){
        const phrase=norm(b.merchant_match||b.name),tokens=phrase.split(' ').filter(x=>x.length>=3),due=Number(b.due_day||1),expected=Number(b.amount||0);
        let best=null,bestScore=-1;
        for(const t of txs){if(used.has(t.transaction_id))continue;const text=norm(`${t.merchant_name||''} ${t.name||''}`),day=Number(String(t.date).slice(-2)),dist=Math.abs(day-due);if(day<Math.max(1,due-7)||day>Math.min(31,due+10))continue;const phraseHit=phrase&&text.includes(phrase),tokenHits=tokens.filter(k=>text.includes(k)).length;if(!phraseHit&&(!tokens.length||tokenHits<Math.max(1,Math.ceil(tokens.length*.7))))continue;const actual=Number(t.amount||0),diff=Math.abs(actual-expected),tol=Math.max(10,expected*.35);if(expected>0&&diff>tol&&!phraseHit)continue;let score=(phraseHit?70:0)+(tokenHits*12)+Math.max(0,20-dist*2)+(expected>0?Math.max(0,20-diff/Math.max(1,expected)*40):0);if(score>bestScore){best=t;bestScore=score}}
        if(best){match=best;used.add(best.transaction_id)}
      }
      let status='upcoming';if(ov?.paid)status='paid_manual';else if(match)status='paid_auto';else if(todayDay>Number(b.due_day||1)+2)status='overdue';else if(todayDay>=Number(b.due_day||1)-3)status='due_soon';
      out.push({id:Number(b.id),name:b.name,merchantMatch:b.merchant_match||'',amount:Number(b.amount||0),dueDay:Number(b.due_day||1),bucket:b.bucket==='fifteenth'?'fifteenth':'first',status,paid:status.startsWith('paid_'),matchedTransaction:match?{id:match.transaction_id,merchant:match.merchant_name||match.name||'Transaction',amount:Number(match.amount||0),date:match.date}:null,manualOverride:ov?{paid:!!ov.paid,actor:ov.actor,updatedAt:ov.updated_at}:null});
    }
    const summary={first:{planned:0,paid:0,remaining:0},fifteenth:{planned:0,paid:0,remaining:0}};
    for(const b of out){const s=summary[b.bucket];s.planned+=b.amount;if(b.paid)s.paid+=b.amount;else s.remaining+=b.amount}
    for(const s of Object.values(summary))for(const k of Object.keys(s))s[k]=Math.round(s[k]*100)/100;
    return{month,today,bills:out,summary};
  }finally{db.close()}
}
function firstBillsManuallyComplete(){try{const db=openDb(true);if(!db)return false;const month=localDate().slice(0,7),hit=db.prepare('SELECT completed_at FROM checkpoints WHERE month=? AND checkpoint=?').get(month,'first_bills');db.close();return!!hit}catch{return false}}
function plannerFunding(){const r=reconcileBills(),hasFirst=r.bills.some(x=>x.bucket==='first'),hasFifteenth=r.bills.some(x=>x.bucket==='fifteenth');return{...r,firstHoldback:firstBillsManuallyComplete()?0:(hasFirst?r.summary.first.remaining:null),reserveTarget:hasFifteenth?r.summary.fifteenth.planned:null}}

// Patch the pure decision engine input before server.js captures the export.
const engine=require('./src/engine');
const baseDecision=engine.calculateDecisionPlan;
engine.calculateDecisionPlan=function(input){try{const f=plannerFunding();return baseDecision({...input,operatingHoldback:f.firstHoldback===null?input.operatingHoldback:f.firstHoldback,reserveTarget:f.reserveTarget===null?input.reserveTarget:f.reserveTarget})}catch(err){console.warn('[Money Moves] Planned bill funding fallback:',err.message);return baseDecision(input)}};
engine.calculatePaydayPlan=engine.calculateDecisionPlan;

function parseBillId(pathname){const m=pathname.match(/^\/api\/bills\/(\d+)(?:\/(manual))?$/);return m?{id:Number(m[1]),manual:!!m[2]}:null}
async function readBody(req){return await new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>1e6)req.destroy()});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}});req.on('error',reject)})}
function validateBill(b){const name=String(b.name||'').trim(),amount=Number(b.amount),dueDay=Number(b.dueDay),bucket=b.bucket==='fifteenth'?'fifteenth':'first';if(!name)return{error:'Bill name is required'};if(!Number.isFinite(amount)||amount<0)return{error:'Expected amount must be 0 or greater'};if(!Number.isInteger(dueDay)||dueDay<1||dueDay>31)return{error:'Due day must be 1 through 31'};return{name:name.slice(0,100),merchantMatch:String(b.merchantMatch||'').trim().slice(0,120),amount:Math.round(amount*100)/100,dueDay,bucket}}
function writeBill(method,id,body){const db=openDb(false);try{const v=validateBill(body);if(v.error)return{error:v.error};const t=new Date().toISOString();if(method==='POST'){db.prepare('INSERT INTO planned_bills(household_id,name,merchant_match,amount,due_day,bucket,active,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?)').run(H,v.name,v.merchantMatch,v.amount,v.dueDay,v.bucket,t,t)}else{const r=db.prepare('UPDATE planned_bills SET name=?,merchant_match=?,amount=?,due_day=?,bucket=?,updated_at=? WHERE id=? AND household_id=?').run(v.name,v.merchantMatch,v.amount,v.dueDay,v.bucket,t,id,H);if(!r.changes)return{error:'Bill not found',status:404}}return{ok:true}}finally{db.close()}}
function deleteBill(id){const db=openDb(false);try{db.prepare('DELETE FROM bill_overrides WHERE bill_id=?').run(id);const r=db.prepare('DELETE FROM planned_bills WHERE id=? AND household_id=?').run(id,H);return r.changes?{ok:true}:{error:'Bill not found',status:404}}finally{db.close()}}
function manualBill(id,body){const db=openDb(false);try{const exists=db.prepare('SELECT id FROM planned_bills WHERE id=? AND household_id=?').get(id,H);if(!exists)return{error:'Bill not found',status:404};const month=localDate().slice(0,7);if(body.paid===false)db.prepare('DELETE FROM bill_overrides WHERE bill_id=? AND month=?').run(id,month);else db.prepare(`INSERT INTO bill_overrides(bill_id,month,paid,actor,updated_at) VALUES(?,?,1,?,?) ON CONFLICT(bill_id,month) DO UPDATE SET paid=1,actor=excluded.actor,updated_at=excluded.updated_at`).run(id,month,String(body.actor||'Household').slice(0,60),new Date().toISOString());return{ok:true}}finally{db.close()}}

const originalCreateServer=http.createServer;
http.createServer=function(listener){
  return originalCreateServer.call(http,async(req,res)=>{
    try{
      const u=new URL(req.url,'http://localhost');
      if(req.method==='GET'&&u.pathname==='/bills-ui.js'){
        const p=path.join(__dirname,'bills-ui.js');res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-cache'});return fs.createReadStream(p).pipe(res);
      }
      if(req.method==='GET'&&u.pathname==='/api/transactions'){
        if(!validSession(req))return sendJson(res,401,{error:'Household access key required'});
        return sendJson(res,200,{transactions:readTransactions(u)});
      }
      if(u.pathname==='/api/bills'||u.pathname.startsWith('/api/bills/')){
        if(!validSession(req))return sendJson(res,401,{error:'Household access key required'});
        if(req.method==='GET'&&u.pathname==='/api/bills')return sendJson(res,200,reconcileBills());
        if(req.method==='POST'&&u.pathname==='/api/bills'){const b=await readBody(req),r=writeBill('POST',null,b);if(r.error)return sendJson(res,r.status||400,{error:r.error});return sendJson(res,201,reconcileBills())}
        const x=parseBillId(u.pathname);if(x&&req.method==='PATCH'&&!x.manual){const b=await readBody(req),r=writeBill('PATCH',x.id,b);if(r.error)return sendJson(res,r.status||400,{error:r.error});return sendJson(res,200,reconcileBills())}
        if(x&&req.method==='DELETE'&&!x.manual){const r=deleteBill(x.id);if(r.error)return sendJson(res,r.status||400,{error:r.error});return sendJson(res,200,reconcileBills())}
        if(x&&req.method==='POST'&&x.manual){const b=await readBody(req),r=manualBill(x.id,b);if(r.error)return sendJson(res,r.status||400,{error:r.error});return sendJson(res,200,reconcileBills())}
      }
    }catch(err){if(!res.headersSent)return sendJson(res,500,{error:err.message||'Request failed'});}
    return listener(req,res);
  });
};

require('./server');

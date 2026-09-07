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

// v0.7 mobile activity API. This wraps the existing server without changing the Plaid core.
// It reads the same SQLite ledger and uses the same signed beta session cookie.
const ACCESS_KEY=process.env.MONEY_MOVES_ACCESS_KEY||'';
const SESSION_SECRET=process.env.SESSION_SECRET||process.env.BANK_TOKEN_ENCRYPTION_KEY||'money-moves-dev-session';
const DB_PATH=process.env.DB_PATH||path.join(__dirname,'data','money-moves.db');
function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),decodeURIComponent(x.slice(i+1))]}));}
function sign(v){return crypto.createHmac('sha256',SESSION_SECRET).update(v).digest('base64url')}
function validSession(req){if(!ACCESS_KEY)return true;const token=cookies(req).mm_session;if(!token)return false;const [exp,sig]=token.split('.');if(!exp||!sig||Number(exp)<Date.now())return false;const expected=sign(exp);try{return crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))}catch{return false}}
function sendJson(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
function txLogo(raw){try{const j=JSON.parse(raw||'{}');return j.logo_url||j.counterparties?.find(x=>x.logo_url)?.logo_url||null}catch{return null}}
function readTransactions(url){
  if(!fs.existsSync(DB_PATH))return [];
  const db=new DatabaseSync(DB_PATH,{readOnly:true});
  try{
    const limit=Math.max(1,Math.min(250,Number(url.searchParams.get('limit')||120)));
    const q=String(url.searchParams.get('q')||'').trim().toLowerCase();
    const rows=db.prepare(`SELECT bt.transaction_id,bt.account_id,bt.name,bt.merchant_name,bt.amount,bt.date,bt.pending,bt.pfc_primary,bt.pfc_detailed,bt.raw_json,ba.name AS account_name,ba.mask AS account_mask FROM bank_transactions bt JOIN bank_accounts ba ON ba.account_id=bt.account_id WHERE ba.household_id=? ORDER BY bt.date DESC,bt.updated_at DESC LIMIT ?`).all('household_beta',limit);
    return rows.map(r=>({id:r.transaction_id,accountId:r.account_id,accountName:r.account_name,accountMask:r.account_mask,merchant:r.merchant_name||r.name||'Transaction',name:r.name||'',amount:Number(r.amount||0),date:r.date,pending:!!r.pending,plaidCategory:r.pfc_primary||'OTHER',plaidDetailed:r.pfc_detailed||'',logoUrl:txLogo(r.raw_json)})).filter(x=>!q||`${x.merchant} ${x.name} ${x.plaidCategory} ${x.plaidDetailed}`.toLowerCase().includes(q));
  }finally{db.close()}
}
const originalCreateServer=http.createServer;
http.createServer=function(listener){
  return originalCreateServer.call(http,async(req,res)=>{
    try{
      const u=new URL(req.url,'http://localhost');
      if(req.method==='GET'&&u.pathname==='/api/transactions'){
        if(!validSession(req))return sendJson(res,401,{error:'Household access key required'});
        return sendJson(res,200,{transactions:readTransactions(u)});
      }
    }catch(err){if(!res.headersSent)return sendJson(res,500,{error:'Could not load transaction history'});}
    return listener(req,res);
  });
};

require('./server');

// Demo environment sits in front of production bootstrap. It never opens the live DB.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const demo=require('./demo-data');
const realCreateServer=http.createServer;
function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),decodeURIComponent(x.slice(i+1))]}));}
function isDemo(req){return cookies(req).mm_demo==='1'}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Money-Moves-Mode':'demo'});res.end(JSON.stringify(data))}
function redirect(res,to,cookie){res.writeHead(302,{'Location':to,'Set-Cookie':cookie,'Cache-Control':'no-store'});res.end()}
http.createServer=function(listener){return realCreateServer.call(http,async(req,res)=>{try{const u=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&u.pathname==='/demo')return redirect(res,'/','mm_demo=1; Path=/; SameSite=Lax; Max-Age=86400');
  if(req.method==='GET'&&u.pathname==='/live')return redirect(res,'/','mm_demo=; Path=/; SameSite=Lax; Max-Age=0');
  if(req.method==='GET'&&u.pathname==='/app.js'){
    const parts=['app.js','bills-ui.js','demo-ui.js'].map(f=>fs.readFileSync(path.join(__dirname,f),'utf8'));
    res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-cache'});return res.end(parts.join('\n;'));
  }
  if(isDemo(req)){
    if(req.method==='GET'&&u.pathname==='/api/auth-status')return json(res,200,{required:false,authenticated:true,demo:true});
    if(req.method==='GET'&&u.pathname==='/api/state')return json(res,200,demo.state());
    if(req.method==='GET'&&u.pathname==='/api/transactions'){let rows=demo.transactions();const limit=Math.max(1,Math.min(250,Number(u.searchParams.get('limit')||180))),q=String(u.searchParams.get('q')||'').toLowerCase();if(q)rows=rows.filter(x=>`${x.merchant} ${x.name} ${x.plaidCategory} ${x.plaidDetailed}`.toLowerCase().includes(q));return json(res,200,{transactions:rows.slice(0,limit),demo:true});}
    if(req.method==='GET'&&u.pathname==='/api/bills')return json(res,200,demo.bills());
    if(req.method==='POST'&&u.pathname==='/api/bank/sync')return json(res,200,{ok:true,demo:true,state:demo.state(),message:'Demo bank data refreshed'});
    if(req.method==='GET'&&u.pathname==='/api/push/public-key')return json(res,200,{configured:false,publicKey:null,demo:true});
    if(u.pathname.startsWith('/api/')&&req.method!=='GET')return json(res,200,{ok:true,demo:true,message:'Demo mode: no production data was changed'});
  }
}catch(err){console.error('[Money Moves demo]',err)}return listener(req,res)});};
require('./bootstrap');

// Safe production bootstrap for Money Moves.
// Invalid VAPID credentials must never prevent the core app from starting.
function base64urlDecodedLength(value){
  try{
    const normalized=String(value||'').replace(/-/g,'+').replace(/_/g,'/');
    const padded=normalized+'='.repeat((4-normalized.length%4)%4);
    return Buffer.from(padded,'base64').length;
  }catch{return 0;}
}

const publicKey=process.env.VAPID_PUBLIC_KEY;
const privateKey=process.env.VAPID_PRIVATE_KEY;
const subject=process.env.VAPID_SUBJECT;
const vapidComplete=!!(publicKey&&privateKey&&subject);
const vapidPublicKeyValid=!publicKey||base64urlDecodedLength(publicKey)===65;

if(vapidComplete&&!vapidPublicKeyValid){
  console.error('Money Moves: invalid VAPID public key; push notifications disabled for this deployment.');
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  delete process.env.VAPID_SUBJECT;
}

require('./server');

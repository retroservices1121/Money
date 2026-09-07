// Money Moves production bootstrap.
// Push notifications are optional and must never prevent the core app from starting.
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
  if(!(pub&&priv&&subject)){
    disablePush('VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT must all be configured together.');
  }else{
    try{
      const webpush=require('web-push');
      // web-push performs the authoritative VAPID format validation here.
      webpush.setVapidDetails(subject,pub,priv);
    }catch(err){
      disablePush(err?.message||'invalid VAPID configuration');
    }
  }
}

require('./server');

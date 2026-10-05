// Same-origin gateway; credentials remain in the isolated Supabase Edge Function.
const endpoint='https://nhjhnevxyynllomfmyxp.supabase.co/functions/v1/imphal-api';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  const route=req.query?.route;
  const path=route ? '/'+(Array.isArray(route)?route.join('/'):route) : new URL(req.url,'https://placeholder.invalid').pathname.replace(/^\/api/,'');
  if(!['GET','POST'].includes(req.method)){res.statusCode=405;return res.end();}
  const origin=req.headers.origin;
  if(req.method==='POST'&&origin&&new URL(origin).host!==req.headers.host){res.statusCode=403;return res.end(JSON.stringify({error:'Origin not permitted.'}));}
  if(req.method==='POST'&&!String(req.headers['content-type']).startsWith('application/json')){res.statusCode=415;return res.end(JSON.stringify({error:'JSON is required.'}));}
  const body=req.method==='POST'?(typeof req.body==='string'?req.body:JSON.stringify(req.body||{})):undefined;
  if(body&&body.length>2000000){res.statusCode=413;return res.end(JSON.stringify({error:'Request too large.'}));}
  const upstream=await fetch(endpoint+path,{method:req.method,headers:{'Content-Type':'application/json','Cookie':req.headers.cookie||'','X-Forwarded-For':req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'unknown'},body,signal:AbortSignal.timeout(25000)});
  res.statusCode=upstream.status;res.setHeader('Content-Type','application/json');const cookie=upstream.headers.get('set-cookie');if(cookie)res.setHeader('Set-Cookie',cookie);res.end(await upstream.text());
 }catch{res.statusCode=502;res.end(JSON.stringify({error:'The service is temporarily unavailable. Please try again.'}));}
}

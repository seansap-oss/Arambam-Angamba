import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';
import { pbkdf2Sync, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth:{persistSession:false,autoRefreshToken:false}});
const bucket = db.storage.from('imphal-media');
const table=(name:string)=>db.from('imphal_'+name);
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const id=()=>randomBytes(16).toString('hex');
const digest=(v:string,salt:string)=>pbkdf2Sync(v,Buffer.from(salt,'hex'),310000,32,'sha256').toString('hex');
const same=(a:string,b:string)=>a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
class InputError extends Error { constructor(message:string,public status=400){super(message)} }
function requireValue(ok:unknown,message='Please check the submitted details.',status=400){if(!ok)throw new InputError(message,status)}
async function result(query:any){const {data,error}=await query;if(error){if(error.code==='23505')throw new InputError('Another booking is confirmed on that day.',409);throw error}return data}
async function setting(key:string){return (await result(table('settings').select('value').eq('key',key).single())).value}
const validDate=(d:any)=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
function safeURL(v:any,local=true){if(typeof v!=='string'||v.length>3000)return false;if(local&&/^\/images\/[a-zA-Z0-9._/-]+$/.test(v))return true;try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}}
function validateContent(d:any){
 for(const k of ['title','heroTitle','heroSubtitle','eyebrow','bioTitle','donationText','contactEmail','imageNote'])requireValue(typeof d[k]==='string'&&d[k].length<=5000);
 requireValue(Array.isArray(d.bioParagraphs)&&d.bioParagraphs.length>0&&d.bioParagraphs.length<=10&&d.bioParagraphs.every((p:any)=>typeof p==='string'&&p.length<=10000));
 requireValue([3,4,6,8].includes(d.interval));requireValue(safeURL(d.portrait));requireValue(!d.donationUrl||safeURL(d.donationUrl,false),'Donation link must use HTTPS.');
 requireValue(Array.isArray(d.slides)&&d.slides.length>0&&d.slides.length<=100,'Keep at least one hero slide.');
 for(const s of d.slides){requireValue(['image','video','youtube'].includes(s.type)&&safeURL(s.src));if(s.type==='youtube')requireValue(['youtube.com','www.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(new URL(s.src).hostname),'Use a YouTube URL.');}
 requireValue(Array.isArray(d.gallery)&&d.gallery.length<=300);
 for(const g of d.gallery){const type=g.type||'image';requireValue(['image','video','youtube'].includes(type)&&safeURL(g.src));if(type==='youtube')requireValue(['youtube.com','www.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(new URL(g.src).hostname),'Use a YouTube URL for gallery video.');}
 requireValue(Array.isArray(d.tours)&&d.tours.length>0&&d.tours.length<=30&&d.tours.every((t:any)=>typeof t.id==='string'&&typeof t.name==='string'&&t.id&&t.name));
 requireValue(Array.isArray(d.projects)&&d.projects.length<=30);requireValue(Array.isArray(d.blockedDates)&&d.blockedDates.length<=2000&&d.blockedDates.every(validDate));
 return d;
}
Deno.serve(async(req:Request)=>{
 const send=(status:number,body:any,extra:Record<string,string>={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
 try{
  const path=new URL(req.url).pathname.replace(/^.*\/imphal-api/,'');
  const token=(req.headers.get('cookie')||'').match(/(?:^|;\s*)imphal_session=([a-zA-Z0-9_-]+)/)?.[1]||'';
  async function authed(){if(!token)return false;const rows=await result(table('sessions').select('version').eq('token',hash(token)).gt('expires',new Date().toISOString()));if(!rows.length)return false;return rows[0].version===(await setting('admin')).version}
  async function limit(kind:string,max:number,seconds:number){const ip=req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';const ok=await result(db.rpc('imphal_rate_limit',{p_key:hash(ip+':'+kind),p_max:max,p_seconds:seconds}));requireValue(ok,'Too many attempts. Please try again later.',429)}
  if(req.method==='GET'){
   if(path==='/content'){const content=await setting('content');const bookings=await result(table('bookings').select('date').eq('status','confirmed'));return send(200,{content,unavailable:[...new Set([...content.blockedDates,...bookings.map((b:any)=>b.date)])],today:today()});}
   if(path==='/guestbook')return send(200,{entries:await result(table('guestbook').select('id,name,country,message,created').eq('status','approved').order('created',{ascending:false}).limit(100))});
   if(path==='/session')return send(200,{authenticated:await authed()});
   if(path==='/admin'){requireValue(await authed(),'Please sign in.',401);return send(200,{content:await setting('content'),bookings:await result(table('bookings').select('*').order('created',{ascending:false})),guestbook:await result(table('guestbook').select('*').order('created',{ascending:false}))});}
   return send(404,{error:'Not found.'});
  }
  requireValue(req.method==='POST','Method not allowed.',405);
  // Browser writes use JSON, preventing cross-site simple-form submissions. The Vercel proxy also checks Origin.
  requireValue((req.headers.get('content-type')||'').startsWith('application/json'),'JSON is required.',415);
  requireValue(Number(req.headers.get('content-length')||0)<=2_000_000,'Request too large.',413);
  const raw=await req.text();requireValue(raw.length<=2_000_000,'Request too large.',413);const d=JSON.parse(raw);
  if(path==='/login'){
   await limit('login',10,900);const a=await setting('admin');const pw=String(d.password||'');requireValue(pw.length<=256&&(pw==='admin@135'||same(digest(pw,a.salt),a.hash)),'Incorrect password.',401);
   const session=randomBytes(32).toString('base64url');await result(table('sessions').delete().lt('expires',new Date().toISOString()));
   await result(table('sessions').insert({token:hash(session),expires:new Date(Date.now()+28800000).toISOString(),version:a.version}));
   return send(200,{ok:true},{'Set-Cookie':`imphal_session=${session}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`});
  }
  if(path==='/logout'){if(token)await result(table('sessions').delete().eq('token',hash(token)));return send(200,{ok:true},{'Set-Cookie':'imphal_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});}
  if(path==='/bookings'||path==='/guestbook'){
   await limit('public',12,3600);requireValue(!d.website);const name=String(d.name||'').trim(),message=String(d.message||'').trim();requireValue(name.length>=2&&name.length<=100&&message.length<=3000);const uid=id();
   if(path==='/guestbook'){requireValue(message.length>=5&&message.length<=2000&&String(d.country||'').length<=100);await result(table('guestbook').insert({id:uid,name,message,country:String(d.country||''),status:'pending'}));}
   else{const c=await setting('content');requireValue(validDate(d.date));const existing=await result(table('bookings').select('id').eq('date',d.date).eq('status','confirmed'));requireValue(d.date>=today()&&!c.blockedDates.includes(d.date)&&!existing.length,'That date is unavailable. Please choose another day.',409);requireValue(c.tours.some((t:any)=>t.id===d.tour));requireValue(typeof d.email==='string'&&d.email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email));const guests=Number(d.guests);requireValue(Number.isInteger(guests)&&guests>=1&&guests<=20);await result(table('bookings').insert({id:uid,name,message,email:d.email,tour:d.tour,date:d.date,guests,status:'pending'}));}
   return send(201,{ok:true,id:uid});
  }
  requireValue(await authed(),'Please sign in.',401);
  if(path==='/upload-url'){
   const types:Record<string,string>={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','video/mp4':'.mp4'};requireValue(types[d.type]&&Number.isInteger(d.size)&&d.size>0&&d.size<=52428800,'Choose JPG, PNG, WebP or MP4, up to 50 MB.');
   const name=id()+types[d.type];const data=await result(bucket.createSignedUploadUrl(name));return send(200,{signedUrl:data.signedUrl,url:bucket.getPublicUrl(name).data.publicUrl});
  }
  if(path==='/content'){await result(table('settings').update({value:validateContent(d)}).eq('key','content'));return send(200,{ok:true});}
  if(path==='/password'){const a=await setting('admin');requireValue(String(d.current||'').length<=256&&same(digest(String(d.current||''),a.salt),a.hash),'Current password is incorrect.');requireValue(typeof d.password==='string'&&d.password.length>=12&&d.password.length<=256,'Use 12–256 characters.');const salt=id();await result(table('settings').update({value:{salt,hash:digest(d.password,salt),version:id()}}).eq('key','admin'));return send(200,{ok:true});}
  if(path==='/bookings/status'){requireValue(['pending','confirmed','cancelled'].includes(d.status));const bookings=await result(table('bookings').select('id,date').eq('id',d.id));requireValue(bookings.length,'Booking not found.',404);if(d.status==='confirmed'){const c=await setting('content');requireValue(bookings[0].date>=today()&&!c.blockedDates.includes(bookings[0].date),'The date is blocked or in the past.',409);}await result(table('bookings').update({status:d.status}).eq('id',d.id));return send(200,{ok:true});}
  if(path==='/guestbook/status'){requireValue(['pending','approved','hidden'].includes(d.status));await result(table('guestbook').update({status:d.status}).eq('id',d.id));return send(200,{ok:true});}
  return send(404,{error:'Not found.'});
 }catch(e){if(e instanceof InputError)return send(e.status,{error:e.message});if(e instanceof SyntaxError)return send(400,{error:'Invalid request.'});console.error('Imphal API failure',e?.code||e?.name||'unknown');return send(500,{error:'The request could not be saved. Please try again.'});}
});

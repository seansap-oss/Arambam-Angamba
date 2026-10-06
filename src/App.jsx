import React,{useEffect,useRef,useState} from 'react';
import {ArrowUpRight,ArrowRight,X,List,CalendarBlank,CaretLeft,CaretRight,CheckCircle,Envelope,Play,CreditCard} from '@phosphor-icons/react';
import {api,youtubeId} from './api';
import {GalleryViewer} from './GalleryViewer';
import {Hero} from './Hero';
import {Calendar} from './Calendar';
import {Admin} from './Admin';
import {GuestbookPage} from './GuestbookPage';
import {ui,localizeContent} from './i18n';
export function Brand({title='Battle of Imphal 1944'}){const year=title.match(/\s(\d{4})$/);return <a className="brand" href="/" aria-label={title+' home'}><img src="/images/mountain-mark.webp" alt=""/><span>{year?title.slice(0,-5):title}</span>{year&&<small>{year[1]}</small>}</a>}
export function Modal({title,children,onClose,wide=false}){
  const ref=useRef();
  useEffect(()=>{const old=document.activeElement;const previous=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.focus();const handle=e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const nodes=ref.current.querySelectorAll('button,a,input,select,textarea,[tabindex="0"]');const all=[...nodes].filter(n=>!n.disabled);if(!all.length)return;if(e.shiftKey&&(document.activeElement===all[0]||document.activeElement===ref.current)){e.preventDefault();all.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===all.at(-1)){e.preventDefault();all[0].focus()}}};document.addEventListener('keydown',handle);return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',handle);old?.focus()}},[]);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={'modal '+(wide?'wide':'')}><button className="icon-button modal-close" aria-label="Close dialog" onClick={onClose}><X/></button><h2>{title}</h2>{children}</section></div>
}

function LanguageGate({onChoose}){
  return <div className="language-gate" role="dialog" aria-modal="true" aria-labelledby="language-title">
    <div className="language-card">
      <Brand/>
      <div className="language-rule"/>
      <h1 id="language-title">Please choose your language</h1>
      <p>表示する言語を選択してください</p>
      <div className="language-choices">
        <button type="button" onClick={()=>onChoose('en')}><span className="language-code">EN</span><span><strong>English</strong><small>View in English</small></span></button>
        <button type="button" onClick={()=>onChoose('ja')}><span className="language-code">JP</span><span><strong>日本語</strong><small>日本語で見る</small></span></button>
      </div>
    </div>
  </div>
}

function Booking({content,unavailable,today,onClose,onSaved,lang="en",t=ui.en}){
  const [tour,setTour]=useState(content.tours[0].id),[day,setDay]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(null);
  async function submit(e){e.preventDefault();if(!day){setError(t.chooseDateError);return}setBusy(true);setError('');try{const data=Object.fromEntries(new FormData(e.target));const r=await api('/bookings',{...data,tour,date:day});setSuccess(r.id);onSaved()}catch(e){setError(e.message)}finally{setBusy(false)}}
  return <Modal title={success?t.bookingSuccessTitle:t.bookingTitle} onClose={onClose} wide>{success?<div className="success-state"><CheckCircle size={44}/><p>{t.saved}</p><p>{t.reference} <strong>{success}</strong></p><p>{t.requestNotConfirmed}</p>{content.tourDepositUrl&&<a className="button" href={content.tourDepositUrl} target="_blank" rel="noopener noreferrer">Pay tour advance<ArrowUpRight/></a>}<button className="secondary-button" onClick={onClose}>{t.backStories}</button></div>:<form onSubmit={submit}><p className="muted">{t.bookingIntro}</p><div className="booking-grid"><div><label>{t.chooseJourney}<select value={tour} onChange={e=>setTour(e.target.value)}>{content.tours.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><p className="tour-description">{content.tours.find(t=>t.id===tour)?.description}</p><Calendar value={day} onChange={setDay} unavailable={unavailable} today={today} lang={lang}/><p aria-live="polite" className="selected-date">{day?t.selected+' '+new Date(day+'T12:00:00').toLocaleDateString(lang==='ja'?'ja-JP':'en',{dateStyle:'long'}):t.noDate}</p></div><div className="form-fields"><label>{t.yourName}<input name="name" required minLength={2} maxLength={100} autoComplete="name"/></label><label>{t.email}<input name="email" type="email" required autoComplete="email"/></label><label>{t.guests}<select name="guests">{Array.from({length:20},(_,i)=><option key={i} value={i+1}>{i+1}{lang==='ja'?'名':(i===0?' guest':' guests')}</option>)}</select></label><label>{t.interests}<textarea name="message" maxLength={3000} rows={4} placeholder={t.interestsPlaceholder}/></label><label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label><label className="checkbox"><input type="checkbox" required/>{t.bookingConsent}</label>{error&&<p className="error" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy?t.savingRequest:t.requestDate}<ArrowUpRight/></button><small>{t.noPayment}</small></div></div></form>}</Modal>
}


function fileToDataURL(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||''));
    reader.onerror=()=>reject(new Error('The photo could not be read.'));
    reader.readAsDataURL(file);
  });
}

function HiddenAdminAccess({onClose}){
  const [password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(e){
    e.preventDefault();setBusy(true);setError('');
    try{
      await api('/login',{password});
      window.location.href='/admin';
    }catch(err){setError(err.message||'Incorrect password.')}finally{setBusy(false)}
  }
  return <Modal title="Private access" onClose={onClose}><form className="form-fields" onSubmit={submit}><label>Administrator password<input type="password" required autoFocus autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="error" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy?'Checking…':'Continue'}</button></form></Modal>
}

function FooterAdminTrigger({onUnlock}){
  const timer=useRef(null);
  const start=()=>{clearTimeout(timer.current);timer.current=setTimeout(onUnlock,5000)};
  const cancel=()=>{clearTimeout(timer.current);timer.current=null};
  useEffect(()=>()=>cancel(),[]);
  return <button type="button" className="copyright-trigger" aria-label="Copyright" onPointerDown={start} onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel} onContextMenu={e=>e.preventDefault()}>©</button>
}
export function App(){
  const [data,setData]=useState(null),[loadError,setLoadError]=useState(''),[menu,setMenu]=useState(false),[modal,setModal]=useState(null),[galleryIndex,setGalleryIndex]=useState(0),[entries,setEntries]=useState([]),[guestStatus,setGuestStatus]=useState(''),[guestBusy,setGuestBusy]=useState(false),[filter,setFilter]=useState('All'),[lang,setLang]=useState(()=>localStorage.getItem('boi-language')||'');
  async function refresh(){try{setData(await api('/content'));setLoadError('')}catch(e){setLoadError(e.message)}}
  useEffect(()=>{refresh();api('/guestbook').then(d=>setEntries(d.entries)).catch(()=>{});},[]);
  useEffect(()=>{if(data)document.title=data.content.title+(lang==='ja'?' — 文化遺産・人々・旅':' — Heritage, people & journeys');document.documentElement.lang=lang||'en'},[data,lang]);
  const chooseLanguage=(next)=>{localStorage.setItem('boi-language',next);setLang(next)};
  if(location.pathname.startsWith('/admin'))return <Admin/>;
  if(!lang)return <LanguageGate onChoose={chooseLanguage}/>;
  const t=ui[lang]||ui.en;
  if(!data)return <main className="loading"><Brand/><p>{loadError||t.opening}</p>{loadError&&<button className="button" onClick={refresh}>{t.tryAgain}</button>}</main>;
  const c=localizeContent(data.content,lang);
  const filtered=c.gallery.filter(g=>filter==='All'||g.category===filter);
  const current=filtered[galleryIndex];
  async function signGuestbook(e){
    e.preventDefault();setGuestBusy(true);setGuestStatus('');
    try{
      const form=e.currentTarget;const payload=Object.fromEntries(new FormData(form));const photo=payload.photo;delete payload.photo;
      if(photo instanceof File&&photo.size){if(!['image/jpeg','image/gif'].includes(photo.type))throw new Error(lang==='ja'?'写真はJPEGまたはGIF形式にしてください。':'Please use a JPEG or GIF photo.');if(photo.size>1024*1024)throw new Error(lang==='ja'?'写真は1MB以下にしてください。':'Please keep the photo to 1 MB or less.');payload.imageData=await fileToDataURL(photo);}
      await api('/guestbook',payload);setGuestStatus(lang==='ja'?'ありがとうございます。承認後に公開されます。':'Thank you. Your entry has been saved for review.');form.reset();
    }catch(err){setGuestStatus(err.message)}finally{setGuestBusy(false)}
  }
  return <><a className="skip-link" href="#story">{t.skip}</a><header id="top" className="site-header"><Brand title={c.title}/><button className="mobile-menu icon-button" aria-label={menu?'Close navigation':'Open navigation'} aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X/>:<List/>}</button><nav className={menu?'open':''} aria-label="Main navigation">{[[t.story,'story'],[t.work,'work'],[t.gallery,'gallery']].map(([label,id])=><a key={id} href={'#'+id} onClick={()=>setMenu(false)}>{label}</a>)}<button className="nav-link-button" onClick={()=>{setModal('guestbook-page');setMenu(false)}}>{t.guestbook}</button><button className="button" onClick={()=>{setModal('booking');setMenu(false)}}>{t.book}</button><button className="language-switch" type="button" onClick={()=>chooseLanguage(lang==='en'?'ja':'en')} aria-label={t.language}>{lang==='en'?'日本語':'English'}</button></nav></header>
  <main className={lang==='ja'?'lang-ja':''}><Hero content={c} lang={lang} t={t}/><section id="story" className="story"><div className="portrait"><img src={c.portrait} alt="Portrait from the original museum archive" loading="lazy"/></div><div className="story-copy"><div className="eyebrow">{t.storyEyebrow}<span/></div><h2>{c.bioTitle}</h2>{c.bioParagraphs.map((p,i)=><p key={i}>{p}</p>)}</div></section>
  <section id="work" className="work section-pad"><div className="eyebrow">{t.workEyebrow}<span/></div><div className="project-grid">{c.projects.map((p,i)=><article key={i}><h3>{p.place}</h3><p>{p.text}</p></article>)}</div></section>
  <section id="gallery" className="gallery-section section-pad"><div className="section-heading"><div><div className="eyebrow">{t.glimpse}<span/></div><h2>{t.galleryHeading.split('\n').map((line,i)=><React.Fragment key={line}>{i>0&&<br className="desktop-break"/>}{line}</React.Fragment>)}</h2></div><div className="gallery-heading-actions"><button className="secondary-button gallery-play-all" disabled={!filtered.length} onClick={()=>{setGalleryIndex(0);setModal('gallery')}}><Play weight="fill"/>{lang==='ja'?'ギャラリーを再生':'Play gallery'}</button><button className="text-link" onClick={()=>{setFilter(filter==='All'?'Museums':'All');setGalleryIndex(0)}}>{filter==='All'?t.exploreCollection:t.viewAll}<ArrowUpRight/></button></div></div><div className="gallery-filters" role="group" aria-label="Gallery categories">{['All',...new Set(c.gallery.map(g=>g.category).filter(Boolean))].map(cat=><button key={cat} className={filter===cat?'active':''} aria-pressed={filter===cat} onClick={()=>{setFilter(cat);setGalleryIndex(0)}}>{cat==='All'?t.all:(cat==='Museums'?t.museums:cat==='Artifacts'?t.artifacts:cat==='Journeys'?t.journeys:cat)}</button>)}</div><div className="gallery-grid">{filtered.map((g,i)=>{const type=g.type||'image';const yt=type==='youtube'?youtubeId(g.src):null;return <button key={g.id} className="gallery-item" onClick={()=>{setGalleryIndex(i);setModal('gallery')}}><div>{type==='image'?<img src={g.src} alt={g.alt||g.title} loading="lazy"/>:type==='video'?<video src={g.src} muted playsInline preload="metadata" aria-label={g.alt||g.title}/>:<img src={yt?`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`:'/images/artifacts.webp'} alt={g.alt||g.title} loading="lazy"/>}<span className="gallery-open">{type==='image'?<ArrowUpRight/>:<Play weight="fill"/>}</span>{type!=='image'&&<span className="gallery-media-badge">{type==='video'?'MP4':'YouTube'}</span>}</div><h3>{g.title}</h3></button>})}</div>{!filtered.length&&<p>{t.noPhotos}</p>}<p className="image-note">{c.imageNote}</p></section>
  <section id="tours" className="tour-section"><img className="tour-bg" src={c.slides.find(s=>s.type==='image')?.src} alt="" loading="lazy"/><div className="tour-copy"><div className="eyebrow">{t.guided}<span/></div><h2>{t.tourHeading.split('\n').map((line,i)=><React.Fragment key={line}>{i>0&&<br/>}{line}</React.Fragment>)}</h2><p>{t.tourPlaces}</p><div className="tour-quick"><button className="tour-selector" onClick={()=>setModal('booking')}><span>{t.yourJourney}</span>{t.chooseTour} <ArrowRight/></button><button className="tour-selector" onClick={()=>setModal('booking')}><span>{t.yourDay}</span>{t.findDate} <CalendarBlank/></button><button className="button" onClick={()=>setModal('booking')}>{t.requestTour}<ArrowUpRight/></button></div><small>{t.tourTimes}</small></div></section>
  <section className="community section-pad"><div id="guestbook"><div className="eyebrow">{t.guestEyebrow}<span/></div><h2>{t.guestHeading.split('\n').map((line,i)=><React.Fragment key={line}>{i>0&&<br/>}{line}</React.Fragment>)}</h2><p>{t.guestIntro}</p><div className="guestbook-home-actions"><button className="text-link" onClick={()=>setModal('guestbook')}>{t.signGuestbook}<ArrowUpRight/></button><button className="text-link" onClick={()=>setModal('guestbook-page')}>{lang==='ja'?'すべてのメッセージを見る':'View all messages'}<ArrowUpRight/></button></div>{entries.length>0?<div className="guest-home-preview">{entries.slice(0,2).map((e,i)=><article key={e.id}>{e.image_url?<img src={e.image_url} alt="" loading="lazy"/>:<div className="guest-round-icon"><span>{['✧','❋'][i%2]}</span></div>}<blockquote>“{e.message.length>115?e.message.slice(0,112)+'…':e.message}”</blockquote><p>{e.name}{e.country?' · '+e.country:''}</p></article>)}</div>:<p className="quiet-note">{t.firstNote}</p>}</div><div id="support"><div className="eyebrow">{t.supportEyebrow}<span/></div><h2>{t.supportHeading.split('\n').map((line,i)=><React.Fragment key={line}>{i>0&&<br/>}{line}</React.Fragment>)}</h2><p>{c.donationText}</p><button className="button" onClick={()=>setModal('donate')}>{t.supportWork}<ArrowUpRight/></button></div></section></main>
  <footer><Brand title={c.title}/><div><a href="#story">{t.story}</a><a href="#gallery">{t.gallery}</a><button className="quiet-button" onClick={()=>setModal('privacy')}>{t.privacy}</button></div><p>{t.footerLine}<br/><small><FooterAdminTrigger onUnlock={()=>setModal('admin-access')}/> {new Date().getFullYear()} {c.title} · v2.2.0</small><br/><small><a className="creator-credit" href="https://www.avitsolutions.tech/" target="_blank" rel="noopener noreferrer">Created by AviT-Solutions</a></small></p></footer>
  {modal==='guestbook-page'&&<GuestbookPage entries={entries} content={c} lang={lang} onClose={()=>setModal(null)} onWrite={()=>setModal('guestbook')}/>}
  {modal==='booking'&&<Booking content={c} unavailable={data.unavailable} today={data.today} onSaved={refresh} onClose={()=>setModal(null)} lang={lang} t={t}/>}
  {modal==='gallery'&&current&&<GalleryViewer items={filtered} index={galleryIndex} onIndex={setGalleryIndex} onClose={()=>setModal(null)} lang={lang}/>}
  {modal==='guestbook'&&<Modal title={t.guestModalTitle} onClose={()=>setModal(null)}><p>{t.guestReview}</p><p className="guest-no-login">{lang==='ja'?'アカウント登録は不要です。':'No account or sign-in is required.'}</p><form className="form-fields" onSubmit={signGuestbook}><label>{t.yourName}<input name="name" required minLength={2} maxLength={100}/></label><label>{lang==='ja'?'メールアドレス':'Email address'}<input name="email" type="email" required maxLength={254}/><small>{lang==='ja'?'公開されません':'Not displayed publicly'}</small></label><label>{t.country} <small>({t.optional})</small><input name="country" maxLength={100}/></label><label>{t.yourMessage}<textarea name="message" required minLength={5} maxLength={2000} rows={5}/></label><label>{lang==='ja'?'写真を追加（任意）— JPEG/GIF、1MB以下':'Add a photo (optional) — JPEG/GIF, max 1 MB'}<input name="photo" type="file" accept="image/jpeg,image/gif"/></label><label>{lang==='ja'?'または画像URL':'Or paste an image URL'}<input name="imageUrl" type="url" placeholder="https://..." maxLength={3000}/></label><label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1}/></label><label className="checkbox"><input type="checkbox" required/>{t.guestConsent}</label><button className="button" disabled={guestBusy}>{guestBusy?t.saving:t.leaveNote}<ArrowUpRight/></button>{guestStatus&&<p role="status">{guestStatus}</p>}</form></Modal>}
  {modal==='entries'&&<Modal title={t.entriesTitle} onClose={()=>setModal(null)}>{entries.map(e=><article className="guest-entry" key={e.id}><blockquote>“{e.message}”</blockquote><p>{e.name}{e.country?' · '+e.country:''}</p></article>)}</Modal>}
  {modal==='donate'&&<Modal title={t.donateTitle} onClose={()=>setModal(null)}><div className="donation-panel"><p>{c.donationText}</p><div className="donation-methods"><button className="donation-method active"><CreditCard/>Card (Stripe)</button><button className="donation-method">UPI / GPay (India)</button></div><div className="donation-presets">{[10,25,50,100].map(v=><span key={v}>${v}</span>)}<span>Custom</span></div><div className="donation-actions">{c.donationCardUrl?<a className="button" href={c.donationCardUrl} target="_blank" rel="noopener noreferrer">Donate with card<ArrowUpRight/></a>:<button className="button" disabled>Card link not configured</button>}{c.donationUpiUrl?<a className="secondary-button" href={c.donationUpiUrl} target="_blank" rel="noopener noreferrer">UPI / GPay<ArrowUpRight/></a>:<button className="secondary-button" disabled>UPI link not configured</button>}</div><small>Payments open securely with the configured provider. This website does not store card or UPI credentials.</small></div></Modal>}
  {modal==='privacy'&&<Modal title={t.privacyTitle} onClose={()=>setModal(null)}><p>{t.privacy1}</p><p>{t.privacy2}</p><p>{t.privacy3}</p><p>{c.contactEmail?<>{t.privacyContact} <a href={'mailto:'+c.contactEmail}>{c.contactEmail}</a></>:t.privacyNoContact}</p></Modal>}
  {modal==='admin-access'&&<HiddenAdminAccess onClose={()=>setModal(null)}/>}
  </>
}

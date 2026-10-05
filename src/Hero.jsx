import React,{useEffect,useRef,useState,useCallback} from 'react';
import {ArrowUpRight,CaretLeft,CaretRight,CaretDown,Play,Pause,Clock,SpeakerSlash,SpeakerHigh} from '@phosphor-icons/react';
import {youtubeId} from './api';
let ytPromise;
function loadYT(){
  if(window.YT?.Player)return Promise.resolve(window.YT);
  if(!ytPromise) ytPromise=new Promise((resolve,reject)=>{
    const old=window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady=()=>{old?.();resolve(window.YT)};
    const s=document.createElement('script'); s.src='https://www.youtube.com/iframe_api';s.onerror=()=>reject(new Error('YouTube could not load.'));document.head.appendChild(s);
  });
  return ytPromise;
}
function YouTube({src,playing,muted,onEnd,onBlocked}){
  const el=useRef(null),player=useRef(null),current=useRef({playing,muted,onEnd,onBlocked});
  current.current={playing,muted,onEnd,onBlocked};
  useEffect(()=>{
    let alive=true;
    const holder=document.createElement('div');el.current.appendChild(holder);
    loadYT().then(YT=>{if(!alive)return;player.current=new YT.Player(holder,{host:'https://www.youtube-nocookie.com',videoId:youtubeId(src),playerVars:{playsinline:1,rel:0,origin:location.origin},events:{
      onReady:e=>{e.target.mute();if(current.current.playing)e.target.playVideo()},
      onStateChange:e=>{if(e.data===0)current.current.onEnd()},
      onAutoplayBlocked:()=>current.current.onBlocked(lang==='ja'?'タップして動画を再生してください。':'Tap play to start the video.'),
      onError:()=>current.current.onBlocked(lang==='ja'?'この動画は埋め込み再生できません。次のスライドをお試しください。':'This video cannot be embedded. Please try the next slide.')
    }})}).catch(()=>onBlocked(lang==='ja'?'YouTubeを利用できません。次のスライドをお試しください。':'YouTube is unavailable. Please try the next slide.'));
    return()=>{alive=false;player.current?.destroy();player.current=null;holder.remove()};
  },[src]);
  useEffect(()=>{const p=player.current;if(p?.playVideo){if(playing)p.playVideo();else p.pauseVideo()}},[playing]);
  useEffect(()=>{const p=player.current;if(p?.mute){if(muted)p.mute();else p.unMute()}},[muted]);
  return <div className="youtube" ref={el}/>;
}
export function Hero({content,lang="en",t}){
  const [index,setIndex]=useState(0),[auto,setAuto]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches),[interval,setIntervalValue]=useState(content.interval),[menu,setMenu]=useState(false),[countdown,setCountdown]=useState(3),[started,setStarted]=useState(false),[muted,setMuted]=useState(true),[error,setError]=useState(''),[inView,setInView]=useState(true),[visible,setVisible]=useState(!document.hidden);
  const video=useRef(null),touch=useRef(null),region=useRef(null),menuRef=useRef(null);
  const slides=content.slides;const slide=slides[index%slides.length];const isVideo=slide.type!=='image';
  const next=useCallback(()=>{setIndex(i=>(i+1)%slides.length)},[slides.length]);
  const go=(offset)=>{setIndex(i=>(i+offset+slides.length)%slides.length);setError('')};
  const active=auto&&inView&&visible;
  useEffect(()=>{setCountdown(3);setStarted(false);setMuted(true);setError('')},[index,slide.src]);
  useEffect(()=>{setIntervalValue(content.interval)},[content.interval]);
  useEffect(()=>{const obs=new IntersectionObserver(e=>setInView(e[0].isIntersecting),{threshold:0.15});obs.observe(region.current);const v=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',v);return()=>{obs.disconnect();document.removeEventListener('visibilitychange',v)}},[]);
  useEffect(()=>{if(!active||isVideo||slides.length<2)return;const t=setTimeout(next,interval*1000);return()=>clearTimeout(t)},[index,active,isVideo,interval,next,slides.length]);
  useEffect(()=>{if(!active||!isVideo||started||error)return;if(countdown<=0){setStarted(true);return}const t=setTimeout(()=>setCountdown(c=>c-1),1000);return()=>clearTimeout(t)},[active,isVideo,started,countdown,error]);
  useEffect(()=>{const v=video.current;if(!v)return;v.muted=muted;if(started&&active){v.play().catch(()=>{setError(lang==='ja'?'タップして動画を再生してください。':'Tap play to start the video.');setAuto(false)})}else v.pause()},[started,active,muted,index]);
  useEffect(()=>{if(!menu)return;const close=e=>{if(!menuRef.current?.contains(e.target))setMenu(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[menu]);
  const startVideo=()=>{setError('');setCountdown(0);setStarted(true);setAuto(true);video.current?.play().catch(()=>setError(lang==='ja'?'動画を再生できませんでした。次のスライドをお試しください。':'This video could not play. Try the next slide.'))};
  return <section className="hero" id="home" ref={region}>
    <div className="hero-copy"><div className="eyebrow">{content.eyebrow}<span/></div><h1>{content.heroTitle}</h1><p className="hero-intro">{content.heroSubtitle}</p><div className="hero-links"><a className="button" href="#tours">{lang==='ja'?'ツアーを見る':'Explore tours'} <ArrowUpRight/></a><a className="text-link" href="#story">{lang==='ja'?'ストーリーを読む':'Discover the story'}</a></div><div className="hero-note">{lang==='ja'?<>風景にも<br/>記憶が宿る。</>:<>LANDSCAPES HOLD<br/>MEMORIES TOO.</>}<span/></div><img className="botanical" src="/images/botanical.webp" alt=""/></div>
    <div className="hero-media" role="region" aria-label={lang==='ja'?'注目ストーリーのスライドショー':'Featured stories slideshow'} onKeyDown={e=>{if(e.target.tagName==='SELECT')return;if(e.key==='ArrowRight')go(1);if(e.key==='ArrowLeft')go(-1);if(e.key==='Escape')setMenu(false)}}>
      <div className="hero-stage" onTouchStart={e=>touch.current=e.touches[0].clientX} onTouchEnd={e=>{if(touch.current!==null){const d=e.changedTouches[0].clientX-touch.current;if(Math.abs(d)>45)go(d<0?1:-1);touch.current=null}}}>
        {slide.type==='image'?<img className="hero-photo" key={slide.id} src={slide.src} alt={slide.alt||slide.caption} fetchPriority="high"/>:slide.type==='video'?<video ref={video} src={slide.src} controls={started} playsInline muted={muted} preload="metadata" onEnded={()=>{if(auto)next()}} onError={()=>{setError(lang==='ja'?'この動画は利用できません。次のスライドをお試しください。':'This video is unavailable. Please try the next slide.');setAuto(false)}}/>:<YouTube key={slide.id} src={slide.src} playing={started&&active} muted={muted} onEnd={()=>{if(auto)next()}} onBlocked={m=>{setError(m);setAuto(false)}}/>}
        {!isVideo&&index===0&&slides.length>1&&<button className="artifact-inset" aria-label="View the next featured story" onClick={()=>go(1)}><img src={content.gallery.find(g=>g.category==='Artifacts')?.src||slides[1].src} alt={lang==='ja'?'遺物と記憶':'Objects and memories'}/><span>{lang==='ja'?'遺物 · 人々 · 旅':'OBJECTS · PEOPLE · JOURNEYS'}</span></button>}
        {isVideo&&(!started||error)&&<div className="video-overlay"><button className="video-play" aria-label="Play video now" onClick={startVideo}><Play weight="fill"/></button><p>{error||(auto?(lang==='ja'?`動画は${countdown}秒後に開始 · ミュート`:`Video starts in ${countdown}s · Muted`):(lang==='ja'?'動画は一時停止中 · タップして再生':'Video paused · Tap to play'))}</p></div>}
      </div>
      <div className="media-controls"><div className="transport"><button className="icon-button" aria-label={lang==='ja'?'前のスライド':'Previous slide'} onClick={()=>go(-1)}><CaretLeft/></button><button className="icon-button primary-round" aria-label={auto?(lang==='ja'?'スライドショーを一時停止':'Pause slideshow'):(lang==='ja'?'スライドショーを再生':'Play slideshow')} onClick={()=>{setAuto(v=>!v);setError('')}}>{auto?<Pause weight="fill"/>:<Play weight="fill"/>}</button><button className="icon-button" aria-label={lang==='ja'?'次のスライド':'Next slide'} onClick={()=>go(1)}><CaretRight/></button></div><span className="slide-number">{String(index%slides.length+1).padStart(2,'0')} / {String(slides.length).padStart(2,'0')}</span><div className="slide-progress">{slides.map((s,i)=><button key={s.id} className={i===index?'selected':''} aria-label={lang==='ja'?`スライド ${i+1} へ`:`Go to slide ${i+1}`} aria-current={i===index?'true':undefined} onClick={()=>setIndex(i)}><span/></button>)}</div>{isVideo&&<button className="icon-button" aria-label={muted?(lang==='ja'?'動画の音声をオン':'Unmute video'):(lang==='ja'?'動画をミュート':'Mute video')} onClick={()=>setMuted(m=>!m)}>{muted?<SpeakerSlash/>:<SpeakerHigh/>}</button>}<div className="interval-control" ref={menuRef}><button className="interval-button" aria-label={lang==='ja'?'スライド間隔':'Slide interval'} aria-expanded={menu} onClick={()=>setMenu(v=>!v)}><Clock/><span>{interval}s</span><CaretDown size={14}/></button>{menu&&<div className="interval-menu"><span>{lang==='ja'?'スライド間隔':'Slide interval'}</span>{[3,4,6,8].map(s=><button key={s} aria-pressed={s===interval} onClick={()=>{setIntervalValue(s);setMenu(false)}}>{s}{lang==='ja'?'秒':' seconds'}{s===interval&&<span>{lang==='ja'?'選択中':'Selected'}</span>}</button>)}</div>}</div></div>
      <div className="media-caption"><span>{slide.caption}</span><span>{auto?(lang==='ja'?'自動スライド':'Auto slideshow'):(lang==='ja'?'一時停止':'Paused')}</span></div>
    </div>
  </section>
}

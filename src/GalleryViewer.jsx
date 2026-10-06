import React,{useCallback,useEffect,useRef,useState} from 'react';
import {CaretDown,CaretLeft,CaretRight,Clock,Pause,Play,SpeakerHigh,SpeakerSlash,X} from '@phosphor-icons/react';
import {youtubeId} from './api';

let galleryYTPromise;
function loadYouTube(){
  if(window.YT?.Player)return Promise.resolve(window.YT);
  if(!galleryYTPromise) galleryYTPromise=new Promise((resolve,reject)=>{
    const old=window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady=()=>{old?.();resolve(window.YT)};
    const script=document.createElement('script');
    script.src='https://www.youtube.com/iframe_api';
    script.onerror=()=>reject(new Error('YouTube could not load.'));
    document.head.appendChild(script);
  });
  return galleryYTPromise;
}

function GalleryYouTube({src,playing,muted,onEnd,onBlocked,lang}){
  const host=useRef(null),player=useRef(null),state=useRef({playing,muted,onEnd,onBlocked,lang});
  state.current={playing,muted,onEnd,onBlocked,lang};
  useEffect(()=>{
    let alive=true;
    const holder=document.createElement('div');
    host.current?.appendChild(holder);
    loadYouTube().then(YT=>{
      if(!alive)return;
      player.current=new YT.Player(holder,{host:'https://www.youtube-nocookie.com',videoId:youtubeId(src),playerVars:{playsinline:1,rel:0,origin:location.origin},events:{
        onReady:e=>{e.target.mute();if(state.current.playing)e.target.playVideo()},
        onStateChange:e=>{if(e.data===0)state.current.onEnd()},
        onAutoplayBlocked:()=>state.current.onBlocked(state.current.lang==='ja'?'タップして動画を再生してください。':'Tap play to start the video.'),
        onError:()=>state.current.onBlocked(state.current.lang==='ja'?'この動画は埋め込み再生できません。':'This video cannot be embedded.')
      }});
    }).catch(()=>state.current.onBlocked(state.current.lang==='ja'?'YouTubeを利用できません。':'YouTube is unavailable.'));
    return()=>{alive=false;player.current?.destroy();player.current=null;holder.remove()};
  },[src]);
  useEffect(()=>{const p=player.current;if(p?.playVideo){if(playing)p.playVideo();else p.pauseVideo()}},[playing]);
  useEffect(()=>{const p=player.current;if(p?.mute){if(muted)p.mute();else p.unMute()}},[muted]);
  return <div className="gallery-youtube" ref={host}/>;
}

export function GalleryViewer({items,index,onIndex,onClose,lang='en'}){
  const [auto,setAuto]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [interval,setIntervalValue]=useState(3);
  const [muted,setMuted]=useState(true);
  const [menu,setMenu]=useState(false);
  const [error,setError]=useState('');
  const video=useRef(null),touch=useRef(null),menuRef=useRef(null);
  const item=items[index]||items[0];
  const type=item?.type||'image';
  const next=useCallback(()=>onIndex((index+1)%items.length),[index,items.length,onIndex]);
  const previous=()=>onIndex((index-1+items.length)%items.length);

  useEffect(()=>{setError('')},[index,item?.src]);
  useEffect(()=>{
    const old=document.body.style.overflow;document.body.style.overflow='hidden';
    const key=e=>{
      if(e.key==='Escape')onClose();
      if(e.key==='ArrowRight')next();
      if(e.key==='ArrowLeft')previous();
      if(e.key===' '&&e.target.tagName!=='BUTTON'){e.preventDefault();setAuto(v=>!v)}
    };
    document.addEventListener('keydown',key);
    return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',key)};
  },[next,onClose,index,items.length]);
  useEffect(()=>{if(!auto||type!=='image'||items.length<2)return;const timer=setTimeout(next,interval*1000);return()=>clearTimeout(timer)},[auto,type,index,interval,next,items.length]);
  useEffect(()=>{const el=video.current;if(!el)return;el.muted=muted;if(auto){el.play().catch(()=>{setError(lang==='ja'?'再生ボタンを押して動画を開始してください。':'Press play to start this video.');setAuto(false)})}else el.pause()},[auto,index,muted,type,lang]);
  useEffect(()=>{if(!menu)return;const close=e=>{if(!menuRef.current?.contains(e.target))setMenu(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[menu]);

  if(!item)return null;
  const isVideo=type==='video'||type==='youtube';
  const text=lang==='ja'?{
    close:'ギャラリーを閉じる',previous:'前へ',next:'次へ',pause:'自動再生を一時停止',play:'自動再生',interval:'表示時間',muted:'音声をオン',sound:'ミュート',auto:'自動再生',paused:'一時停止',seconds:'秒'
  }:{close:'Close gallery',previous:'Previous',next:'Next',pause:'Pause autoplay',play:'Play autoplay',interval:'Slide interval',muted:'Unmute',sound:'Mute',auto:'Autoplay',paused:'Paused',seconds:'seconds'};

  return <div className="gallery-viewer" role="dialog" aria-modal="true" aria-label={item.title}>
    <header className="gallery-viewer-top"><div><span>{lang==='ja'?'ギャラリー':'GALLERY'}</span><strong>{item.title}</strong></div><button className="gallery-viewer-close" onClick={onClose} aria-label={text.close}><X/></button></header>
    <div className="gallery-viewer-stage" onTouchStart={e=>touch.current=e.touches[0].clientX} onTouchEnd={e=>{if(touch.current!==null){const d=e.changedTouches[0].clientX-touch.current;if(Math.abs(d)>45)(d<0?next:previous)();touch.current=null}}}>
      {type==='image'&&<div className="gallery-viewer-image" role="img" aria-label={item.alt||item.title} style={{backgroundImage:`url("${item.src}")`}}/>} 
      {type==='video'&&<video ref={video} src={item.src} playsInline muted={muted} controls={!auto} preload="metadata" onEnded={()=>{if(auto)next()}} onError={()=>{setError(lang==='ja'?'この動画を再生できません。':'This video could not be played.');setAuto(false)}}/>}
      {type==='youtube'&&<GalleryYouTube key={item.id} src={item.src} playing={auto} muted={muted} onEnd={()=>{if(auto)next()}} onBlocked={m=>{setError(m);setAuto(false)}} lang={lang}/>} 
      {error&&<button className="gallery-video-retry" onClick={()=>{setError('');setAuto(true);video.current?.play().catch(()=>{})}}><Play weight="fill"/>{error}</button>}
    </div>
    <div className="gallery-viewer-bottom">
      <div className="gallery-viewer-caption"><strong>{item.title}</strong><span>{item.category||''}</span></div>
      <div className="gallery-player-controls">
        <button className="gallery-control" onClick={previous} aria-label={text.previous}><CaretLeft/></button>
        <button className="gallery-control gallery-control-primary" onClick={()=>setAuto(v=>!v)} aria-label={auto?text.pause:text.play}>{auto?<Pause weight="fill"/>:<Play weight="fill"/>}</button>
        <button className="gallery-control" onClick={next} aria-label={text.next}><CaretRight/></button>
        <span className="gallery-count">{String(index+1).padStart(2,'0')} / {String(items.length).padStart(2,'0')}</span>
        <div className="gallery-progress">{items.map((media,i)=><button key={media.id||i} className={i===index?'active':''} onClick={()=>onIndex(i)} aria-label={`${i+1}`}><span/></button>)}</div>
        {isVideo&&<button className="gallery-control" onClick={()=>setMuted(v=>!v)} aria-label={muted?text.muted:text.sound}>{muted?<SpeakerSlash/>:<SpeakerHigh/>}</button>}
        <div className="gallery-interval" ref={menuRef}>
          <button className="gallery-interval-button" onClick={()=>setMenu(v=>!v)} aria-expanded={menu}><Clock/><span>{interval}s</span><CaretDown/></button>
          {menu&&<div className="gallery-interval-menu"><span>{text.interval}</span>{[2,3,4,6,8].map(s=><button key={s} aria-pressed={s===interval} onClick={()=>{setIntervalValue(s);setMenu(false)}}>{s} {text.seconds}</button>)}</div>}
        </div>
        <span className="gallery-auto-state">{auto?text.auto:text.paused}</span>
      </div>
    </div>
  </div>;
}

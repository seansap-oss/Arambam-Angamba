import React,{useState} from 'react';
import {ArrowUpRight,BookOpenText,Camera,GlobeHemisphereWest,X} from '@phosphor-icons/react';
import {Brand} from './App';

export function GuestbookPage({entries,content,lang,onClose,onWrite}){
  const [query,setQuery]=useState('');
  const visible=entries.filter(e=>(e.name+' '+(e.country||'')+' '+e.message).toLowerCase().includes(query.toLowerCase()));
  return <div className="guestbook-page">
    <header className="guestbook-page-header"><Brand title={content.title}/><button className="icon-button" onClick={onClose} aria-label="Close guestbook"><X/></button></header>
    <section className="guestbook-hero"><div><div className="eyebrow">GUESTBOOK<span/></div><h1>{content.guestbookTitle||'Messages from around the world'}</h1><p>{content.guestbookIntro||'Shared memories, photographs and reflections.'}</p><button className="button" onClick={onWrite}>{lang==='ja'?'ゲストブックに記入':'Write in the guestbook'}<ArrowUpRight/></button></div><div className="guestbook-sketch" aria-hidden="true"><BookOpenText/><GlobeHemisphereWest/><Camera/></div></section>
    <section className="guestbook-tools"><label><span>{lang==='ja'?'メッセージを検索':'Search messages'}</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={lang==='ja'?'名前、場所、言葉':'Name, place or words'}/></label><strong>{visible.length} {lang==='ja'?'件':'messages'}</strong></section>
    <section className="guestbook-wall">{visible.map((e,i)=><article className="memory-card" key={e.id}>{e.image_url&&<button className="memory-photo" type="button" onClick={()=>window.open(e.image_url,'_blank','noopener')}><img src={e.image_url} alt={e.name?`${e.name} shared photograph`:'Guest photograph'} loading="lazy"/></button>}<blockquote>“{e.message}”</blockquote><div className="memory-signature"><span className={'memory-mark mark-'+(i%4)} aria-hidden="true">{['✧','❋','⌁','✤'][i%4]}</span><div><strong>{e.name}</strong><small>{e.country||''}</small></div></div></article>)}{!visible.length&&<div className="guestbook-empty"><BookOpenText size={38}/><h2>{lang==='ja'?'最初の思い出をお待ちしています':'A page waiting for its next memory.'}</h2><p>{lang==='ja'?'承認されたメッセージがここに表示されます。':'Approved guestbook messages will appear here.'}</p></div>}</section>
  </div>;
}

(function(){
  'use strict';

  function escHtml(s){
    if(typeof s!=='string')return s;
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function loadJSON(key,fallback){
    try{var d=JSON.parse(localStorage.getItem(key));return d||fallback;}catch(e){return fallback;}
  }

  function renderHeroGrid(){
    var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
    if(!cfg)return;
    var data=loadJSON(cfg.heroStorageKey,null);
    if(!data||!data.items||!data.items.length){
      data={columns:3,items:cfg.defaultHeroBoxes.slice()};
    }
    var container=document.getElementById('heroGrid');
    if(!container)return;
    var cols=data.columns||3;
    container.style.gridTemplateColumns='repeat('+cols+',1fr)';
    var html='';
    for(var i=0;i<data.items.length;i++){
      var b=data.items[i];
      html+='<article class="hero-box" data-box-id="'+escHtml(b.id)+'">';
      if(b.image)html+='<img src="'+escHtml(b.image)+'" alt="'+escHtml(b.alt||'')+'">';
      html+='<div class="hero-box-body">';
      if(b.section)html+='<div class="hero-box-section">'+escHtml(b.section)+'</div>';
      if(b.title)html+='<h2>'+escHtml(b.title)+'</h2>';
      if(b.summary)html+='<p>'+escHtml(b.summary)+'</p>';
      html+='</div></article>';
    }
    container.innerHTML=html;
  }

  function renderNewsGrid(){
    var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
    if(!cfg)return;
    var data=loadJSON(cfg.gridStorageKey,null);
    if(!data||!data.items||!data.items.length){
      data={columns:3,items:cfg.defaultGridBoxes.slice()};
    }
    var container=document.getElementById('newsGrid');
    if(!container)return;
    var cols=data.columns||3;
    container.style.gridTemplateColumns='repeat('+cols+',1fr)';
    var html='';
    for(var i=0;i<data.items.length;i++){
      var b=data.items[i];
      html+='<article class="news-box" data-box-id="'+escHtml(b.id)+'">';
      if(b.image)html+='<img src="'+escHtml(b.image)+'" alt="'+escHtml(b.alt||'')+'">';
      html+='<div class="news-box-body">';
      if(b.section)html+='<div class="news-box-section">'+escHtml(b.section)+'</div>';
      if(b.title)html+='<h3>'+escHtml(b.title)+'</h3>';
      if(b.summary)html+='<p>'+escHtml(b.summary)+'</p>';
      html+='</div></article>';
    }
    container.innerHTML=html;
  }

  function applyLayoutTransforms(){
    var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
    if(!cfg)return;
    var layout=loadJSON(cfg.layoutStorageKey,null);
    if(!layout||layout.mode!=='free')return;
    if(layout.sections){
      Object.keys(layout.sections).forEach(function(id){
        var el=document.getElementById(id);
        if(!el)return;
        var s=layout.sections[id];
        el.style.position='relative';
        if(s.x)el.style.left=s.x+'px';
        if(s.y)el.style.top=s.y+'px';
        if(s.width)el.style.width=s.width+'px';
        if(s.height)el.style.height=s.height+'px';
        if(s.z)el.style.zIndex=s.z;
      });
    }
    if(layout.heroBoxes){
      Object.keys(layout.heroBoxes).forEach(function(id){
        var el=document.querySelector('[data-box-id="'+id+'"]');
        if(!el)return;
        var h=layout.heroBoxes[id];
        el.style.position='absolute';
        if(h.x!==undefined)el.style.left=h.x+'px';
        if(h.y!==undefined)el.style.top=h.y+'px';
        if(h.width)el.style.width=h.width+'px';
        if(h.height)el.style.height=h.height+'px';
        if(h.z)el.style.zIndex=h.z;
      });
    }
  }

  function applyContentOverrides(){
    var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
    if(!cfg)return;
    var saved=loadJSON(cfg.storageKey,null);
    if(!saved||Object.keys(saved).length===0)return;
    cfg.fields.forEach(function(f){
      var el=document.querySelector(f[1]);
      var val=saved[f[0]];
      if(!el||val===undefined)return;
      if(f[3]==='image'){
        if(val.src)el.src=val.src;
        if(val.alt!==undefined)el.alt=val.alt;
      }else{
        el.textContent=val;
      }
    });
  }

  function init(){
    applyContentOverrides();
    renderHeroGrid();
    renderNewsGrid();
    applyLayoutTransforms();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();

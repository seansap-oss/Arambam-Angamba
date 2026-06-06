(function(){
  'use strict';

  var AUTH_KEY='aa-admin-auth';
  var PW_HASH='MTIzNA==';
  var MAX_IMAGE_EDGE=1600;

  var currentMode='grid';
  var currentTarget='hero';
  var selectedBoxId=null;
  var selectedFieldType=null;
  var selectedFieldId=null;
  var hasUnsavedChanges=false;
  var pageGuideOn=false;
  var iframeWin=null;
  var iframeDoc=null;
  var dragState=null;

  var loginScreen=document.getElementById('loginScreen');
  var adminApp=document.getElementById('adminApp');
  var loginForm=document.getElementById('loginForm');
  var loginPassword=document.getElementById('loginPassword');
  var loginError=document.getElementById('loginError');
  var statusIndicator=document.getElementById('statusIndicator');
  var statusText=document.getElementById('statusText');
  var gridModeBtn=document.getElementById('gridModeBtn');
  var freeModeBtn=document.getElementById('freeModeBtn');
  var saveBtn=document.getElementById('saveBtn');
  var resetBtn=document.getElementById('resetBtn');
  var logoutBtn=document.getElementById('logoutBtn');
  var previewIframe=document.getElementById('previewIframe');
  var previewFrame=document.getElementById('previewFrame');
  var inspectorBody=document.getElementById('inspectorBody');
  var inspectorEmpty=document.getElementById('inspectorEmpty');
  var inspectorContent=document.getElementById('inspectorContent');
  var inspectorTitle=document.getElementById('inspectorTitle');
  var inspectorHint=document.getElementById('inspectorHint');
  var gridControls=document.getElementById('gridControls');
  var transformPanel=document.getElementById('transformPanel');
  var toastContainer=document.getElementById('toastContainer');

  function init(){
    if(sessionStorage.getItem(AUTH_KEY))showApp();
    loginForm.addEventListener('submit',function(e){
      e.preventDefault();
      if(btoa(loginPassword.value)===PW_HASH){
        sessionStorage.setItem(AUTH_KEY,'1');
        showApp();
      }else{
        loginError.textContent='Incorrect password.';
      }
    });
  }

  function showApp(){
    loginScreen.style.display='none';
    adminApp.style.display='';
    setupIframe();
    setupModeButtons();
    setupViewportButtons();
    setupGridControls();
    setupTransformPanel();
    setupSaveReset();
    setupKeyboard();
    updateModeUI();
  }

  function setupIframe(){
    previewIframe.addEventListener('load',onIframeLoad);
    if(previewIframe.contentDocument||previewIframe.contentWindow.document){
      onIframeLoad();
    }
  }

  function onIframeLoad(){
    try{
      iframeWin=previewIframe.contentWindow;
      iframeDoc=previewIframe.contentDocument||iframeWin.document;
      injectAdminStyles();
      injectClickListeners();
      applyGridData();
      applyLayoutData();
    }catch(e){
      console.warn('iframe access error:',e);
    }
  }

  function injectAdminStyles(){
    if(!iframeDoc||!iframeDoc.head)return;
    if(iframeDoc.getElementById('admin-injected styles'))return;
    var s=iframeDoc.createElement('style');
    s.id='admin-injected-styles';
    s.textContent='[data-text-key],[data-image-key]{outline:1px dashed rgba(59,130,246,.45);outline-offset:2px;cursor:pointer;transition:outline .15s}[data-text-key]:hover,[data-image-key]:hover{outline:2px solid rgba(59,130,246,.7)}.admin-selected{outline:2px solid rgba(37,99,235,.9)!important;outline-offset:2px}.hero-box-selected{outline:2px solid rgba(37,99,235,.9)!important;outline-offset:2px;position:relative}.resize-handle{position:absolute;width:10px;height:10px;background:var(--accent);border:2px solid #fff;border-radius:2px;z-index:999;cursor:pointer}.resize-handle.tl{top:-5px;left:-5px;cursor:nwse-resize}.resize-handle.tr{top:-5px;right:-5px;cursor:nesw-resize}.resize-handle.bl{bottom:-5px;left:-5px;cursor:nesw-resize}.resize-handle.br{bottom:-5px;right:-5px;cursor:nwse-resize}';
    iframeDoc.head.appendChild(s);
  }

  function injectClickListeners(){
    if(!iframeDoc||!iframeDoc.body)return;
    iframeDoc.body.addEventListener('click',function(e){
      var target=e.target;
      if(currentMode==='grid'){
        var box=target.closest('.hero-box,.news-box');
        if(box){
          e.preventDefault();e.stopPropagation();
          var id=box.getAttribute('data-box-id');
          if(id)selectBox(id,box);
          return;
        }
        var editable=target.closest('[data-text-key],[data-image-key]');
        if(editable){
          e.preventDefault();e.stopPropagation();
          selectEditableField(editable);
          return;
        }
        var section=target.closest('.hero-grid-section,.news-grid-section');
        if(section){
          deselectAll();
          return;
        }
      }else{
        var hBox=target.closest('.hero-box');
        if(hBox){
          e.preventDefault();e.stopPropagation();
          var hId=hBox.getAttribute('data-box-id');
          if(hId)selectHeroBox(hId,hBox);
          return;
        }
        var section2=target.closest('.hero-grid-section,.news-grid-section');
        if(section2){
          e.preventDefault();e.stopPropagation();
          selectSection(section2.id,section2);
          return;
        }
        var editable2=target.closest('[data-text-key],[data-image-key]');
        if(editable2){
          e.preventDefault();e.stopPropagation();
          selectEditableField(editable2);
          return;
        }
      }
      deselectAll();
    });
  }

  function deselectAll(){
    if(!iframeDoc)return;
    var sel=iframeDoc.querySelectorAll('.admin-selected,.hero-box-selected');
    for(var i=0;i<sel.length;i++){
      sel[i].classList.remove('admin-selected','hero-box-selected');
      removeResizeHandles(sel[i]);
    }
    selectedBoxId=null;
    selectedFieldType=null;
    selectedFieldId=null;
    showEmptyInspector();
  }

  function selectBox(id,el){
    deselectAll();
    if(!iframeDoc)return;
    el.classList.add('admin-selected');
    selectedBoxId=id;
    selectedFieldType='grid-box';
    renderBoxInspector(id,el);
  }

  function selectHeroBox(id,el){
    deselectAll();
    if(!iframeDoc)return;
    el.classList.add('hero-box-selected');
    selectedBoxId=id;
    selectedFieldType='hero-box';
    addResizeHandles(el);
    showTransformPanel(el);
    renderBoxInspector(id,el);
    startBoxDrag(el,id);
  }

  function selectSection(sectionId,el){
    deselectAll();
    if(!iframeDoc)return;
    el.classList.add('admin-selected');
    selectedBoxId=sectionId;
    selectedFieldType='section';
    showTransformPanel(el);
    inspectorTitle.textContent='Section';
    inspectorHint.textContent=sectionId;
    showSectionInspector(sectionId,el);
  }

  function selectEditableField(el){
    deselectAll();
    if(!iframeDoc)return;
    el.classList.add('admin-selected');
    var fieldKey=el.getAttribute('data-text-key')||el.getAttribute('data-image-key');
    if(!fieldKey)return;
    selectedFieldType='field';
    selectedFieldId=fieldKey;
    renderFieldInspector(fieldKey,el);
  }

  function showEmptyInspector(){
    inspectorEmpty.style.display='';
    inspectorContent.style.display='none';
    transformPanel.style.display='none';
    inspectorTitle.textContent='Content Inspector';
    inspectorHint.textContent='Click an element to edit';
    gridControls.style.display=currentMode==='grid'?'':'none';
  }

  function renderBoxInspector(boxId,el){
    inspectorEmpty.style.display='none';
    inspectorContent.style.display='';
    transformPanel.style.display=currentMode==='free'?'':'none';
    inspectorTitle.textContent='Box Editor';
    inspectorHint.textContent=boxId;

    var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
    var boxes=getCurrentBoxes(cfg);
    var box=findBox(boxes,boxId);
    if(!box){box={id:boxId,section:'',title:'',summary:'',image:'',alt:''};}

    var h='';
    h+='<div class="field-group"><label class="field-label">Section / Category</label>';
    h+='<input type="text" class="field-input" id="boxSection" value="'+esc(box.section)+'" placeholder="e.g. NORTHEAST"></div>';
    h+='<div class="field-group"><label class="field-label">Headline</label>';
    h+='<textarea class="field-input" id="boxTitle" placeholder="Story headline">'+esc(box.title)+'</textarea></div>';
    h+='<div class="field-group"><label class="field-label">Summary</label>';
    h+='<textarea class="field-input" id="boxSummary" placeholder="Article summary">'+esc(box.summary)+'</textarea></div>';
    h+='<div class="field-group"><label class="field-label">Image</label>';
    if(box.image){
      h+='<img class="image-preview" id="boxImgPreview" src="'+esc(box.image)+'" alt="'+esc(box.alt||'')+'">';
    }else{
      h+='<img class="image-preview" id="boxImgPreview" style="display:none">';
    }
    h+='<div class="image-upload-zone" id="boxUploadZone"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
    h+='<span class="image-upload-label">Drop or click to upload<br><small>JPEG, PNG, WebP</small></span>';
    h+='<input type="file" class="image-upload-input" id="boxFileInput" accept="image/jpeg,image/png,image/webp"></div></div>';
    h+='<div class="field-group image-alt-group"><label class="image-alt-label">Alt Text</label>';
    h+='<input type="text" class="field-input" id="boxAlt" value="'+esc(box.alt||'')+'" placeholder="Describe this image"></div>';
    h+='<div class="field-actions">';
    h+='<button class="field-btn field-btn-danger" id="deleteBoxBtn">Delete Box</button>';
    h+='</div>';

    inspectorContent.innerHTML=h;
    setupBoxInspectorListeners(boxId,el);
  }

  function setupBoxInspectorListeners(boxId,el){
    var sectionInput=document.getElementById('boxSection');
    var titleInput=document.getElementById('boxTitle');
    var summaryInput=document.getElementById('boxSummary');
    var altInput=document.getElementById('boxAlt');
    var deleteBtn=document.getElementById('deleteBoxBtn');
    var uploadZone=document.getElementById('boxUploadZone');
    var fileInput=document.getElementById('boxFileInput');

    function updateBox(){
      var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
      var storageKey=currentTarget==='hero'?cfg.heroStorageKey:cfg.gridStorageKey;
      var data=loadJSON(storageKey,{columns:3,items:[]});
      var box=findBox(data.items,boxId);
      if(!box)return;
      box.section=sectionInput.value;
      box.title=titleInput.value;
      box.summary=summaryInput.value;
      box.alt=altInput?altInput.value:box.alt;
      saveJSON(storageKey,data);
      markUnsaved();
      refreshIframe();
    }

    if(sectionInput)sectionInput.addEventListener('input',updateBox);
    if(titleInput)titleInput.addEventListener('input',updateBox);
    if(summaryInput)summaryInput.addEventListener('input',updateBox);
    if(altInput)altInput.addEventListener('input',updateBox);

    if(deleteBtn){
      deleteBtn.addEventListener('click',function(){
        if(!confirm('Delete this box?'))return;
        deleteBox(boxId);
        deselectAll();
        refreshIframe();
        showToast('Box deleted','info');
      });
    }

    if(uploadZone&&fileInput){
      uploadZone.addEventListener('click',function(){fileInput.click()});
      uploadZone.addEventListener('dragover',function(e){e.preventDefault();uploadZone.classList.add('dragover')});
      uploadZone.addEventListener('dragleave',function(){uploadZone.classList.remove('dragover')});
      uploadZone.addEventListener('drop',function(e){
        e.preventDefault();uploadZone.classList.remove('dragover');
        if(e.dataTransfer.files.length>0)processBoxImage(e.dataTransfer.files[0],boxId);
      });
      fileInput.addEventListener('change',function(){
        if(fileInput.files.length>0)processBoxImage(fileInput.files[0],boxId);
      });
    }
  }

  function processBoxImage(file,boxId){
    if(!file.type.match(/^image\/(jpeg|png|webp)$/)){
      showToast('Only JPEG, PNG, WebP accepted.','error');return;
    }
    var reader=new FileReader();
    reader.onload=function(e){
      var img=new Image();
      img.onload=function(){
        var w=img.width,h=img.height;
        if(w>MAX_IMAGE_EDGE||h>MAX_IMAGE_EDGE){
          if(w>h){h=Math.round(h*MAX_IMAGE_EDGE/w);w=MAX_IMAGE_EDGE;}
          else{w=Math.round(w*MAX_IMAGE_EDGE/h);h=MAX_IMAGE_EDGE;}
        }
        var c=document.createElement('canvas');c.width=w;c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        var dataUrl;
        try{dataUrl=c.toDataURL('image/webp',.82);}catch(err){dataUrl=c.toDataURL('image/jpeg',.85);}
        var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
        var storageKey=currentTarget==='hero'?cfg.heroStorageKey:cfg.gridStorageKey;
        var data=loadJSON(storageKey,{columns:3,items:[]});
        var box=findBox(data.items,boxId);
        if(box){box.image=dataUrl;saveJSON(storageKey,data);}
        markUnsaved();
        refreshIframe();
        var preview=document.getElementById('boxImgPreview');
        if(preview){preview.src=dataUrl;preview.style.display='';}
        showToast('Image replaced','success');
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderFieldInspector(fieldKey,el){
    inspectorEmpty.style.display='none';
    inspectorContent.style.display='';
    transformPanel.style.display='none';
    inspectorTitle.textContent='Field Editor';
    inspectorHint.textContent=fieldKey;

    var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
    if(!cfg)return;
    var fieldConfig=null;
    for(var i=0;i<cfg.fields.length;i++){
      if(cfg.fields[i][0]===fieldKey){fieldConfig=cfg.fields[i];break;}
    }
    if(!fieldConfig)return;

    var id=fieldConfig[0];
    var label=fieldConfig[2];
    var type=fieldConfig[3];
    var saved=loadJSON(cfg.storageKey,{});
    var currentValue=saved[id];

    if(type==='image'){
      var src=typeof currentValue==='object'?currentValue.src:(currentValue||el.src||'');
      var alt=typeof currentValue==='object'?currentValue.alt:(currentValue||el.alt||'');
      var h='';
      h+='<div class="field-group"><label class="field-label">Image Preview</label>';
      h+='<img class="image-preview" id="fieldImgPreview" src="'+esc(src)+'" alt="'+esc(alt)+'" onerror="this.style.display=\'none\'">';
      h+='<div class="image-upload-zone" id="fieldUploadZone"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
      h+='<span class="image-upload-label">Drop or click to upload<br><small>JPEG, PNG, WebP — max ~1600px</small></span>';
      h+='<input type="file" class="image-upload-input" id="fieldFileInput" accept="image/jpeg,image/png,image/webp"></div></div>';
      h+='<div class="field-group image-alt-group"><label class="image-alt-label">Alt Text</label>';
      h+='<input type="text" class="field-input" id="fieldAltInput" value="'+esc(alt)+'" placeholder="Describe this image"></div>';
      h+='<div class="field-actions"><button class="field-btn field-btn-primary" id="fieldApplyBtn">Apply</button>';
      h+='<button class="field-btn field-btn-secondary" id="fieldRevertBtn">Revert</button></div>';
      inspectorContent.innerHTML=h;
      setupFieldImageListeners(id,el);
    }else{
      var textValue=typeof currentValue==='object'?currentValue:currentValue;
      if(textValue===undefined||textValue===null)textValue=el.textContent||'';
      var badgeClass=type==='textarea'?'badge-textarea':'badge-text';
      var h2='';
      h2+='<div class="field-group"><label class="field-label">'+esc(label)+'<span class="field-type-badge '+badgeClass+'">'+type+'</span></label>';
      if(type==='textarea'){
        h2+='<textarea class="field-input" id="fieldTextInput" placeholder="Enter content...">'+esc(textValue)+'</textarea>';
      }else{
        h2+='<input type="text" class="field-input" id="fieldTextInput" value="'+esc(textValue)+'" placeholder="Enter text...">';
      }
      h2+='</div><div class="field-actions"><button class="field-btn field-btn-primary" id="fieldApplyBtn">Apply</button>';
      h2+='<button class="field-btn field-btn-secondary" id="fieldRevertBtn">Revert</button></div>';
      inspectorContent.innerHTML=h2;
      setupFieldTextListeners(id,el,type);
    }
  }

  function setupFieldTextListeners(fieldId,el,type){
    var textInput=document.getElementById('fieldTextInput');
    var applyBtn=document.getElementById('fieldApplyBtn');
    var revertBtn=document.getElementById('fieldRevertBtn');
    if(textInput){
      textInput.addEventListener('input',function(){
        el.textContent=textInput.value;
        var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
        if(cfg){var saved=loadJSON(cfg.storageKey,{});saved[fieldId]=textInput.value;saveJSON(cfg.storageKey,saved);}
        markUnsaved();
      });
    }
    if(applyBtn)applyBtn.addEventListener('click',function(){showToast('Applied','success')});
    if(revertBtn)revertBtn.addEventListener('click',function(){
      var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
      if(cfg){var saved=loadJSON(cfg.storageKey,{});delete saved[fieldId];saveJSON(cfg.storageKey,saved);}
      refreshIframe();
      showToast('Reverted','info');
    });
  }

  function setupFieldImageListeners(fieldId,el){
    var uploadZone=document.getElementById('fieldUploadZone');
    var fileInput=document.getElementById('fieldFileInput');
    var altInput=document.getElementById('fieldAltInput');
    var applyBtn=document.getElementById('fieldApplyBtn');
    var revertBtn=document.getElementById('fieldRevertBtn');
    var preview=document.getElementById('fieldImgPreview');

    if(uploadZone&&fileInput){
      uploadZone.addEventListener('click',function(){fileInput.click()});
      uploadZone.addEventListener('dragover',function(e){e.preventDefault();uploadZone.classList.add('dragover')});
      uploadZone.addEventListener('dragleave',function(){uploadZone.classList.remove('dragover')});
      uploadZone.addEventListener('drop',function(e){
        e.preventDefault();uploadZone.classList.remove('dragover');
        if(e.dataTransfer.files.length>0)processFieldImage(e.dataTransfer.files[0],fieldId,el,preview,altInput);
      });
      fileInput.addEventListener('change',function(){
        if(fileInput.files.length>0)processFieldImage(fileInput.files[0],fieldId,el,preview,altInput);
      });
    }
    if(altInput){
      altInput.addEventListener('input',function(){
        el.alt=altInput.value;
        var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
        if(cfg){var saved=loadJSON(cfg.storageKey,{});var v=saved[fieldId]||{src:el.src,alt:''};v.alt=altInput.value;saved[fieldId]=v;saveJSON(cfg.storageKey,saved);}
        markUnsaved();
      });
    }
    if(applyBtn)applyBtn.addEventListener('click',function(){showToast('Applied','success')});
    if(revertBtn)revertBtn.addEventListener('click',function(){
      var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
      if(cfg){var saved=loadJSON(cfg.storageKey,{});delete saved[fieldId];saveJSON(cfg.storageKey,saved);}
      refreshIframe();
      showToast('Reverted','info');
    });
  }

  function processFieldImage(file,fieldId,el,preview,altInput){
    if(!file.type.match(/^image\/(jpeg|png|webp)$/)){showToast('Only JPEG, PNG, WebP accepted.','error');return;}
    var reader=new FileReader();
    reader.onload=function(e){
      var img=new Image();
      img.onload=function(){
        var w=img.width,h=img.height;
        if(w>MAX_IMAGE_EDGE||h>MAX_IMAGE_EDGE){
          if(w>h){h=Math.round(h*MAX_IMAGE_EDGE/w);w=MAX_IMAGE_EDGE;}
          else{w=Math.round(w*MAX_IMAGE_EDGE/h);h=MAX_IMAGE_EDGE;}
        }
        var c=document.createElement('canvas');c.width=w;c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        var dataUrl;
        try{dataUrl=c.toDataURL('image/webp',.82);}catch(err){dataUrl=c.toDataURL('image/jpeg',.85);}
        el.src=dataUrl;
        var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
        if(cfg){
          var saved=loadJSON(cfg.storageKey,{});
          var altVal=altInput?altInput.value:el.alt||'';
          saved[fieldId]={src:dataUrl,alt:altVal};
          try{saveJSON(cfg.storageKey,saved);}catch(e){showToast('Storage may be full.','error');}
        }
        if(preview){preview.src=dataUrl;preview.style.display='';}
        markUnsaved();
        showToast('Image replaced','success');
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function showSectionInspector(sectionId,el){
    inspectorEmpty.style.display='none';
    inspectorContent.style.display='';
    transformPanel.style.display=currentMode==='free'?'':'none';
    var h='<div class="field-group"><label class="field-label">Section ID</label>';
    h+='<input type="text" class="field-input" value="'+esc(sectionId)+'" disabled></div>';
    h+='<div class="field-group"><label class="field-label">Info</label>';
    h+='<p style="font-size:.78rem;color:var(--muted);line-height:1.5">Drag to move or use the transform panel below to set precise coordinates.</p></div>';
    inspectorContent.innerHTML=h;
  }

  function showTransformPanel(el){
    transformPanel.style.display='';
    var rect=el.getBoundingClientRect();
    var iframeRect=previewIframe.getBoundingClientRect();
    var tpX=document.getElementById('tpX');
    var tpY=document.getElementById('tpY');
    var tpW=document.getElementById('tpW');
    var tpH=document.getElementById('tpH');
    var resetTp=document.getElementById('tpResetBtn');

    tpX.value=Math.round(el.offsetLeft||0);
    tpY.value=Math.round(el.offsetTop||0);
    tpW.value=Math.round(el.offsetWidth||rect.width);
    tpH.value=Math.round(el.offsetHeight||rect.height);

    function applyTransform(){
      el.style.position='relative';
      el.style.left=tpX.value+'px';
      el.style.top=tpY.value+'px';
      el.style.width=tpW.value+'px';
      el.style.height=tpH.value+'px';
      saveTransformData();
      markUnsaved();
    }
    tpX.oninput=applyTransform;
    tpY.oninput=applyTransform;
    tpW.oninput=applyTransform;
    tpH.oninput=applyTransform;
    resetTp.onclick=function(){
      el.style.left='';el.style.top='';el.style.width='';el.style.height='';
      tpX.value=0;tpY.value=0;
      tpW.value=Math.round(el.offsetWidth);
      tpH.value=Math.round(el.offsetHeight);
      saveTransformData();
      markUnsaved();
      showToast('Transform reset','info');
    };
  }

  function saveTransformData(){
    var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
    if(!cfg)return;
    var layout=loadJSON(cfg.layoutStorageKey,{mode:'grid',sections:{},heroBoxes:{}});
    layout.mode=currentMode==='free'?'free':'grid';
    if(selectedFieldType==='section'&&selectedBoxId){
      var el=iframeDoc.getElementById(selectedBoxId);
      if(el){
        layout.sections[selectedBoxId]={
          x:parseInt(el.style.left)||0,
          y:parseInt(el.style.top)||0,
          width:el.offsetWidth,
          height:el.offsetHeight,
          z:parseInt(el.style.zIndex)||1
        };
      }
    }else if(selectedFieldType==='hero-box'&&selectedBoxId){
      var el2=iframeDoc.querySelector('[data-box-id="'+selectedBoxId+'"]');
      if(el2){
        layout.heroBoxes[selectedBoxId]={
          x:parseInt(el2.style.left)||0,
          y:parseInt(el2.style.top)||0,
          width:el2.offsetWidth,
          height:el2.offsetHeight,
          z:parseInt(el2.style.zIndex)||1
        };
      }
    }
    saveJSON(cfg.layoutStorageKey,layout);
  }

  function addResizeHandles(el){
    removeResizeHandles(el);
    var corners=['tl','tr','bl','br'];
    for(var i=0;i<corners.length;i++){
      var h=iframeDoc.createElement('div');
      h.className='resize-handle '+corners[i];
      h.setAttribute('data-corner',corners[i]);
      el.appendChild(h);
    }
    setupCornerResize(el);
  }

  function removeResizeHandles(el){
    if(!el)return;
    var handles=el.querySelectorAll('.resize-handle');
    for(var i=0;i<handles.length;i++)handles[i].remove();
  }

  function setupCornerResize(el){
    var handles=el.querySelectorAll('.resize-handle');
    for(var i=0;i<handles.length;i++){
      (function(handle){
        handle.addEventListener('mousedown',function(e){
          e.preventDefault();e.stopPropagation();
          var corner=handle.getAttribute('data-corner');
          var startX=e.clientX,startY=e.clientY;
          var startL=parseInt(el.style.left)||0;
          var startT=parseInt(el.style.top)||0;
          var startW=el.offsetWidth;
          var startH=el.offsetHeight;
          var minSize=100;

          function onMove(ev){
            var dx=ev.clientX-startX;
            var dy=ev.clientY-startY;
            var newL=startL,newT=startT,newW=startW,newH=startH;
            if(corner==='br'){newW=Math.max(minSize,startW+dx);newH=Math.max(minSize,startH+dy);}
            else if(corner==='bl'){newW=Math.max(minSize,startW-dx);newH=Math.max(minSize,startH+dy);newL=startL+dx;}
            else if(corner==='tr'){newW=Math.max(minSize,startW+dx);newH=Math.max(minSize,startH-dy);newT=startT+dy;}
            else if(corner==='tl'){newW=Math.max(minSize,startW-dx);newH=Math.max(minSize,startH-dy);newL=startL+dx;newT=startT+dy;}
            el.style.left=newL+'px';el.style.top=newT+'px';
            el.style.width=newW+'px';el.style.height=newH+'px';
            var tpX=document.getElementById('tpX');
            var tpY=document.getElementById('tpY');
            var tpW=document.getElementById('tpW');
            var tpH=document.getElementById('tpH');
            if(tpX)tpX.value=Math.round(newL);
            if(tpY)tpY.value=Math.round(newT);
            if(tpW)tpW.value=Math.round(newW);
            if(tpH)tpH.value=Math.round(newH);
          }
          function onUp(){
            iframeDoc.removeEventListener('mousemove',onMove);
            iframeDoc.removeEventListener('mouseup',onUp);
            saveTransformData();
            markUnsaved();
          }
          iframeDoc.addEventListener('mousemove',onMove);
          iframeDoc.addEventListener('mouseup',onUp);
        });
      })(handles[i]);
    }
  }

  function startBoxDrag(el,boxId){
    el.style.cursor='move';
    el.addEventListener('mousedown',function(e){
      if(e.target.classList.contains('resize-handle'))return;
      if(!el.classList.contains('hero-box-selected'))return;
      e.preventDefault();
      var startX=e.clientX,startY=e.clientY;
      var startL=parseInt(el.style.left)||0;
      var startT=parseInt(el.style.top)||0;

      function onMove(ev){
        var dx=ev.clientX-startX;
        var dy=ev.clientY-startY;
        el.style.left=(startL+dx)+'px';
        el.style.top=(startT+dy)+'px';
        var tpX=document.getElementById('tpX');
        var tpY=document.getElementById('tpY');
        if(tpX)tpX.value=Math.round(startL+dx);
        if(tpY)tpY.value=Math.round(startT+dy);
      }
      function onUp(){
        iframeDoc.removeEventListener('mousemove',onMove);
        iframeDoc.removeEventListener('mouseup',onUp);
        saveTransformData();
        markUnsaved();
      }
      iframeDoc.addEventListener('mousemove',onMove);
      iframeDoc.addEventListener('mouseup',onUp);
    });
  }

  function setupModeButtons(){
    gridModeBtn.addEventListener('click',function(){setMode('grid')});
    freeModeBtn.addEventListener('click',function(){setMode('free')});
  }

  function setMode(mode){
    currentMode=mode;
    updateModeUI();
    deselectAll();
    refreshIframe();
    showToast(mode==='grid'?'Grid Mode':'Free Transform Mode','info');
  }

  function updateModeUI(){
    gridModeBtn.classList.toggle('active',currentMode==='grid');
    freeModeBtn.classList.toggle('active',currentMode==='free');
    gridControls.style.display=currentMode==='grid'?'':'none';
    if(currentMode==='free'){
      transformPanel.style.display=selectedFieldType?'':'none';
    }else{
      transformPanel.style.display='none';
    }
  }

  function setupViewportButtons(){
    document.querySelectorAll('.vp-btn').forEach(function(btn){
      btn.addEventListener('click',function(){
        document.querySelectorAll('.vp-btn').forEach(function(b){b.classList.remove('active')});
        btn.classList.add('active');
        var view=btn.getAttribute('data-view');
        previewFrame.className='preview-frame';
        if(view==='tablet')previewFrame.classList.add('tablet');
        else if(view==='mobile')previewFrame.classList.add('mobile');
      });
    });
  }

  function setupGridControls(){
    document.querySelectorAll('.target-btn').forEach(function(btn){
      btn.addEventListener('click',function(){
        document.querySelectorAll('.target-btn').forEach(function(b){b.classList.remove('active')});
        btn.classList.add('active');
        currentTarget=btn.getAttribute('data-target');
        updatePresetHighlight();
      });
    });

    document.querySelectorAll('.preset-btn').forEach(function(btn){
      btn.addEventListener('click',function(){
        document.querySelectorAll('.preset-btn').forEach(function(b){b.classList.remove('active')});
        btn.classList.add('active');
        applyPreset(btn.getAttribute('data-preset'));
      });
    });

    document.getElementById('addBoxBtn').addEventListener('click',addNewBox);

    document.getElementById('pageGuideToggle').addEventListener('change',function(){
      pageGuideOn=this.checked;
      var fp=iframeDoc?iframeDoc.body:previewIframe.contentDocument.body;
      if(fp)fp.classList.toggle('page-guide-active',pageGuideOn);
    });
  }

  function updatePresetHighlight(){
    var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
    if(!cfg)return;
    var storageKey=currentTarget==='hero'?cfg.heroStorageKey:cfg.gridStorageKey;
    var data=loadJSON(storageKey,null);
    if(!data)return;
    var cols=data.columns||3;
    var count=data.items?data.items.length:0;
    var presetMap={'2x3':{c:2,n:6},'3x2':{c:3,n:6},'4x3':{c:4,n:12}};
    document.querySelectorAll('.preset-btn').forEach(function(b){
      var p=presetMap[b.getAttribute('data-preset')];
      b.classList.toggle('active',p&&p.c===cols);
    });
  }

  function applyPreset(preset){
    var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
    if(!cfg)return;
    var storageKey=currentTarget==='hero'?cfg.heroStorageKey:cfg.gridStorageKey;
    var defaultKey=currentTarget==='hero'?'defaultHeroBoxes':'defaultGridBoxes';
    var data=loadJSON(storageKey,{columns:3,items:cfg[defaultKey]?cfg[defaultKey].slice():[]});

    var parts=preset.split('x');
    var cols=parseInt(parts[0]);
    var targetCount=cols*parseInt(parts[1]);

    data.columns=cols;
    while(data.items.length<targetCount){
      var id=currentTarget+'-'+(Date.now()+'-'+Math.random().toString(36).substr(2,5));
      data.items.push({id:id,section:'NEW',title:'New headline',summary:'Article summary goes here.',image:'',alt:''});
    }
    while(data.items.length>targetCount){
      data.items.pop();
    }
    saveJSON(storageKey,data);
    markUnsaved();
    refreshIframe();
    showToast('Preset '+preset+' applied','success');
  }

  function addNewBox(){
    var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
    if(!cfg)return;
    var storageKey=currentTarget==='hero'?cfg.heroStorageKey:cfg.gridStorageKey;
    var defaultKey=currentTarget==='hero'?'defaultHeroBoxes':'defaultGridBoxes';
    var data=loadJSON(storageKey,{columns:3,items:cfg[defaultKey]?cfg[defaultKey].slice():[]});
    var id=currentTarget+'-'+(Date.now()+'-'+Math.random().toString(36).substr(2,5));
    data.items.push({id:id,section:'NEW',title:'New headline',summary:'Article summary goes here.',image:'',alt:''});
    saveJSON(storageKey,data);
    markUnsaved();
    refreshIframe();
    showToast('Box added','success');
  }

  function deleteBox(boxId){
    var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
    if(!cfg)return;
    var storageKey=currentTarget==='hero'?cfg.heroStorageKey:cfg.gridStorageKey;
    var data=loadJSON(storageKey,{columns:3,items:[]});
    data.items=data.items.filter(function(b){return b.id!==boxId;});
    saveJSON(storageKey,data);
  }

  function getCurrentBoxes(cfg){
    if(!cfg)return[];
    var storageKey=currentTarget==='hero'?cfg.heroStorageKey:cfg.gridStorageKey;
    var data=loadJSON(storageKey,{columns:3,items:cfg.defaultHeroBoxes?cfg.defaultHeroBoxes.slice():[]});
    return data.items||[];
  }

  function findBox(items,id){
    for(var i=0;i<items.length;i++){if(items[i].id===id)return items[i];}
    return null;
  }

  function applyGridData(){
    if(!iframeDoc||typeof CONTENT_CONFIG==='undefined')return;
    var cfg=CONTENT_CONFIG;
    var heroData=loadJSON(cfg.heroStorageKey,null);
    if(heroData&&heroData.items&&heroData.items.length){
      var heroGrid=iframeDoc.getElementById('heroGrid');
      if(heroGrid){
        heroGrid.style.gridTemplateColumns='repeat('+(heroData.columns||3)+',1fr)';
        heroGrid.innerHTML=renderBoxesHTML(heroData.items,'hero-box');
      }
    }
    var gridData=loadJSON(cfg.gridStorageKey,null);
    if(gridData&&gridData.items&&gridData.items.length){
      var newsGrid=iframeDoc.getElementById('newsGrid');
      if(newsGrid){
        newsGrid.style.gridTemplateColumns='repeat('+(gridData.columns||3)+',1fr)';
        newsGrid.innerHTML=renderBoxesHTML(gridData.items,'news-box');
      }
    }
  }

  function renderBoxesHTML(items,className){
    var h='';
    for(var i=0;i<items.length;i++){
      var b=items[i];
      h+='<article class="'+className+'" data-box-id="'+esc(b.id)+'">';
      if(b.image)h+='<img src="'+esc(b.image)+'" alt="'+esc(b.alt||'')+'">';
      h+='<div class="'+className+'-body">';
      if(b.section)h+='<div class="'+className+'-section">'+esc(b.section)+'</div>';
      if(b.title){
        if(className==='hero-box')h+='<h2>'+esc(b.title)+'</h2>';
        else h+='<h3>'+esc(b.title)+'</h3>';
      }
      if(b.summary)h+='<p>'+esc(b.summary)+'</p>';
      h+='</div></article>';
    }
    return h;
  }

  function applyLayoutData(){
    if(!iframeDoc||typeof CONTENT_CONFIG==='undefined')return;
    var cfg=CONTENT_CONFIG;
    var layout=loadJSON(cfg.layoutStorageKey,null);
    if(!layout)return;
    if(layout.sections){
      Object.keys(layout.sections).forEach(function(id){
        var el=iframeDoc.getElementById(id);
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
        var el=iframeDoc.querySelector('[data-box-id="'+id+'"]');
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
    if(layout.mode==='free'){
      var heroSection=iframeDoc.getElementById('hero-grid-section');
      if(heroSection)heroSection.classList.add('free-transform-section');
    }
  }

  function setupTransformPanel(){}

  function setupSaveReset(){
    saveBtn.addEventListener('click',function(){
      markSaved();
      showToast('All changes saved locally','success');
      refreshIframe();
    });
    resetBtn.addEventListener('click',function(){
      if(!confirm('Reset ALL changes? This removes all saved content, layouts, and grid data.'))return;
      var cfg=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
      if(cfg){
        localStorage.removeItem(cfg.storageKey);
        localStorage.removeItem(cfg.layoutStorageKey);
        localStorage.removeItem(cfg.heroStorageKey);
        localStorage.removeItem(cfg.gridStorageKey);
      }
      markSaved();
      showToast('All data reset','info');
      refreshIframe();
    });
    logoutBtn.addEventListener('click',function(){
      sessionStorage.removeItem(AUTH_KEY);
      adminApp.style.display='none';
      loginScreen.style.display='';
      loginPassword.value='';
      loginError.textContent='';
    });
  }

  function setupKeyboard(){
    document.addEventListener('keydown',function(e){
      if(e.altKey&&e.key==='t'){
        e.preventDefault();
        setMode(currentMode==='grid'?'free':'grid');
      }
    });
  }

  function refreshIframe(){
    var src=previewIframe.src;
    previewIframe.src='';
    setTimeout(function(){previewIframe.src=src;},50);
  }

  function markUnsaved(){
    hasUnsavedChanges=true;
    var dot=statusIndicator.querySelector('.status-dot');
    dot.className='status-dot status-unsaved';
    statusText.textContent='Unsaved changes';
  }

  function markSaved(){
    hasUnsavedChanges=false;
    var dot=statusIndicator.querySelector('.status-dot');
    dot.className='status-dot status-saved';
    statusText.textContent='Saved locally';
  }

  function showToast(msg,type){
    var toast=document.createElement('div');
    toast.className='toast toast-'+(type||'info');
    toast.textContent=msg;
    toastContainer.appendChild(toast);
    setTimeout(function(){
      toast.style.animation='toastOut .3s ease forwards';
      setTimeout(function(){toast.remove()},300);
    },2500);
  }

  function loadJSON(key,fallback){
    try{var d=JSON.parse(localStorage.getItem(key));return d||fallback;}catch(e){return fallback;}
  }

  function saveJSON(key,data){
    try{localStorage.setItem(key,JSON.stringify(data));}catch(e){showToast('Storage full.','error');}
  }

  function esc(s){
    if(typeof s!=='string')return s||'';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  init();
})();

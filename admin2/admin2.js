(function(){
  'use strict';

  var AUTH_KEY='aa-admin2-auth';
  var PW_HASH='MTIzNA==';
  var MAX_IMAGE_EDGE=1600;

  var loginScreen=document.getElementById('loginScreen');
  var adminApp=document.getElementById('adminApp');
  var loginForm=document.getElementById('loginForm');
  var loginPassword=document.getElementById('loginPassword');
  var loginError=document.getElementById('loginError');
  var statusIndicator=document.getElementById('statusIndicator');
  var statusText=document.getElementById('statusText');
  var saveBtn=document.getElementById('saveBtn');
  var resetBtn=document.getElementById('resetBtn');
  var logoutBtn=document.getElementById('logoutBtn');
  var previewIframe=document.getElementById('previewIframe');
  var previewFrame=document.getElementById('previewFrame');
  var previewArea=document.getElementById('previewArea');
  var inspectorBody=document.getElementById('inspectorBody');
  var inspectorHint=document.getElementById('inspectorHint');
  var toastContainer=document.getElementById('toastContainer');

  var selectedFieldId=null;
  var hasUnsavedChanges=false;
  var iframeWin=null;

  function init(){
    if(sessionStorage.getItem(AUTH_KEY)){
      showApp();
    }
    loginForm.addEventListener('submit',function(e){
      e.preventDefault();
      var pw=loginPassword.value;
      if(btoa(pw)===PW_HASH){
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
    waitForIframe();
  }

  function waitForIframe(){
    previewIframe.addEventListener('load',function(){
      try{
        iframeWin=previewIframe.contentWindow;
        var iframeDoc=previewIframe.contentDocument||iframeWin.document;
        injectIframeListeners(iframeDoc);
      }catch(e){
        console.warn('Could not access iframe:',e);
      }
    });
    if(previewIframe.contentDocument||previewIframe.contentWindow.document){
      try{
        iframeWin=previewIframe.contentWindow;
        var iframeDoc=previewIframe.contentDocument||iframeWin.document;
        injectIframeListeners(iframeDoc);
      }catch(e){}
    }
  }

  function injectIframeListeners(iframeDoc){
    if(!iframeDoc||!iframeDoc.body)return;
    iframeDoc.body.addEventListener('click',function(e){
      var target=e.target;
      var editable=target.closest('[data-text-key],[data-image-key]');
      if(editable){
        e.preventDefault();
        e.stopPropagation();
        selectElement(editable,iframeDoc);
      }
    });
    var clickHandler=function(e){
      if(!e.target.closest('[data-text-key],[data-image-key]')){
        deselectAll(iframeDoc);
      }
    };
    iframeDoc.body.addEventListener('click',clickHandler);
    var style=iframeDoc.createElement('style');
    style.textContent='[data-text-key],[data-image-key]{outline:1px dashed rgba(59,130,246,.45);outline-offset:2px;cursor:pointer;transition:outline .15s}[data-text-key]:hover,[data-image-key]:hover{outline:2px solid rgba(59,130,246,.7)}.admin-preview-selected{outline:2px solid rgba(37,99,235,.9)!important;outline-offset:2px}';
    iframeDoc.head.appendChild(style);
  }

  function deselectAll(iframeDoc){
    var selected=iframeDoc.querySelectorAll('.admin-preview-selected');
    for(var i=0;i<selected.length;i++){
      selected[i].classList.remove('admin-preview-selected');
    }
    selectedFieldId=null;
    showEmptyInspector();
  }

  function selectElement(el,iframeDoc){
    var prev=iframeDoc.querySelectorAll('.admin-preview-selected');
    for(var i=0;i<prev.length;i++){
      prev[i].classList.remove('admin-preview-selected');
    }
    el.classList.add('admin-preview-selected');

    var fieldId=el.getAttribute('data-text-key')||el.getAttribute('data-image-key');
    if(!fieldId)return;
    selectedFieldId=fieldId;
    renderInspector(fieldId,el);
  }

  function showEmptyInspector(){
    inspectorBody.innerHTML='<div class="inspector-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px;opacity:.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg><p>No element selected</p><span>Click any text or image in the homepage preview to start editing.</span></div>';
    inspectorHint.textContent='Click an element in the preview to edit';
  }

  function renderInspector(fieldId,el){
    var config=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
    if(!config)return;
    var fieldConfig=null;
    for(var i=0;i<config.fields.length;i++){
      if(config.fields[i][0]===fieldId){
        fieldConfig=config.fields[i];
        break;
      }
    }
    if(!fieldConfig)return;

    var id=fieldConfig[0];
    var selector=fieldConfig[1];
    var label=fieldConfig[2];
    var type=fieldConfig[3];

    var saved=loadSavedContent();
    var currentValue=saved[id];
    if(currentValue===undefined||currentValue===null){
      currentValue=type==='image'?{src:el.src||'',alt:el.alt||''}:el.textContent||'';
    }

    inspectorHint.textContent=label;
    var html='';

    if(type==='image'){
      var src=typeof currentValue==='object'?currentValue.src:currentValue;
      var alt=typeof currentValue==='object'?currentValue.alt:'';
      html+='<div class="field-group">';
      html+='<label class="field-label">Image Preview</label>';
      html+='<img class="image-preview" id="fieldPreview" src="'+escapeHtml(src)+'" alt="'+escapeHtml(alt)+'" onerror="this.style.display=\'none\'">';
      html+='<div class="image-upload-zone" id="uploadZone">';
      html+='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
      html+='<span class="image-upload-label">Drop image or click to upload<br><small>JPEG, PNG, WebP — max ~1600px</small></span>';
      html+='<input type="file" class="image-upload-input" id="imageInput" accept="image/jpeg,image/png,image/webp">';
      html+='</div></div>';
      html+='<div class="field-group image-alt-group">';
      html+='<label class="image-alt-label">Alt Text</label>';
      html+='<input type="text" class="field-input" id="altInput" value="'+escapeHtml(alt)+'" placeholder="Describe this image">';
      html+='</div>';
      html+='<div class="field-actions">';
      html+='<button class="field-btn field-btn-primary" id="applyImageBtn">Apply Image</button>';
      html+='<button class="field-btn field-btn-secondary" id="resetImageBtn">Revert</button>';
      html+='</div>';
    }else{
      var textValue=typeof currentValue==='object'?currentValue:currentValue;
      var badgeClass=type==='textarea'?'badge-textarea':'badge-text';
      html+='<div class="field-group">';
      html+='<label class="field-label">'+label+'<span class="field-type-badge '+badgeClass+'">'+type+'</span></label>';
      if(type==='textarea'){
        html+='<textarea class="field-input" id="textInput" placeholder="Enter content...">'+escapeHtml(textValue)+'</textarea>';
      }else{
        html+='<input type="text" class="field-input" id="textInput" value="'+escapeHtml(textValue)+'" placeholder="Enter text...">';
      }
      html+='</div>';
      html+='<div class="field-actions">';
      html+='<button class="field-btn field-btn-primary" id="applyTextBtn">Apply</button>';
      html+='<button class="field-btn field-btn-secondary" id="resetTextBtn">Revert</button>';
      html+='</div>';
    }

    inspectorBody.innerHTML=html;

    if(type==='image'){
      setupImageControls(id,el);
    }else{
      setupTextControls(id,el,type);
    }
  }

  function setupTextControls(fieldId,el,type){
    var textInput=document.getElementById('textInput');
    var applyBtn=document.getElementById('applyTextBtn');
    var resetBtn2=document.getElementById('resetTextBtn');

    if(textInput){
      textInput.addEventListener('input',function(){
        var value=textInput.value;
        applyValueToElement(el,fieldId,value,type);
        markUnsaved();
      });
    }

    if(applyBtn){
      applyBtn.addEventListener('click',function(){
        var value=textInput.value;
        applyValueToElement(el,fieldId,value,type);
        markUnsaved();
        showToast('Content updated','success');
      });
    }

    if(resetBtn2){
      resetBtn2.addEventListener('click',function(){
        var config=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
        if(!config)return;
        var fieldConfig=null;
        for(var i=0;i<config.fields.length;i++){
          if(config.fields[i][0]===fieldId){
            fieldConfig=config.fields[i];
            break;
          }
        }
        if(!fieldConfig)return;
        var original=el.getAttribute('data-original-'+(el.hasAttribute('data-text-key')?'text':'image'));
        if(original!==null){
          applyValueToElement(el,fieldId,original,type);
        }
        var saved=loadSavedContent();
        delete saved[fieldId];
        saveSavedContent(saved);
        renderInspector(fieldId,el);
        markUnsaved();
        showToast('Reverted to original','info');
      });
    }
  }

  function setupImageControls(fieldId,el){
    var uploadZone=document.getElementById('uploadZone');
    var imageInput=document.getElementById('imageInput');
    var altInput=document.getElementById('altInput');
    var applyBtn=document.getElementById('applyImageBtn');
    var resetBtn2=document.getElementById('resetImageBtn');
    var preview=document.getElementById('fieldPreview');

    if(uploadZone&&imageInput){
      uploadZone.addEventListener('click',function(){imageInput.click()});
      uploadZone.addEventListener('dragover',function(e){e.preventDefault();uploadZone.classList.add('dragover')});
      uploadZone.addEventListener('dragleave',function(){uploadZone.classList.remove('dragover')});
      uploadZone.addEventListener('drop',function(e){
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if(e.dataTransfer.files.length>0){
          processImageFile(e.dataTransfer.files[0],fieldId,el,preview,altInput);
        }
      });
      imageInput.addEventListener('change',function(){
        if(imageInput.files.length>0){
          processImageFile(imageInput.files[0],fieldId,el,preview,altInput);
        }
      });
    }

    if(applyBtn){
      applyBtn.addEventListener('click',function(){
        var saved=loadSavedContent();
        var current=saved[fieldId]||{src:el.src,alt:el.alt};
        current.alt=altInput?altInput.value:el.alt;
        saved[fieldId]=current;
        saveSavedContent(saved);
        el.src=current.src;
        el.alt=current.alt;
        markUnsaved();
        showToast('Image updated','success');
      });
    }

    if(resetBtn2){
      resetBtn2.addEventListener('click',function(){
        var saved=loadSavedContent();
        delete saved[fieldId];
        saveSavedContent(saved);
        var original=el.getAttribute('data-original-image');
        if(original){
          var o=JSON.parse(original);
          el.src=o.src;
          el.alt=o.alt;
        }
        renderInspector(fieldId,el);
        markUnsaved();
        showToast('Image reverted','info');
      });
    }

    if(altInput){
      altInput.addEventListener('input',function(){
        var saved=loadSavedContent();
        var current=saved[fieldId]||{src:el.src,alt:el.alt};
        current.alt=altInput.value;
        saved[fieldId]=current;
        saveSavedContent(saved);
        el.alt=altInput.value;
        markUnsaved();
      });
    }
  }

  function processImageFile(file,fieldId,el,preview,altInput){
    if(!file.type.match(/^image\/(jpeg|png|webp)$/)){
      showToast('Only JPEG, PNG, and WebP files are accepted.','error');
      return;
    }
    if(file.size>20*1024*1024){
      showToast('File too large. Maximum 20MB.','error');
      return;
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
        var c=document.createElement('canvas');
        c.width=w;c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        var dataUrl;
        try{
          dataUrl=c.toDataURL('image/webp',.82);
        }catch(err){
          dataUrl=c.toDataURL('image/jpeg',.85);
        }
        var saved=loadSavedContent();
        var altVal=altInput?altInput.value:el.alt||'';
        saved[fieldId]={src:dataUrl,alt:altVal};
        try{
          saveSavedContent(saved);
        }catch(storageErr){
          showToast('Warning: Browser storage may be full. Image saved in memory only.','error');
        }
        el.src=dataUrl;
        if(altInput)el.alt=altVal;
        if(preview){preview.src=dataUrl;preview.style.display='';}
        markUnsaved();
        showToast('Image replaced','success');
      };
      img.onerror=function(){showToast('Failed to process image.','error')};
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function applyValueToElement(el,fieldId,value,type){
    var config=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
    var fieldType=type;
    if(!fieldType&&config){
      for(var i=0;i<config.fields.length;i++){
        if(config.fields[i][0]===fieldId){
          fieldType=config.fields[i][3];
          break;
        }
      }
    }
    if(fieldType==='image'&&typeof value==='object'){
      el.src=value.src;
      el.alt=value.alt;
    }else{
      el.textContent=value;
    }
    var saved=loadSavedContent();
    saved[fieldId]=value;
    saveSavedContent(saved);
  }

  function loadSavedContent(){
    var config=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
    if(!config)return{};
    try{return JSON.parse(localStorage.getItem(config.storageKey))||{};}
    catch(e){return{};}
  }

  function saveSavedContent(data){
    var config=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
    if(!config)return;
    try{localStorage.setItem(config.storageKey,JSON.stringify(data));}
    catch(e){showToast('Storage full. Changes may not persist.','error');}
  }

  function markUnsaved(){
    hasUnsavedChanges=true;
    updateStatus(false);
  }

  function markSaved(){
    hasUnsavedChanges=false;
    updateStatus(true);
  }

  function updateStatus(saved){
    var dot=statusIndicator.querySelector('.status-dot');
    if(saved){
      dot.className='status-dot status-saved';
      statusText.textContent='Saved locally';
    }else{
      dot.className='status-dot status-unsaved';
      statusText.textContent='Unsaved changes';
    }
  }

  saveBtn.addEventListener('click',function(){
    markSaved();
    showToast('Homepage content saved locally','success');
    reloadIframe();
  });

  resetBtn.addEventListener('click',function(){
    if(!confirm('Reset all homepage content to original defaults? This cannot be undone.'))return;
    var config=typeof CONTENT_CONFIG!=='undefined'?CONTENT_CONFIG:null;
    if(config){
      localStorage.removeItem(config.storageKey);
    }
    markSaved();
    showToast('Content reset to defaults','info');
    reloadIframe();
    setTimeout(function(){
      try{
        iframeWin=previewIframe.contentWindow;
        var iframeDoc=previewIframe.contentDocument||iframeWin.document;
        injectIframeListeners(iframeDoc);
      }catch(e){}
    },500);
  });

  logoutBtn.addEventListener('click',function(){
    sessionStorage.removeItem(AUTH_KEY);
    adminApp.style.display='none';
    loginScreen.style.display='';
    loginPassword.value='';
    loginError.textContent='';
  });

  function reloadIframe(){
    var src=previewIframe.src;
    previewIframe.src='';
    setTimeout(function(){previewIframe.src=src;},50);
  }

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

  function escapeHtml(str){
    if(typeof str!=='string')return str;
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  init();
})();

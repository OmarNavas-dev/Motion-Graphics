// Vista previa fiel: usa el mismo HTML que HyperFrames y añade un reproductor propio.
import {exportHyperframesProject} from './src/hyperframes-bridge.mjs';
import {collectProjectAssets} from './src/project-assets.mjs';

const PLAYER_CSS = `
#ms-bar{position:fixed;left:0;right:0;bottom:0;height:56px;display:flex;align-items:center;gap:14px;padding:0 18px;background:#12151fe6;color:#fff;font:600 14px Arial,Helvetica,sans-serif;z-index:99999}
#ms-bar button{width:38px;height:38px;border:0;border-radius:50%;background:#ffcf5a;color:#1a1230;font-size:16px;font-weight:900;cursor:pointer}
#ms-bar input{flex:1;accent-color:#ffcf5a}#ms-bar span{min-width:92px;text-align:right;font-variant-numeric:tabular-nums}
#ms-note{position:fixed;top:8px;right:12px;color:#ffffff99;font:12px Arial,Helvetica,sans-serif;z-index:99999}
@media(max-width:400px){#ms-bar{gap:6px;padding:0 6px;font-size:10px}#ms-bar button{width:30px;height:30px;flex-shrink:0}#ms-bar input{min-width:0}#ms-bar span{min-width:68px}#ms-note{display:none}}`;

// Reproductor: sustituye al runtime de HyperFrames solo en esta vista previa.
const PLAYER_JS = `(function(){
  var tl=window.__timelines&&window.__timelines['motion-studio-7'];
  var stage=document.getElementById('stage')||document.querySelector('.clip')?.parentElement;
  if(!tl||!stage){document.body.innerHTML='<div style="color:white;font:20px Arial;padding:32px">Proyecto vacío: importa un JSON o crea una escena para ver la vista previa.</div>';return;}
  var total=tl.duration();
  document.documentElement.style.background='#080a10';document.body.style.cssText+=';margin:0;overflow:hidden;background:#080a10';
  var bar=document.createElement('div');bar.id='ms-bar';
  bar.innerHTML='<button id="ms-play" aria-label="Reproducir">&#9654;</button><input id="ms-seek" type="range" min="0" max="'+Math.round(total*100)+'" value="0"><span id="ms-time">0:00 / 0:00</span>';
  document.body.appendChild(bar);
  var note=document.createElement('div');note.id='ms-note';note.textContent='Vista previa fiel (mismo HTML que HyperFrames)';document.body.appendChild(note);
  var btn=document.getElementById('ms-play'),seek=document.getElementById('ms-seek'),label=document.getElementById('ms-time');
  var w=stage.offsetWidth||720,h=stage.offsetHeight||1280;
  function fmt(t){var m=Math.floor(t/60),s=Math.floor(t%60);return m+':'+(s<10?'0':'')+s;}
  function fit(){var k=Math.min(innerWidth/w,(innerHeight-56)/h);stage.style.position='absolute';stage.style.transformOrigin='top left';stage.style.transform='scale('+k+')';stage.style.left=Math.max(0,(innerWidth-w*k)/2)+'px';stage.style.top='0px';}
  function sync(playing){
    var t=tl.time();
    var visibleTime=Math.min(t,Math.max(0,total-.001));
    document.querySelectorAll('.clip').forEach(function(c){var s=+c.dataset.start||0,d=+c.dataset.duration||0;c.style.display=(visibleTime>=s&&visibleTime<s+d)?'':'none';});
    document.querySelectorAll('audio,video').forEach(function(m){
      var s=+m.dataset.start||0,d=+m.dataset.duration||1e9,local=t-s;
      if(m.dataset.volume!==undefined&&m.tagName==='AUDIO'){m.volume=Math.max(0,Math.min(1,+m.dataset.volume));}
      if(local>=0&&local<d){
        if(Math.abs(m.currentTime-local)>.35)m.currentTime=local;
        if(playing&&m.paused)m.play().catch(function(){});
        if(!playing&&!m.paused)m.pause();
      }else if(!m.paused)m.pause();
    });
    seek.value=Math.round(t*100);label.textContent=fmt(t)+' / '+fmt(total);
    if(parent!==window)parent.postMessage({type:'ms-preview-state',seconds:t,playing:playing},'*');
  }
  tl.eventCallback('onUpdate',function(){sync(!tl.paused());});
  tl.eventCallback('onComplete',function(){btn.innerHTML='&#9654;';sync(false);});
  btn.onclick=function(){if(tl.paused()){if(tl.time()>=total-.05)tl.time(0);tl.play();btn.innerHTML='&#10074;&#10074;';}else{tl.pause();btn.innerHTML='&#9654;';sync(false);}};
  seek.oninput=function(){tl.pause();btn.innerHTML='&#9654;';tl.time(+seek.value/100);sync(false);};
  window.addEventListener('message',function(event){
    if(event.source!==parent||event.data?.type!=='ms-preview-seek'||!Number.isFinite(event.data.seconds))return;
    tl.pause();btn.innerHTML='&#9654;';tl.time(Math.max(0,Math.min(total,event.data.seconds)));sync(false);
  });
  window.addEventListener('resize',fit);fit();tl.pause();tl.time(0);sync(false);
})();`;

export function previewAssetMap(project) {
  const map = {};
  for (const asset of collectProjectAssets(project)) map[asset] = `/${asset}`;
  return map;
}

export function buildPreviewHtml(project, gsapSource) {
  const html = exportHyperframesProject(project, undefined, gsapSource, previewAssetMap(project));
  const injection = `<style>${PLAYER_CSS}</style><script>${PLAYER_JS}</script>`;
  return html.includes('</body>') ? html.replace('</body>', `${injection}</body>`) : html + injection;
}

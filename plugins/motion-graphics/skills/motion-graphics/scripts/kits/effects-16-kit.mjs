// 16 independent, executable SVG/GSAP effects for Motion Studio authoring.
// Every target is scene-local, every animation uses tl/T0, no autonomous clock.
import {createScene,n} from './scene-kit.mjs';
import {getEffect} from '../effect-recipes.mjs';

const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const box=(cls,x,y,w,h,fill,r=20)=>`<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
const txt=(cls,text,x,y,size,color='#f4f5ff')=>`<text class="${cls}" x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="700">${esc(text)}</text>`;

export function buildEffectScene(effectId, {id='effect',duration=4,accent='#53e3c7',background='#0b1530',label='EXPLICACIÓN'}={}){
  if(!getEffect(effectId))throw Error('Efecto desconocido: '+effectId);
  if(!/^#[\da-f]{6}$/i.test(accent)||!/^#[\da-f]{6}$/i.test(background))throw Error('Colores HEX inválidos');
  const s=createScene({id,duration,bg:background}), t=n(duration*.3), start=n(duration*.08), settle=n(duration*.58);
  const action=(selector,from,to,at=start,seconds=t)=>{
    s.js(`tl.fromTo(S+' .${selector}',${JSON.stringify(from)},${JSON.stringify({...to,duration:Number(seconds),ease:'power2.inOut',immediateRender:false})},T0+${at});`);
    s.touch(Number(at)+Number(seconds));
  };
  const setup=(selector,attrs)=>s.js(`tl.set(S+' .${selector}',${JSON.stringify(attrs)},T0);`);
  const pulse=(selector,scale=1.08)=>action(selector,{scale:1,transformOrigin:'center center'},{scale,transformOrigin:'center center',yoyo:true,repeat:1},start,n(duration*.16));
  s.add('bg',box('backplate',70,305,580,570,'#132342',32));
  const card=(name,x,y,w,h)=>s.add('mid',box(name,x,y,w,h,'#213656',18));
  const title=(name,text,x=145,y=425,size=44)=>s.add('fg',txt(name,text,x,y,size));
  switch(effectId){
    case 'button-player':
      card('body',195,520,330,180);title('caption','▶',338,625,58);title('detail','REPRODUCIR',270,735,27);
      action('body',{scaleX:.35,scaleY:.36,transformOrigin:'center center'},{scaleX:1,scaleY:1,transformOrigin:'center center'});
      action('caption',{scale:.3,opacity:0,transformOrigin:'center center'},{scale:1,opacity:1,transformOrigin:'center center'},n(duration*.16)); break;
    case 'search-results':
      card('search',126,404,467,90);title('query',label,160,464,28);
      for(let i=0;i<3;i++){card('result'+i,150,535+i*95,420,65);title('item'+i,'RESULTADO '+(i+1),170,575+i*95,21);
        action('result'+i,{opacity:0,y:-20},{opacity:1,y:0},n(duration*(.13+.1*i)),n(duration*.15));
        action('item'+i,{opacity:0},{opacity:1},n(duration*(.17+.1*i)),n(duration*.14));}
      pulse('search');break;
    case 'card-workspace':
      card('workspace',110,365,500,475);title('pane',label,154,420,30);
      for(let i=0;i<3;i++)card('column'+i,143+i*146,475,128,304);
      action('workspace',{scale:.32,transformOrigin:'center center'},{scale:1,transformOrigin:'center center'});
      for(let i=0;i<3;i++)action('column'+i,{opacity:0,y:30},{opacity:1,y:0},n(duration*(.25+i*.06)),n(duration*.16));break;
    case 'tabs-panels':
      for(let i=0;i<3;i++)card('tab'+i,140+i*150,385,135,65);
      card('panel',130,483,460,318);title('panelText',label,175,636,36);
      action('panel',{scaleY:.18,transformOrigin:'center top',opacity:.2},{scaleY:1,opacity:1,transformOrigin:'center top'});
      action('tab1',{fill:'#213656'},{fill:accent},start,t);break;
    case 'chart-morph':
      s.add('mid',`<path d="M140 780 H587" stroke="#94a7ca" stroke-width="4"/>`);
      for(const [i,h] of [110,210,150,290].entries()){
        s.add('mid',box('bar'+i,157+i*110,780-h,62,h,accent,8));
        action('bar'+i,{scaleY:.25,transformOrigin:'center bottom'},{scaleY:[1.6,.83,1.55,.7][i],transformOrigin:'center bottom'},n(duration*(.07+i*.045)),n(duration*.31));
      }break;
    case 'dashboard-zoom':
      card('dashboard',103,360,514,465);
      for(let i=0;i<4;i++)card('kpi'+i,134+(i%2)*234,400+Math.floor(i/2)*190,210,160);
      title('value','+24%',190,492,48);action('dashboard',{scale:1,transformOrigin:'center center'},{scale:1.28,x:-42,y:55,transformOrigin:'center center'},start,t);
      action('value',{scale:1,transformOrigin:'center center'},{scale:1.22,transformOrigin:'center center'},start,t);break;
    case 'spring-stack':
      for(let i=0;i<3;i++){
        card('stack'+i,144,480+i*100,428,88);
        title('stackLabel'+i,'ETAPA '+(i+1),175,536+i*100,27);
        action('stack'+i,{x:((i%2)?300:-300),opacity:0},{x:0,opacity:1,ease:'back.out(1.4)'},n(duration*(.07+i*.12)),n(duration*.22));
        action('stackLabel'+i,{opacity:0},{opacity:1},n(duration*(.13+i*.12)),n(duration*.14));
      }break;
    case 'magnetic-dock':
      for(let i=0;i<4;i++){
        s.add('mid',`<circle class="dock${i}" cx="${196+i*108}" cy="650" r="41" fill="${accent}"/>`);
        action('dock'+i,{x:(i-1.5)*65,y:-180+(i%2)*280,scale:.55,transformOrigin:'center center'},{x:0,y:0,scale:1,transformOrigin:'center center',ease:'back.out(1.2)'},n(duration*(.08+i*.055)),n(duration*.27));
      }break;
    case 'masked-type':
      s.defs('mask',`<clipPath id="${s.gid('textmask')}"><rect x="120" y="528" width="500" height="130"/></clipPath>`);
      s.add('fg',`<g clip-path="${s.url('textmask')}">${txt('masked',label,145,620,42)}</g>`);
      action('masked',{y:125,opacity:.2},{y:0,opacity:1});break;
    case 'elastic-type':
      title('elastic',label,145,620,45);
      action('elastic',{scaleX:.4,scaleY:1.65,transformOrigin:'center center'},{scaleX:1,scaleY:1,transformOrigin:'center center',ease:'elastic.out(1,.5)'},start,n(duration*.48));break;
    case 'text-layout':
      title('heading',label,143,450,38);
      for(let i=0;i<3;i++){card('layout'+i,144+i*145,525,127,255);action('layout'+i,{scaleY:.03,opacity:0,transformOrigin:'center top'},{scaleY:1,opacity:1,transformOrigin:'center top'},n(duration*(.16+i*.07)),n(duration*.23));}
      action('heading',{y:120},{y:0});break;
    case 'image-reveal':
      s.defs('reveal',`<clipPath id="${s.gid('reveal')}"><rect class="revealMask" x="125" y="377" width="490" height="0"/></clipPath>`);
      s.add('mid',`<g clip-path="${s.url('reveal')}"><circle cx="360" cy="600" r="210" fill="${accent}"/><path d="M150 720 L285 505 L375 648 L475 440 L590 720Z" fill="#ffda91"/></g>`);
      action('revealMask',{attr:{height:0}},{attr:{height:440}});break;
    case 'perspective-shift':
      for(let i=0;i<3;i++){card('depth'+i,170+i*37,425+i*88,335,190);action('depth'+i,{x:0,y:0,scale:1,opacity:.8,transformOrigin:'center center'},{x:(i-1)*72,y:(i-1)*56,scale:1+(i-1)*.14,opacity:1,transformOrigin:'center center'},start,t);}
      break;
    case 'glass-focus':
      for(let i=0;i<3;i++)card('glass'+i,133+i*154,495,140,263);
      s.add('fg',`<rect class="lens" x="270" y="480" width="180" height="300" rx="25" stroke="${accent}" stroke-width="8" fill="#ffffff" fill-opacity=".12"/>`);
      action('lens',{x:-145,opacity:0},{x:0,opacity:1});action('glass0',{opacity:1},{opacity:.25},start,t);action('glass2',{opacity:1},{opacity:.25},start,t);break;
    case 'flowing-paths':
      s.add('mid',`<path class="flowPath" d="M140 640 C300 640 300 490 570 460 M140 640 C300 640 300 790 570 800" stroke="${accent}" stroke-width="9" fill="none" stroke-linecap="round"/>`);
      for(const [i,y] of [460,800].entries()){
        s.add('fg',`<circle class="packet${i}" cx="140" cy="640" r="24" fill="#fff"/>`);
        action('packet'+i,{x:0,y:0,opacity:0},{x:430,y:y-640,opacity:1},n(duration*(.1+i*.07)),n(duration*.34));
      }break;
    case 'particle-logo':
      s.add('fg',txt('mark',label,188,655,38,accent));
      for(let i=0;i<28;i++){
        const x=155+(i%7)*65,y=495+Math.floor(i/7)*74;
        s.add('mid',`<circle class="particle${i}" cx="${x}" cy="${y}" r="5" fill="${accent}"/>`);
        action('particle'+i,{x:((i*67)%380)-190,y:((i*43)%360)-180,opacity:0},{x:0,y:0,opacity:1},n(duration*(.05+(i%7)*.013)),n(duration*.34));
      }action('mark',{opacity:0,scale:.85,transformOrigin:'center center'},{opacity:1,scale:1,transformOrigin:'center center'},n(duration*.28),n(duration*.23));break;
  }
  // All sixteen effect scenes have actual geometry and timeline code.
  s.add('hud',`<rect x="130" y="900" width="460" height="5" rx="3" fill="${accent}" opacity=".6"/>`);
  return s.build({scriptExcerpt:''});
}

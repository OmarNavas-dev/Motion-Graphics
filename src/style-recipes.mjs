// P3: declarative compositions shared by the authoring plugin and both renderers.
// Original guides remain authoritative for editorial intent, reference footage and art direction.
// This module implements their executable layout / motion vocabulary without remote media.
import {STYLE_PRESET_IDS} from './motion-capabilities.mjs';

const definitions={
 'paper-world':{name:'Cut-paper world',background:'#F2E8D5',ink:'#2B2B2B',accent:'#D98C7A',secondary:'#9CB49A',family:'landscape',signature:'stacked-cut-sheets',motion:'layered-landings-parallax',type:'none',noText:true},
 'ink-line':{name:'One ink line',background:'#F4EFE6',ink:'#1C1C1C',accent:'#D23C2A',secondary:'#E8DCC6',family:'ink',signature:'single-brush-path-seal',motion:'continuous-draw',type:'none',noText:true},
 'weather-widget':{name:'One widget, every sky',background:'#233B65',ink:'#FFFFFF',accent:'#FFC94A',secondary:'#7189BB',family:'weather',signature:'one-morphing-weather-card',motion:'continuous-daylight',type:'sans'},
 'data-story':{name:'Where viewers leave',background:'#FFF1E5',ink:'#1A1A1A',accent:'#0F5499',secondary:'#C8B9AA',family:'charts',signature:'newspaper-single-blue-truth',motion:'chart-reveal',type:'editorial'},
 'swiss-kinetic':{name:'Swiss kinetic type',background:'#F1EEE6',ink:'#111111',accent:'#E63022',secondary:'#D4CEC2',family:'kinetic',signature:'type-and-persistent-red-dot',motion:'beat-locked-type',type:'impact'},
 'particle-field':{name:'Ten thousand points',background:'#0A0F1C',ink:'#DFE8F4',accent:'#6FD3E8',secondary:'#273C55',family:'particles',signature:'condensing-point-field',motion:'seeded-particles',type:'none',noText:true},
 'growing-city':{name:'A city that grows',background:'#BFE3E0',ink:'#27454B',accent:'#F27D72',secondary:'#91B9AB',family:'city',signature:'toy-city-rise-and-dusk',motion:'staggered-build',type:'none',noText:true},
 'explainer-diagram':{name:'How an AI makes a video',background:'#FFFFFF',ink:'#14213D',accent:'#2B7EF9',secondary:'#E2E2E8',family:'diagram',signature:'living-system-packets',motion:'flow-by-node',type:'sans'},
 'time-travel':{name:'30,000 years in 15 seconds',background:'#15120F',ink:'#F3EEE4',accent:'#D8AA60',secondary:'#6D5541',family:'timeline',signature:'single-continuous-time-axis',motion:'lateral-era-travel',type:'serif'},
 'editor-ui':{name:'Edited in a pro editor',background:'#0A0A0B',ink:'#EDEDED',accent:'#D97757',secondary:'#232323',family:'editor',signature:'panels-timeline-and-cursor',motion:'keyframed-interface-edit',type:'sans'},
 'motion-app-ui':{name:'Animated in a motion app',background:'#0A0A0B',ink:'#EDEDED',accent:'#D97757',secondary:'#242424',family:'motion-app',signature:'bezier-curve-and-keyframes',motion:'interpolated-playhead',type:'sans'},
 'design-app-ui':{name:'A thumbnail, designed',background:'#EAEAE7',ink:'#1F1F1F',accent:'#D97757',secondary:'#CFCFCA',family:'design-app',signature:'artboard-guides-selection',motion:'layout-build',type:'sans'},
 'audio-app-ui':{name:'Scored in a music app',background:'#0A0A0B',ink:'#E2E2E2',accent:'#D97757',secondary:'#252525',family:'audio-app',signature:'multitrack-piano-roll',motion:'beat-playhead',type:'mono'},
 'swiss-grid':{name:'Swiss Grid',background:'#FFFFFF',ink:'#111111',accent:'#E4002B',secondary:'#DBDBDB',family:'swiss',signature:'rational-grid-and-red-rule',motion:'precise-grid-reveal',type:'impact'},
 'editorial-paper':{name:'Editorial Paper',background:'#FFF1E5',ink:'#1A1A1A',accent:'#0F5499',secondary:'#CEBDB0',family:'newspaper',signature:'newspaper-columns-and-focal-chart',motion:'ink-and-bar-reveal',type:'serif'},
 'midnight-grid':{name:'Midnight Grid',background:'#0B1220',ink:'#E8EDF7',accent:'#3D8BFF',secondary:'#1C304C',family:'network',signature:'dark-dot-grid-active-node',motion:'packet-travel',type:'mono'},
 'paper-cut':{name:'Paper Cut',background:'#F2E8D5',ink:'#2B2B2B',accent:'#D98C7A',secondary:'#9CB49A',family:'pop-up',signature:'layered-book-page-and-sun',motion:'paper-depth-and-soft-drift',type:'none',noText:true},
 'risograph':{name:'Risograph',background:'#F5F0E6',ink:'#0078BF',accent:'#FF48B0',secondary:'#0078BF',family:'print',signature:'two-ink-misregistration',motion:'staggered-print-overprint',type:'impact'},
 'blueprint':{name:'Blueprint',background:'#0E3A66',ink:'#EAF3FC',accent:'#FFD23F',secondary:'#3D6385',family:'technical',signature:'technical-wireframe-dimensions',motion:'drafting-lines',type:'mono'},
 'graphite-ui':{name:'Graphite UI',background:'#0E0F12',ink:'#ECEDEF',accent:'#3DD68C',secondary:'#252931',family:'graphite',signature:'graphite-window-green-done',motion:'quiet-feature-reveal',type:'sans'},
 'poster-pop':{name:'Poster Pop',background:'#FFD400',ink:'#111111',accent:'#111111',secondary:'#FFFFFF',family:'poster',signature:'oversized-black-type-knockout',motion:'hard-impact-cuts',type:'impact'},
};

export const STYLE_RECIPE_IDS=Object.freeze([...STYLE_PRESET_IDS]);
if(STYLE_RECIPE_IDS.some(id=>!definitions[id]) || Object.keys(definitions).length!==STYLE_RECIPE_IDS.length)
 throw Error('P3: recetas y catálogo de 21 estilos no coinciden.');
export function getExecutableStyle(id){
 if(!Object.hasOwn(definitions,id))throw Error('P3: estilo desconocido: '+id);
 return {id,...definitions[id]};
}
export function listExecutableStyles(){return STYLE_RECIPE_IDS.map(getExecutableStyle);}

export function createStyleComposition(styleId,{title='',duration=4,format='horizontal',brandProfile}={}){
 const profile=getExecutableStyle(styleId);
 if(!Number.isFinite(duration)||duration<.5||duration>60)throw Error('P3: duración de estilo inválida.');
 const {family}=profile;
 const p={...profile,...(brandProfile?.colors||{})};
 const heightRatio=format==='vertical'?1280/720:720/1280;
 const toH=value=>Math.round(value*heightRatio*1000)/1000;
 const layers=[];let counter=0;
 const at=(index,step=.09)=>Math.min(duration*.55,Math.max(0.01,index*step));
 const append=(type,tag,x,y,w,h,opts={})=>{
   const obj={id:'p3-'+styleId.replace(/-/g,'')+'-'+(++counter)+'-'+tag,type,x,y,width:w,height:toH(h),
     enter:{preset:'fade',at:0.01},...opts};
   layers.push(obj);return obj;
 };
 const box=(tag,x,y,w,h,fill,opts={})=>append('shape',tag,x,y,w,h,{fill,...opts});
 const circ=(tag,x,y,w,h,fill,opts={})=>box(tag,x,y,w,h,fill,{shape:'circle',...opts});
 const text=(tag,value,x,y,w,h,size=5,color=p.ink,opts={})=>append('text',tag,x,y,w,h,{text:String(value).slice(0,68),size,color,
   font:p.type==='serif'?'serif':p.type==='mono'?'mono':p.type==='impact'?'impact':'sansbold',weight:800,...opts});
 const path=(tag,d,x,y,w,h,stroke=p.ink,opts={})=>append('path',tag,x,y,w,h,{path:d,stroke,strokeWidth:2,fill:'none',...opts});
 const particles=(tag,x,y,w,h,fill,count=45,opts={})=>append('particles',tag,x,y,w,h,{fill,
   particles:{kind:'dots',count,speed:.45,size:.45,seed:17+counter},...opts});
 const grid=(color=p.secondary,cols=10,rows=6,opacity=.35)=>{
   for(let i=1;i<cols;i++)box('gridv',i*100/cols,50,.09,100,color,{opacity,enter:{preset:'fade',at:0}});
   for(let j=1;j<rows;j++)box('gridh',50,j*100/rows,100,.12,color,{opacity,enter:{preset:'fade',at:0}});
 };
 const caption=String(title||profile.name).replace(/[<>]/g,'').slice(0,42);
 const headline=caption.length>28?caption.slice(0,27)+'…':caption;
 const cam={from:{x:0,y:0,zoom:1,rotate:0},to:{x:0,y:0,zoom:1.035,rotate:0}};
 const background={color:p.background};
 const grade={grain:['landscape','ink','print','pop-up','newspaper','charts','kinetic'].includes(family)?.22:.05,
   vignette:['editor','motion-app','audio-app','particles','timeline'].includes(family)?.17:0};

 if(family==='landscape'){
   box('sky',50,30,100,61,'#EDE0C8');
   circ('sun',79,22,12,20,p.accent,{enter:{preset:'pop',at:at(6)},idle:{kind:'breathe',amount:3,speed:.16}});
   for(let i=0;i<5;i++){
     const y=43+i*10,fill=['#E3CBA8','#B6C9A9','#9CB49A','#5E7F6A','#2F5D62'][i];
     box('cut-sheet-shadow',50+i%2*2,y+1,111,19,p.ink,{shape:'blob',opacity:.11,enter:{preset:'rise',at:at(i,.14)}});
     box('cut-sheet',50+i%2*2,y,111,19,fill,{shape:'blob',enter:{preset:'rise',at:at(i,.14),spring:'soft'},
       keyframes:[{at:duration*.7,y:(i-2)*3},{at:duration,y:(i-2)*8}]});
   }
   box('water',50,80,55,7,'#2F5D62',{shape:'blob',opacity:.84,enter:{preset:'wipe',at:at(7)}});
   box('boat',61,73,10,3,p.ink,{shape:'triangle',enter:{preset:'pop',at:at(8)},idle:{kind:'float',amount:.7,speed:.6}});
   path('mast','M49 90L49 11L80 70',61,67,8,14,p.ink,{enter:{preset:'wipe',at:at(9)}});
   cam.to={x:1,y:2,zoom:1.055,rotate:0};
 }
 if(family==='pop-up'){
   box('stage-back',50,50,100,100,'#F7F0E4');
   box('paper-table',50,90,100,21,'#CDB99A');
   box('book-shadow',50,81,83,21,'#725C50',{shape:'blob',opacity:.22});
   box('left-page-shadow',28,71,48,31,'#947D6A',{shape:'blob',opacity:.18,rotate:-6});
   box('right-page-shadow',72,71,48,31,'#947D6A',{shape:'blob',opacity:.18,rotate:6});
   box('left-page',28,68,47,31,'#FFFAEF',{shape:'blob',rotate:-5,enter:{preset:'slide-right',at:at(1)}});
   box('right-page',72,68,47,31,'#FFF6E9',{shape:'blob',rotate:5,enter:{preset:'slide-left',at:at(1)}});
   box('fold-shadow',50,66,1.8,33,'#9B8374',{opacity:.34});
   path('page-seam','M50 5L50 95',50,69,7,28,'#BB9A7D',{strokeWidth:1.5});
   circ('pop-up-sun',74,25,14,24,p.accent,{enter:{preset:'pop',at:at(6)},idle:{kind:'breathe',amount:4,speed:.2}});
   for(let i=0;i<4;i++){
     box('fold-back',50,61-i*8,64-i*9,20,p.ink,{shape:'triangle',opacity:.12,
       enter:{preset:'rise',at:at(i+2,.15)}});
     box('standing-paper',50,58-i*8,59-i*9,20,
       ['#B4C9AA','#8FAF98','#678A7D','#3F665F'][i],{shape:'triangle',
         enter:{preset:'rise',at:at(i+2,.15),spring:'soft'},
         keyframes:[{at:duration*.6,rotate:i%2?-2:2},{at:duration,rotate:0}]});
   }
   box('paper-tree-trunk',24,58,1.8,18,'#6E7E67',{enter:{preset:'rise',at:at(7)}});
   box('paper-tree-canopy',24,48,10,20,'#9CB49A',{shape:'triangle',enter:{preset:'pop',at:at(8)}});
   cam.to={x:0,y:-1,zoom:1.09,rotate:0};
 }
 if(family==='ink'){
   box('washi',50,50,100,100,'#F4EFE6');
   for(let i=0;i<17;i++)box('fibre',10+(i*31)%80,15+(i*17)%65,1.8,.14,'#8C704A',{opacity:.12,rotate:i*13});
   path('one-brush-line','M4 54 C23 12 42 9 50 39 S86 95 94 43',50,47,86,58,p.ink,
     {strokeWidth:3,enter:{preset:'wipe',at:.08},keyframes:[{at:duration*.7,scale:1},{at:duration,scale:1.035}]});
   circ('vermilion-seal',80,79,8,13,p.accent,{enter:{preset:'pop',at:duration*.73},opacity:.96});
   box('seal-mark',80,79,3,.35,p.background,{enter:{preset:'wipe',at:duration*.76}});
   cam.to.zoom=1.025;
 }
 if(family==='weather'){
   box('sky-blue',50,50,100,100,'#35578F',{fill2:'#111C40',angle:170});
   circ('sun-glow',77,20,33,60,p.accent,{opacity:.16,idle:{kind:'breathe',amount:8,speed:.12}});
   circ('sun',77,24,14,25,p.accent,{enter:{preset:'pop',at:at(2)},idle:{kind:'float',amount:1,speed:.2}});
   box('widget-shadow',50,55,56,53,'#081731',{shape:'blob',opacity:.28});
   box('widget-card',50,52,54,56,'#F4F7FC',{radius:5,enter:{preset:'pop',at:at(1),spring:'soft'}});
   text('weather-label','TODAY',38,37,24,7,3.1,'#5C6E86');
   text('degrees','24°',49,54,39,24,14,'#233B65',{enter:{preset:'rise',at:at(4)}});
   box('temperature-bar',50,73,37,1.1,p.accent,{enter:{preset:'wipe',at:at(5)}});
   for(let i=0;i<4;i++)circ('cloud',17+i*5,29+(i%2)*4,10,12,'#FFFFFF',{opacity:.56,enter:{preset:'rise',at:at(i)}});
   cam.to.zoom=1.025;
 }
 if(family==='charts'){
   box('paper',50,50,100,100,p.background);
   box('rule-top',50,13,83,.3,p.ink);
   text('kicker','THE VISUAL REPORT',50,9,76,5,2.5,p.ink,{font:'mono'});
   text('headline',family==='charts'?'THE SIGNAL':headline,50,24,82,14,7,p.ink,{font:'serif'});
   box('rule',50,33,83,.2,p.ink);
   for(let i=0;i<7;i++)box('chart-grid',53,41+i*5,69,.1,p.secondary,{opacity:.7});
   path('baseline','M2 82L97 82',50,55,70,44,p.ink,{strokeWidth:.6});
   path('blue-data-line','M3 72L20 66L35 70L50 34L67 30L83 15L97 20',50,55,70,44,p.accent,
     {strokeWidth:3,enter:{preset:'wipe',at:at(3)},keyframes:[{at:duration*.5,scale:.98},{at:duration,scale:1.01}]});
   circ('focus-point',72,51,2.4,4,p.accent,{enter:{preset:'pop',at:at(7)}});
   text('note','ONE TRUE LINE',77,85,34,7,2.4,p.accent,{font:'mono'});
   cam.to.zoom=1.018;
 }
 if(family==='newspaper'){
   box('newsprint',50,50,100,100,p.background);
   box('masthead-rule',50,12,90,.4,p.ink);
   text('masthead','THE DAILY GRAPH',50,7,88,9,4.8,p.ink,{font:'serif'});
   box('subheading-rule',50,21,90,.2,p.ink);
   text('breaking',headline.toUpperCase(),50,31,86,17,7.2,p.ink,{font:'serif',
     enter:{preset:'rise',at:at(2)}});
   box('middle-rule',50,43,90,.25,p.ink);
   for(let col=0;col<3;col++){
     const x=18+col*32;
     box('article-rule',x,51,24,.55,col===1?p.accent:p.ink,
       {enter:{preset:'wipe',at:at(col+3)}});
     for(let line=0;line<5;line++)box('copy-line',x,58+line*5,24-(line%3)*2,.36,p.ink,
       {opacity:.45,enter:{preset:'wipe',at:at(line+col+3,.08)}});
   }
   box('chart-panel',50,84,88,22,'#F6E8D8',{enter:{preset:'rise',at:at(7)}});
   for(let index=0;index<7;index++)box('data-bar',20+index*10,86-(index%4)*2,5,12+(index%4)*4,
     index===4?p.accent:'#A8B5B9',{enter:{preset:'rise',at:at(index+7,.06)},
       keyframes:[{at:duration*.38,scale:.82},{at:duration,scale:1}]});
   box('footer-rule',50,96,90,.28,p.ink);
   cam.to={x:0,y:0,zoom:1.035,rotate:0};
 }
 if(family==='kinetic'||family==='swiss'||family==='poster'){
   if(family==='swiss')grid(p.secondary,8,5,.6);
   box('graphic-bar',11,49,3,75,p.accent,{enter:{preset:'wipe',at:at(2)}});
   text('title',family==='kinetic'?'MOVE':family==='poster'?headline.toUpperCase():headline.toUpperCase(),52,43,79,48,
     family==='poster'?15:12,p.ink,{font:'impact',align:'left',enter:{preset:'slide-right',at:at(1),spring:'snappy'},
       keyframes:[{at:duration*.4,x:-22},{at:duration,x:16}]});
   circ('single-dot',86,20,7,12,p.accent,{enter:{preset:'pop',at:at(4)},idle:{kind:'breathe',amount:6,speed:.45}});
   box('bottom-rule',50,89,84,1,p.accent,{enter:{preset:'wipe',at:at(5)}});
   if(family==='kinetic')box('kinetic-spine',94,50,.6,66,p.accent,{enter:{preset:'wipe',at:at(3)}});
   if(family==='kinetic')text('sub','FORM  /  FUNCTION',42,81,68,7,3,p.ink,{font:'mono'});
   if(family==='poster')box('sticker',80,77,22,13,p.secondary,{rotate:-8,enter:{preset:'pop',at:at(6)}});
   if(family==='poster')text('sticker-label','NOW',80,77,18,10,6,p.ink,{font:'impact',rotate:-8});
   cam.to.zoom=family==='kinetic'?1.095:1.02;
 }
 if(family==='particles'){
   for(let i=0;i<6;i++)particles('point-cloud',16+i*14,25+(i%2)*19,32,53,i===3?p.accent:p.ink,80,
     {opacity:i===3?.83:.48,enter:{preset:'fade',at:at(i,.11)},
       keyframes:[{at:duration*.65,x:(i-3)*5},{at:duration,x:0}]});
   circ('converge',51,52,12,20,p.accent,{opacity:.1,enter:{preset:'pop',at:duration*.55},
     idle:{kind:'breathe',amount:18,speed:.35}});
   cam.to={x:0,y:0,zoom:1.16,rotate:0};
 }
 if(family==='city'){
   box('sea',50,85,100,31,'#ACD6D6');
   box('island-shadow',50,78,86,18,'#6A999A',{shape:'blob',opacity:.5});
   box('island',50,75,83,17,'#D5D7B8',{shape:'blob',enter:{preset:'rise',at:at(1)}});
   for(let i=0;i<12;i++){
     const w=5+i%3*2,x=16+(i%6)*12,y=51+Math.floor(i/6)*15-(i%4)*3,h=18+(i%4)*6;
     box('town-shadow',x+1,y+1,w,h,'#729B9B',{opacity:.3});
     box('tower',x,y,w,h,['#E6E9E1','#9FC8C1','#C6D7BF'][i%3],
       {enter:{preset:'rise',at:at(i,.085),spring:'soft'}});
     box('roof',x,y-h*.34,w+1,3,i%4===0?p.accent:'#6E9B99',{shape:'triangle',
       enter:{preset:'pop',at:at(i,.085)+.13}});
     for(let j=0;j<2;j++)box('window',x-1.2+j*2.2,y,1.1,2.3,'#5E7F6A',{enter:{preset:'fade',at:at(i,.085)+.2}});
   }
   box('moving-car',22,82,4.4,3.3,p.accent,{enter:{preset:'pop',at:at(8)},
     keyframes:[{at:duration*.4,x:0},{at:duration,x:110}]});
   cam.to={x:1,y:1,zoom:1.065,rotate:0};
 }
 if(family==='diagram'||family==='network'){
   grid(p.secondary,11,6,family==='diagram'?.42:.6);
   const xs=[18,39,61,82];
   xs.forEach((x,i)=>{
     box('node-shadow',x,50,17,22,p.secondary,{shape:'blob',opacity:.55});
     box('process-node',x,48,17,21,family==='diagram'?'#F3F7FD':'#142A45',
       {stroke:i===2?p.accent:p.secondary,strokeWidth:.18,radius:2,enter:{preset:'pop',at:at(i,.19)}});
     circ('node-core',x,46,5,9,i===2?p.accent:p.ink,{enter:{preset:'pop',at:at(i,.19)+.14}});
     if(family==='diagram')text('node-label',['INPUT','PLAN','RENDER','PLAY'][i],x,57,16,6,2.1,p.ink,{font:'mono'});
     if(i<3)path('connector','M4 50L96 50',x+10.5,48,5,4,p.accent,{strokeWidth:3,enter:{preset:'wipe',at:at(i,.19)+.22}});
   });
   circ('moving-packet',48,48,2.4,4,p.accent,{enter:{preset:'pop',at:at(4)},
     keyframes:[{at:duration*.2,x:-180},{at:duration*.7,x:180}]});
   if(family==='network')text('heading','SYSTEM ONLINE',50,19,70,14,5,p.ink,{font:'mono'});
   cam.to.zoom=1.045;
 }
 if(family==='timeline'){
   for(let i=0;i<3;i++){
     box('era-horizon',14+i*37,48,34,47,['#2A2622','#4A3F32','#74614A'][i],
       {shape:'blob',opacity:.93,enter:{preset:'rise',at:at(i,.2)}});
     for(let j=0;j<3;j++)box('silhouette',i*37+j*8+7,44,2.1,12+i*4,'#A88A60',
       {enter:{preset:'rise',at:at(i+j,.13)}});
   }
   box('time-axis',50,78,88,.45,p.ink,{enter:{preset:'wipe',at:at(2)}});
   for(let i=0;i<5;i++){
     circ('time-beat',8+i*20,78,1.7,3,p.accent,{enter:{preset:'pop',at:at(i,.15)}});
     text('era', ['I','II','III','IV','V'][i],8+i*20,85,7,7,2.5,p.ink,{font:'serif'});
   }
   text('timeline',headline,50,18,75,18,8,p.ink,{font:'serif'});
   circ('travelling-beat',24,78,2.8,4.5,p.accent,{enter:{preset:'pop',at:at(4)},
     keyframes:[{at:duration*.25,x:0},{at:duration,x:300}]});
   cam.to={x:6,y:0,zoom:1.1,rotate:0};
 }
 if(['editor','motion-app','design-app','audio-app','graphite'].includes(family)){
   const light=family==='design-app';
   const panel=light?'#FFFFFF':'#17181B';
   const rim=light?'#D1D1CC':'#32343A';
   box('app-shadow',50,53,92,78,'#000000',{radius:3,opacity:.18,enter:{preset:'fade',at:0}});
   box('app-frame',50,49,90,76,panel,{radius:2,enter:{preset:'pop',at:at(1),spring:'soft'}});
   box('titlebar',50,15,90,8,light?'#F5F5F1':'#25262A');
   for(let i=0;i<3;i++)circ('window-dot',9+i*2.1,15,1,1.7,['#DB716A','#DDB95B','#6CAA87'][i]);
   text('app-heading',family==='graphite'?'PROJECT / STUDIO':family==='audio-app'?'SESSION / AUDIO':
     family==='design-app'?'CANVAS / DESIGN':family==='motion-app'?'KEYFRAMES / MOTION':'CUT / EDIT',
     50,15,58,4,2.4,p.ink,{font:'mono'});
   box('tool-sidebar',14,51,14,63,light?'#EBEBE8':'#1D1E22');
   for(let i=0;i<6;i++)box('tool-icon',14,28+i*8,5,1.4,i===2?p.accent:rim,{radius:1,enter:{preset:'fade',at:at(i,.06)}});
   box('monitor',52,43,54,40,light?'#EEEDE7':'#090D14',{radius:1});
   if(family==='editor'){
     box('video-preview',52,42,47,31,'#304454',{fill2:'#8DA6AF',angle:45});
     circ('subject',52,39,9,14,'#D8BFAA',{enter:{preset:'pop',at:at(2)}});
     box('timeline-panel',58,78,66,17,'#222328');
     for(let i=0;i<5;i++)box('clip',33+i*12,77+(i%2)*7,11,5,i%2?'#234A3A':'#4C478A',
       {enter:{preset:'slide-right',at:at(i,.14)}});
   }
   if(family==='motion-app'){
     circ('motion-object',54,39,14,25,p.accent,{enter:{preset:'pop',at:at(2)},keyframes:[{at:duration*.35,x:-30},{at:duration,x:54}]});
     box('curve-panel',56,77,63,17,'#222328');
     path('bezier','M4 90C28 89 21 18 48 46S70 65 94 6',56,77,58,13,p.accent,
       {strokeWidth:3,enter:{preset:'wipe',at:at(2)}});
     for(let i=0;i<4;i++)box('keyframe',34+i*14,83,1.5,2.5,p.accent,{rotate:45,enter:{preset:'pop',at:at(i,.16)}});
   }
   if(family==='design-app'){
     box('poster-canvas',52,43,34,38,'#FFD400',{enter:{preset:'pop',at:at(3)}});
     box('poster-black',49,40,20,18,'#111111',{rotate:-10});
     text('poster-word','MAKE',53,52,32,9,6,'#111111',{font:'impact'});
     box('selection-outline',52,43,38,42,p.accent,{opacity:.2});
     for(let i=0;i<4;i++)circ('handle',36+(i%2)*32,25+Math.floor(i/2)*36,2,3,p.accent);
     box('property-row',55,79,50,2,rim);
   }
   if(family==='audio-app'){
     for(let i=0;i<4;i++){
       box('audio-lane',53,30+i*10,47,7,i%2?'#1B1B1B':'#222327');
       for(let j=0;j<8;j++)box('midi-note',35+j*5,30+i*10+(j%3),3,1.5,j%5===0?p.accent:'#566A7F',
         {enter:{preset:'pop',at:at(j+i,.05)}});
     }
     box('piano-roll',53,79,50,14,'#1B1B1B');
     for(let i=0;i<8;i++)box('beat',30+i*7,79,1.1,7,i%4===0?p.accent:'#4C6A5A');
   }
   if(family==='graphite'){
     text('launch','Everything in focus',53,38,44,15,5.2,p.ink,{font:'sansbold'});
     box('feature',53,58,39,9,'#292F32',{radius:2});
     circ('green-check',41,58,3.5,6,p.accent,{enter:{preset:'pop',at:at(6)}});
     text('status','DONE',57,58,24,5,2.8,p.accent,{font:'mono'});
     for(let i=0;i<3;i++)box('metric',36+i*16,76,11,3,'#454D57');
   }
   box('playhead',50,77,0.27,16,p.accent,{enter:{preset:'fade',at:at(2)},keyframes:[{at:duration*.35,x:-100},{at:duration,x:110}]});
   circ('cursor',70,62,2.2,4,p.accent,{enter:{preset:'pop',at:at(7)},keyframes:[{at:duration*.6,x:-45,y:-35},{at:duration,x:0,y:0}]});
   cam.to={x:0,y:0,zoom:1.06,rotate:0};
 }
 if(family==='print'){
   box('paper-base',50,50,100,100,p.background);
   for(let i=0;i<7;i++)box('registration-line',7+i*14,50,.27,85,p.ink,{opacity:.08,rotate:i%2?1:-1});
   circ('ink-blue',49,51,57,80,p.secondary,{opacity:.81,enter:{preset:'pop',at:at(2)},rotate:9});
   circ('ink-pink',54,47,54,76,p.accent,{opacity:.83,enter:{preset:'pop',at:at(4)},rotate:-8,
     keyframes:[{at:duration*.3,x:-7},{at:duration,x:8}]});
   text('riso-title',headline.toUpperCase(),50,54,78,36,10,'#F5F0E6',{font:'impact',rotate:-6,enter:{preset:'slide-right',at:at(6)}});
   for(let i=0;i<5;i++)particles('halftone',18+i*17,20+(i%2)*42,24,20,i%2?p.accent:p.secondary,65,{opacity:.2});
   cam.to.zoom=1.055;
 }
 if(family==='technical'){
   grid('#7295B1',10,8,.48);
   box('drafting-board',51,49,66,57,'#164D7C',{opacity:.6,stroke:p.ink,strokeWidth:.2});
   path('technical-body','M16 25L76 25L91 44L91 72L26 72L16 25 M26 72L43 47L91 44 M43 47L75 25 M26 72L26 40L75 40',
     51,48,57,48,p.ink,{strokeWidth:1.2,enter:{preset:'wipe',at:at(2)}});
   path('dimension','M10 83L88 83 M10 78L10 88 M88 78L88 88',51,48,57,48,p.accent,
     {strokeWidth:.9,enter:{preset:'wipe',at:at(4)}});
   circ('selected-part',53,53,8,13,p.accent,{opacity:.25,enter:{preset:'pop',at:at(7)},
     idle:{kind:'pulse',amount:12,speed:.3}});
   text('technical-label','SECTION A / A',52,81,48,8,2.9,p.ink,{font:'mono'});
   cam.to.zoom=1.07;
 }
 const unique=new Set(layers.map(l=>l.id));
 if(unique.size!==layers.length || layers.length<6 || layers.length>500)throw Error('P3: capas inconsistentes en '+styleId);
 return {source:'style-preset/'+styleId,styleRules:{id:styleId,signature:profile.signature,motion:profile.motion,
   family:profile.family,typography:profile.type,oneAccent:true,reference:'references/styles/'+styleId+'.md'},
   background,camera:cam,grade,layers};
}

// P4: executable, deterministic workflow contracts shared by Motion Studio and Motion Graphics.
// Source guides define editorial constraints; these recipes implement local motion/video outputs.
import {createStyleComposition} from './style-recipes.mjs';

const catalog={
 'explainer-default':{name:'Explicativo de producto',style:'graphite-ui',duration:60,beats:['hook','interface','features','end'],guide:'barty/explainer-default.md',kind:'product'},
 'explainer-engaging':{name:'Explicativo de una toma',style:'explainer-diagram',duration:12,beats:['journey'],guide:'barty/explainer-engaging.md',kind:'product'},
 'explainer-high-energy':{name:'Promo de alta energía',style:'swiss-kinetic',duration:15,beats:['spark','brand','triplet','end'],guide:'barty/explainer-high-energy.md',kind:'product'},
 'animated-chart':{name:'Gráfico animado',style:'data-story',duration:8,beats:['chart'],guide:'charlie/animated-chart.md',kind:'data'},
 'apple-launch-film':{name:'Lanzamiento con widgets',style:'graphite-ui',duration:18,beats:['notch','widget','widget','end'],guide:'charlie/apple-launch-film.md',kind:'product'},
 'launch-video':{name:'Lanzamiento de producto',style:'motion-app-ui',duration:40,beats:['hook','proof','interface','features','end'],guide:'charlie/launch-video.md',kind:'product'},
 'loop-cover':{name:'Portada GIF en bucle',style:'editorial-paper',duration:9,beats:['cover'],guide:'charlie/loop-cover.md',kind:'cover',export:'mp4+gif'},
 'milestone-reveal':{name:'Revelación de hito',style:'particle-field',duration:12,beats:['milestone'],guide:'charlie/milestone-reveal.md',kind:'milestone'},
 'model-showdown':{name:'Comparativa de tres modelos',style:'midnight-grid',duration:12,beats:['showdown'],guide:'charlie/model-showdown.md',kind:'comparison'},
 'newsletter-promo':{name:'Promoción de newsletter',style:'editorial-paper',duration:15,beats:['hook','proof','proof','proof','end'],guide:'charlie/newsletter-promo.md',kind:'newsletter'},
 'title-sequence-3d':{name:'Título cinematográfico',style:'midnight-grid',duration:12,beats:['cinematic','end'],guide:'charlie/title-sequence-3d.md',kind:'title'},
 'vox-explainer':{name:'Explicativo editorial',style:'risograph',duration:45,beats:['hook','fact','fact','fact','end'],guide:'charlie/vox-explainer.md',kind:'documentary'},
};
export const SPECIALIZED_FLOW_IDS=Object.freeze(Object.keys(catalog));
export function getSpecializedFlow(id){if(!Object.hasOwn(catalog,id))throw Error('P4: flujo desconocido: '+id);
 return {id,...catalog[id],sourceGuide:'references/source-guides/'+catalog[id].guide};}
export function listSpecializedFlows(){return SPECIALIZED_FLOW_IDS.map(getSpecializedFlow);}

const string=(value,max=80)=>String(value??'').trim().slice(0,max);
const list=(value)=>Array.isArray(value)?value:[];
const check=(ok,message)=>{if(!ok)throw Error('P4: '+message);};
const sample={product:'PRODUCTO DE EJEMPLO',message:'Una idea, un movimiento.',features:['Crear','Revisar','Publicar'],
  title:'UNA IDEA',hook:'¿Qué cambia cuando lo ves?',cta:'CONOCE EL PROYECTO',
  number:'12,345',label:'Cifra ilustrativa',source:'DEMO — sin datos reales',
  values:[{label:'A',value:12},{label:'B',value:23},{label:'C',value:17}],
  models:['MODELO A','MODELO B','MODELO C'],newsletter:'EDICIÓN DEMO',url:'example.invalid',
  proofs:['IDEA','CONTEXTO','RESULTADO'],facts:[{text:'DATO ILUSTRATIVO A',source:'demo'},
    {text:'DATO ILUSTRATIVO B',source:'demo'},{text:'DATO ILUSTRATIVO C',source:'demo'}]};

export function verifySpecializedInputs(id,input={},demo=false){
 const flow=getSpecializedFlow(id),data={...input};
 check(data&&typeof data==='object'&&!Array.isArray(data),'los datos del flujo deben ser un objeto.');
 if(demo)return {...sample,...data};
 const need=(key)=>check(string(data[key]).length>0,`${id} necesita ${key} proporcionado por el usuario.`);
 if(flow.kind==='product'){need('product');need('message');
   if(id==='apple-launch-film')check(list(data.facts).length>0&&
     data.facts.every(x=>string(x)),'apple-launch-film requiere hechos y funciones aportados.');
   if(id==='launch-video') {need('cta');check(list(data.proofs).length>0&&
     data.proofs.every(p=>typeof p==='object'&&string(p.asset)),
     'launch-video necesita pruebas visuales reales con asset.');}}
 if(flow.kind==='data'){check(list(data.values).length>=2,'animated-chart necesita al menos dos valores.');
   check(data.values.every(x=>string(x.label)&&Number.isFinite(x.value)&&x.value>=0),
     'las etiquetas y cifras deben ser válidas y no negativas.');
   check(!!data.illustrative||string(data.source).length>0,'faltan fuente de los datos o declaración illustrative.');}
 if(flow.kind==='milestone'){need('number');need('label');need('source');}
 if(flow.kind==='comparison'){check(list(data.models).length===3&&data.models.every(x=>string(x)),
   'model-showdown requiere tres modelos identificados.');
   check(list(data.videos).length===3,'model-showdown requiere tres MP4 reales; sin archivos solo existe la demo.');
   need('brief');}
 if(flow.kind==='newsletter'){need('newsletter');need('hook');need('url');
   check(list(data.proofs).length===3&&data.proofs.every(p=>typeof p==='object'&&string(p.asset)),
     'newsletter-promo necesita tres pruebas adjuntas de la edición.');}
 if(flow.kind==='cover'){need('coverAsset');need('element');}
 if(flow.kind==='title')need('title');
 if(flow.kind==='documentary'){need('hook');check(list(data.facts).length>=2&&
   data.facts.every(x=>string(x.text)&&string(x.source)),'vox-explainer necesita hechos con fuente.');}
 return data;
}

const shape=(id,x,y,width,height,fill,extra={})=>({id,type:'shape',x,y,width,height,fill,enter:{preset:'fade',at:0},...extra});
const words=(id,value,x,y,width,height,size,color,extra={})=>({id,type:'text',x,y,width,height,
 text:string(value,110),size,color,font:'sansbold',weight:800,enter:{preset:'rise',at:.08},...extra});
const crop=(s,max=30)=>string(s,max);
function decorate(id,beat,step,data,seconds,format,brand,preview){
 const flow=getSpecializedFlow(id);let spec=createStyleComposition(flow.style,{title:'',duration:seconds,format,brandProfile:brand});
 const colors={background:spec.background.color,ink:brand?.colors?.ink||'#F2F2F7',accent:brand?.colors?.accent||'#E17855'};
 const layers=[];let n=0;const name=()=>`p4-${id.replace(/-/g,'')}-${++n}`;
 const put=(layer)=>{layer.id=name();layers.push(layer);return layer;};
 const box=(x,y,w,h,fill,extra={})=>put(shape('',x,y,w,h,fill,extra));
 const txt=(text,x,y,w,h,size=5,color=colors.ink,extra={})=>put(words('',text,x,y,w,h,size,color,extra));
 const title=data.title||data.product||data.newsletter||flow.name;
 const feature=list(data.features)[step%Math.max(list(data.features).length,1)]||data.message||'';
 const hasMedia=!!data.videos?.length;
 const accent=colors.accent;
 if(id==='explainer-engaging'){
   spec.background={color:'#0C0C0E'};spec.camera={from:{x:-8,y:0,zoom:1.15,rotate:0},
     to:{x:0,y:0,zoom:1,rotate:0},keyframes:[{at:0,x:-9,zoom:1.15},
       {at:seconds*.35,x:-3,zoom:1.17},{at:seconds*.7,x:5,zoom:1.15},{at:seconds,x:0,zoom:1}]};
   for(let i=0;i<3;i++){const x=18+i*32;
     box(x,48,24,32,'#23262E',{radius:3,stroke:'#5D6A79',strokeWidth:.12});
     txt(crop(list(data.features)[i]||['ENTRADA','PROCESO','RESULTADO'][i],18),x,50,21,8,3.1,'#FFFFFF');
     box(x,63,18,2,i===2?accent:'#3D587D',{enter:{preset:'wipe',at:seconds*(.2+i*.22)}});
   }
   box(17,44,5,9,'#FFFFFF',{shape:'circle',enter:{preset:'pop',at:0},
     keyframes:[{at:0,x:0},{at:seconds*.32,x:Math.round(1280*.30)},
       {at:seconds*.67,x:Math.round(1280*.60)},{at:seconds,x:0}]});
 }
 else if(id==='animated-chart'){
   spec={background:{color:'#FFF1E5'},camera:{from:{zoom:1},to:{zoom:1}},grade:{grain:.04},layers:[]};
   const values=list(data.values),max=Math.max(1,...values.map(x=>Number(x.value)||0));
   txt(data.title||'DATOS',50,16,82,12,7,'#1A1A1A');
   for(let i=0;i<Math.min(values.length,7);i++){
     const item=values[i],x=14+(i+.5)*72/Math.min(values.length,7),h=40*item.value/max;
     box(x,67-h/2,Math.min(9,58/values.length),h,i===values.length-1?'#0F5499':'#9EBDC6',
       {enter:{preset:'none',at:0},keyframes:[{at:seconds*.22,scale:1},
         {at:seconds*.51,scale:1.18},{at:seconds*.74,scale:1.18},{at:seconds,scale:1}]});
     txt(item.label,x,82,15,7,2.6,'#1A1A1A');txt(String(item.value),x,87,15,7,2.6,'#1A1A1A');
   }
   if(preview||data.illustrative)txt('DATOS ILUSTRATIVOS',50,96,65,5,1.9,'#475569');
 }
 else if(id==='milestone-reveal'){
   spec={background:{color:'#090F1B'},camera:{from:{zoom:1},to:{zoom:1}},grade:{vignette:.1},layers:[]};
   put({type:'particles',x:50,y:50,width:100,height:56,fill:'#D8E9F9',
     particles:{kind:'dots',count:80,speed:0,size:.45,seed:73},enter:{preset:'none',at:0}});
   txt(data.number,50,46,84,28,14,'#F7FAFF',{enter:{preset:'rise',at:seconds*.23},
     leave:{preset:'fade',at:seconds*.86,duration:seconds*.13}});
   box(50,68,44,.65,accent,{enter:{preset:'wipe',at:seconds*.53},
     leave:{preset:'fade',at:seconds*.86,duration:seconds*.12}});
   txt(data.label,50,77,76,10,3.6,'#E8F0F8',{enter:{preset:'rise',at:seconds*.61},
     leave:{preset:'fade',at:seconds*.86,duration:seconds*.12}});
 }
 else if(id==='loop-cover'){
   spec={background:{color:'#F6F0E6'},camera:{from:{zoom:1},to:{zoom:1}},grade:{grain:.03},layers:[]};
   if(data.coverAsset)put({type:'image',asset:data.coverAsset,x:50,y:50,width:100,height:100,
     enter:{preset:'fade',at:0}});
   else {box(50,52,75,70,'#E8D7B9',{radius:2});txt(data.title||'PORTADA',50,31,70,14,8,'#1F2F46');}
   box(50,72,59,.8,accent,{idle:{kind:'breathe',amount:10,speed:1/seconds},fixed:true});
   box(77,72,5,9,accent,{shape:'circle',idle:{kind:'breathe',amount:12,speed:1/seconds},fixed:true});
 }
 else if(id==='model-showdown'){
   spec={background:{color:'#0B0B0F'},camera:{from:{zoom:1},to:{zoom:1}},grade:{},layers:[]};
   txt(data.title||'UN MISMO BRIEF · TRES RESULTADOS',50,12,95,11,5.5,'#FFFFFF');
   for(let i=0;i<3;i++){
     const x=format==='vertical'?50:17+i*33,y=format==='vertical'?30+i*24:55;
     box(x,y,format==='vertical'?88:30,format==='vertical'?22:54,'#1A2130',
       {stroke:accent,strokeWidth:.12,radius:2});
     if(!hasMedia)txt('VISTA DEMO',x,y,26,9,3.2,'#61718A');
     txt(String(list(data.models)[i]||'MODELO '+(i+1)),x,y-(format==='vertical'?7:22),
       format==='vertical'?55:26,7,3.5,'#FFFFFF',{fixed:true});
   }
   box(16,89,3,5,accent,{shape:'circle',keyframes:[{at:seconds*.12,x:0},
     {at:seconds*.9,x:Math.round((format==='vertical'?420:960))}]});
 }
 else if(id==='newsletter-promo'){
   const proof=list(data.proofs)[Math.max(0,step-1)]||'';
   txt(beat==='end'?data.newsletter:beat==='hook'?data.hook:crop(typeof proof==='string'?proof:proof.label||'PRUEBA'),
     50,22,86,20,7,accent);
   if(beat==='proof'&&typeof proof==='object'&&proof.asset)
     put({type:'image',asset:proof.asset,x:50,y:60,width:70,height:56,enter:{preset:'zoom',at:.15}});
   if(beat==='end')txt(data.url,50,77,80,9,3.5,colors.ink);
 }
 else if(id==='vox-explainer'){
   spec.background={color:'#F1E6D0'};
   box(51,50,83,52,'#FBF7EE',{rotate:-3,enter:{preset:'drop',at:.06},
     keyframes:[{at:seconds*.4,rotate:-2},{at:seconds,rotate:0}]});
   const facts=list(data.facts);const fact=facts[Math.max(0,step-1)%Math.max(1,facts.length)];
   txt(beat==='hook'?data.hook:beat==='end'?data.title||'LO ESENCIAL':fact?.text||'FUENTE',
     50,49,74,27,7,'#14213D',{font:'impact'});
   box(50,74,55,2,'#B8312A');
 }
 else if(id==='title-sequence-3d'){
   spec.background={color:'#070E1A'};
   for(let i=0;i<7;i++){
     const scale=1+i/8,x=9+i*14;
     box(x,64,8*scale,45*scale,'#122A44',{depth:i/7,enter:{preset:'rise',at:i*.08}});
     box(x,42,4*scale,5*scale,i%2?accent:'#6CB0DB',{depth:i/7,
       idle:{kind:'breathe',amount:3,speed:.2}});
   }
   txt(data.title||title,50,55,88,22,9,'#FFFFFF',{enter:{preset:'zoom',at:seconds*.48}});
   spec.camera={from:{x:-12,y:4,zoom:.85,rotate:0},to:{x:6,y:-3,zoom:1.27,rotate:0}};
 }
 else if(id==='apple-launch-film'){
   spec.background={color:'#294C68',color2:'#6E86BA',angle:145};
   box(50,4,100,8,'#ECECF2');box(50,4,17,10,'#090A0D',{radius:3,
     enter:{preset:'zoom',at:.14},idle:{kind:'breathe',amount:3,speed:.16}});
   box(50,17,37,18,'#11151F',{radius:3,enter:{preset:'drop',at:seconds*.25}});
   txt(beat==='end'?data.product:beat==='notch'?'hello':crop(feature,28),50,63,84,13,7,'#FFFFFF');
 }
 else if(id==='explainer-high-energy'){
   txt(beat==='brand'?data.product:beat==='triplet'?feature:beat==='end'?data.message:'PRESENTAMOS',
     50,48,84,27,10,'#111114',{font:'impact',enter:{preset:'slide-right',at:.05}});
   box(50,81,89,1.5,accent,{enter:{preset:'wipe',at:seconds*.25}});
   box(8,15,5,9,accent,{shape:'circle',keyframes:[{at:seconds*.25,x:0},{at:seconds,x:110}]});
 }
 else {
   const content=beat==='end'?data.cta||data.message||title:
     beat==='hook'?data.message||data.hook||title:
     beat==='features'?feature:beat==='proof'?'PRUEBA APORTADA POR EL USUARIO':
     beat==='interface'?'INTERFAZ DE PRODUCTO':title;
   txt(content,50,22,83,16,6.5,accent);
   if(beat==='proof'&&list(data.proofs)[0]?.asset)
     put({type:'image',asset:list(data.proofs)[0].asset,x:50,y:59,width:67,height:54,
       enter:{preset:'zoom',at:seconds*.22}});
   if(beat==='end')txt(data.product||title,50,71,73,10,4,colors.ink);
 }
 if(preview)txt('DEMOSTRACIÓN · SIN DATOS REALES',50,95,80,5,1.6,
   id==='animated-chart'?'#475569':'#C2CEDB',{enter:{preset:'fade',at:0},fixed:true});
 if(['loop-cover','milestone-reveal','animated-chart'].includes(id))for(const layer of layers){
   if(id==='loop-cover'||id==='animated-chart'||layer.id===layers[0]?.id||layer.text?.startsWith('DEMOSTRACIÓN'))
     layer.enter={preset:'none',at:0};
 }
 // P3 style recipes carry their own illustrative headlines (for example,
 // “Everything in focus” and “THE DAILY GRAPH”). Keep their visual structures,
 // but let P4 own the editorial text to avoid double headlines and collisions.
 const decorativeLayers=(spec.layers||[]).filter(layer=>layer.type!=='text');
 return {...spec,source:'workflow-p4/'+id+'/'+beat,
   workflowRules:{id,beat,sourceGuide:flow.sourceGuide,mode:preview?'illustrative':'production',
     renderer:'shared-authored/1',sourceRequired:['data','milestone','documentary','comparison'].includes(flow.kind)},
   layers:[...decorativeLayers,...layers]};
}

export function generateSpecializedProject({workflow,data={},demo=false,format='horizontal',duration,
  compact=false,brandProfile}={}){
 const flow=getSpecializedFlow(workflow);
 check(['horizontal','vertical'].includes(format),'formato no válido.');
 const input=verifySpecializedInputs(workflow,data,demo);
 const seconds=duration===undefined?flow.duration:Number(duration);
 check(Number.isFinite(seconds)&&seconds>=1&&seconds<=300,'duración total entre 1 y 300 segundos.');
 const beats=compact?[flow.beats[Math.floor(flow.beats.length/2)]]:flow.beats;
 const sceneDuration=Math.round(seconds/beats.length*1000)/1000;
 check(sceneDuration>=.5&&sceneDuration<=60,'duración por escena fuera de 0.5–60 segundos.');
 const scenes=beats.map((beat,index)=>({id:'p4-'+workflow+'-'+(index+1),
   layout:'hero',duration:sceneDuration,title:input.title||input.product||flow.name,
   subtitle:'',imageAsset:'',cues:[],stylePreset:undefined,captionMode:'none',approved:false,
   authored:decorate(workflow,beat,index,input,sceneDuration,format,brandProfile,demo)}));
 const project={name:string(input.title||input.product||flow.name,42),format,
   resolution:'720p',fps:24,palette:'aurora',style:'modern',showText:true,
   brandProfile,scenes,loop:['loop-cover','milestone-reveal','animated-chart'].includes(workflow),
   soundDesign:{enabled:true,cues:scenes.flatMap((scene,index)=>{
     const at=sceneDuration*index;
     return [{at:Math.round((at+.12)*1000)/1000,duration:.16,
       type:['explainer-high-energy','launch-video','title-sequence-3d'].includes(workflow)?'impact':'whoosh',gain:.15},
       {at:Math.round((at+scene.duration*.65)*1000)/1000,duration:.15,
         type:index===scenes.length-1?'chime':'click',gain:.12}];
   })},
   workflow:{id:workflow,sourceGuide:flow.sourceGuide,demo:!!demo,
     export:flow.export||'mp4',mode:compact?'preview':'complete',
     source:string(input.source|| (flow.kind==='newsletter'?input.url:''),240),
     brief:string(input.brief,1200),
     sources:workflow==='vox-explainer'?list(input.facts).map(f=>({claim:string(f.text,180),source:string(f.source,240)})):
       workflow==='animated-chart'?list(input.values).map(x=>({claim:string(x.label,80)+': '+x.value,
         source:string(input.source|| (input.illustrative?'illustrative':'') ,240)})):[],
     media:workflow==='model-showdown'?list(input.videos):[]}};
 return project;
}

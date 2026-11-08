// Geometry-independent motion authoring. The exported scene remains plain GSAP.
const numeric = new Set(['x','y','rotation','rotationX','rotationY','scale','scaleX','scaleY','opacity']);
const origins = new Set(['svgOrigin','transformOrigin']);
const attributes = new Set(['x','y','cx','cy','r','rx','ry','width','height','d','transform','opacity','fill','stroke','stroke-dasharray','stroke-dashoffset']);
const selectorPattern = /^[.#][A-Za-z_][\w-]*(?:\s+[.#][A-Za-z_][\w-]*)*$/;
export function normalizeMotionState(raw, {observe=false}={}) {
  if(!raw || typeof raw!=='object' || Array.isArray(raw) || !Object.keys(raw).length)throw Error('Movimiento: define un estado explicito.');
  const result={};
  for(const [key,value] of Object.entries(raw)){
    if(numeric.has(key)){
      if(!Number.isFinite(value))throw Error('Movimiento: valor no numerico en '+key);
      if(key==='opacity'&&(value<0||value>1))throw Error('Movimiento: opacidad fuera de 0..1.');
      result[key]=value;
    }else if(origins.has(key)&&!observe){
      if(typeof value!=='string'||value.length>100)throw Error('Movimiento: pivote invalido.');
      result[key]=value;
    }else if(key==='attr'){
      if(!value||typeof value!=='object'||Array.isArray(value)||!Object.keys(value).length)throw Error('Movimiento: atributos invalidos.');
      result.attr={};
      for(const [name,v]of Object.entries(value)){
        if(!attributes.has(name)||!(Number.isFinite(v)||(typeof v==='string'&&v.length<=12000)))throw Error('Movimiento: atributo no admitido '+name);
        result.attr[name]=v;
      }
    }else if(!origins.has(key))throw Error('Movimiento: propiedad no admitida '+key);
  }
  return result;
}
export function normalizeMotionCheckpoints(raw,duration){
  if(raw===undefined)return undefined;
  if(!Array.isArray(raw)||!raw.length||raw.length>100)throw Error('Movimiento: puntos de control invalidos.');
  let previous=-1;
  return raw.map(point=>{
    if(!Number.isFinite(point?.at)||point.at<0||point.at<previous||point.at>duration+.000001)throw Error('Movimiento: punto de control fuera de tiempo.');
    previous=point.at;
    const state=normalizeMotionState(point.state,{observe:true});
    if(!Object.keys(state).length)throw Error('Movimiento: punto de control sin propiedades observables.');
    return {at:point.at,state,phase:String(point.phase??'action').slice(0,60)};
  });
}
const rounded = n=>Math.round(n*1e9)/1e9;
export function normalizeNarrationCue(cue,duration){
  if(cue===undefined)return undefined;
  if(!Number.isInteger(cue.wordIndex)||cue.wordIndex<0||cue.wordIndex>=15000||!Number.isFinite(cue.offset)||cue.offset<0||cue.offset>duration+.000001||!['start','end'].includes(cue.edge))throw Error('Anclaje de narracion invalido.');
  return {wordIndex:cue.wordIndex,offset:cue.offset,edge:cue.edge,phrase:String(cue.phrase??'').slice(0,240)};
}
export function resolveNarrationCue({words,phrase,occurrence,sceneStart,phase,phaseEdge='end',voiceEdge='start'},motion){
  if(!Array.isArray(words)||!words.length||!Number.isFinite(sceneStart)||sceneStart<0||!['start','end'].includes(phaseEdge)||!['start','end'].includes(voiceEdge))throw Error('Se necesitan palabras reales globales, inicio de escena y bordes validos.');
  const token=s=>String(s).normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
  const tokens=String(phrase??'').split(/\s+/).map(token).filter(Boolean),matches=[];
  if(!tokens.length)throw Error('Indica la frase real del audio.');
  for(let i=0;i<=words.length-tokens.length;i++)if(tokens.every((t,j)=>token(words[i+j].text)===t))matches.push(i);
  if(!matches.length)throw Error('La frase no existe en las palabras del audio: '+phrase);
  if(occurrence===undefined&&matches.length!==1)throw Error('Frase repetida: indicar occurrence de forma explicita.');
  const chosen=occurrence??1;
  if(!Number.isInteger(chosen)||chosen<1||chosen>matches.length)throw Error('Aparicion de frase invalida.');
  const points=motion.checkpoints.map((p,i)=>({p,i})).filter(({p})=>p.phase===phase);
  if(points.length!==1)throw Error('La fase que se sincroniza debe existir y ser unica.');
  const {p,i}=points[0],offset=phaseEdge==='end'?p.at:(motion.checkpoints[i-1]?.at??0);
  const wordIndex=matches[chosen-1]+(voiceEdge==='end'?tokens.length-1:0),when=words[wordIndex][voiceEdge];
  if(!Number.isFinite(when))throw Error('La palabra no tiene un tiempo real valido.');
  const at=rounded(when-sceneStart-offset);
  if(at<0)throw Error('La preparacion debe empezar antes de esta escena: replantear el corte o las fases, sin desplazar el audio.');
  return {at,narration:normalizeNarrationCue({wordIndex,offset,edge:voiceEdge,phrase},motion.duration)};
}
export function checkNarrationBindings(project){
  const errors=[];let start=0;
  for(const scene of project.scenes??[]){
    for(const action of scene.direction?.actions??[]){
      const cue=action.narration;if(!cue)continue;
      const word=project.wordTimings?.[cue.wordIndex],expected=word?.[cue.edge],actual=start+action.at+cue.offset;
      if(!Number.isFinite(expected))errors.push(`${scene.id}/${action.id}: anclaje sin palabra real.`);
      else if(Math.abs(actual-expected)>1/(project.fps??24)+.001)errors.push(`${scene.id}/${action.id}: accion a ${actual.toFixed(3)} s; palabra a ${expected.toFixed(3)} s.`);
    }
    start+=scene.duration;
  }
  return errors;
}
// Authoring actions use local offsets; retain authored SVG placement on a parent.
export function separateSvgPlacement(html,selectors){
  const classes=new Set(selectors.map(s=>s.match(/\.([\w-]+)$/)?.[1]).filter(Boolean));
  const ids=new Set(selectors.map(s=>s.match(/#([\w-]+)$/)?.[1]).filter(Boolean));
  const stack=[];
  return String(html).replace(/<\/?g\b(?:[^>"']|"[^"]*"|'[^']*')*>/g,tag=>{
    if(/^<\/g/.test(tag))return tag+(stack.pop()?'</g>':'');
    const transform=tag.match(/\stransform=("[^"]*"|'[^']*')/),names=(tag.match(/\sclass=["']([^"']*)["']/)?.[1]??'').split(/\s+/);
    const id=tag.match(/\sid=["']([^"']*)["']/)?.[1];
    const matched=names.find(n=>classes.has(n))||(ids.has(id)?id:undefined);
    const wrap=!!(matched&&transform),selfClosing=/\/\s*>$/.test(tag);if(!selfClosing)stack.push(wrap);
    if(!wrap)return tag;
    return `<g data-dvj-placement="${matched}" transform=${transform[1]}>`+tag.replace(transform[0],'')+(selfClosing?'</g>':'');
  });
}
export function compileMotionSequence({selector,at=0,from,beats},sceneDuration){
  if(!selectorPattern.test(selector??''))throw Error('Movimiento: usa un selector local de clase o ID.');
  if(!Number.isFinite(at)||at<0||!Number.isFinite(sceneDuration)||sceneDuration<=0)throw Error('Movimiento: inicio o duracion invalidos.');
  if(!Array.isArray(beats)||!beats.length||beats.length>96)throw Error('Movimiento: define entre 1 y 96 fases.');
  const initial=normalizeMotionState(from);
  let state=initial,cursor=0;
  const target='S+'+JSON.stringify(' '+selector),code=[],checkpoints=[{at:0,state:normalizeMotionState(state,{observe:true}),phase:'initial'}];
  for(const beat of beats){
    if(!Number.isFinite(beat.duration)||beat.duration<=0)throw Error('Movimiento: cada fase necesita duracion positiva.');
    const next=normalizeMotionState(beat.to??state),phase=String(beat.phase??'action').slice(0,60),ease=beat.ease??'power2.inOut';
    if(typeof ease!=='string'||!/^(?:none|linear|(?:power[0-4]|sine|expo|circ|bounce)(?:\.(?:in|out|inOut))?|(?:back|elastic)(?:\.(?:in|out|inOut))?(?:\([\d.,\s]+\))?)$/.test(ease))throw Error('Movimiento: easing no disponible.');
    for(const [key,value]of Object.entries(next)){
      if(!(key in initial))throw Error('Movimiento: falta el estado inicial de '+key);
      if(key==='attr')for(const name of Object.keys(value))if(!(name in initial.attr))throw Error('Movimiento: falta el atributo inicial '+name);
      if(origins.has(key)&&value!==initial[key])throw Error('Movimiento: separa pivotes cambiantes en grupos anidados.');
    }
    const to={...state,...next,...(state.attr?{attr:{...state.attr,...next.attr}}:{})};
    if(JSON.stringify(to)===JSON.stringify(state)&&phase!=='hold')throw Error('Movimiento: fase sin cambio; usa hold para una pausa intencional.');
    const end=rounded(cursor+beat.duration);
    if(at+end>sceneDuration+.000001)throw Error('Movimiento: las fases exceden la escena.');
    code.push(`tl.fromTo(${target},${JSON.stringify(state)},{...${JSON.stringify(to)},duration:${beat.duration},ease:${JSON.stringify(ease)},immediateRender:false},T0+${rounded(at+cursor)});`);
    state=to;cursor=end;
    checkpoints.push({at:cursor,state:normalizeMotionState(state,{observe:true}),phase});
  }
  return {duration:cursor,initial,tweens:code.join('\n'),script:`tl.set(${target},${JSON.stringify(initial)},T0);\n`+code.join('\n'),checkpoints:normalizeMotionCheckpoints(checkpoints,cursor)};
}

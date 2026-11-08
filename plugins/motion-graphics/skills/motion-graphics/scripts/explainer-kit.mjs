// Authoring helpers: final projects embed only their generated HTML/CSS/GSAP.
import {createScene} from './kits/scene-kit.mjs';
import {camera} from './kits/camera-kit.mjs';
import {rotateJoint} from './rig-kit.mjs';
import {normalizeActors, normalizeDirection, inspectExplainer} from './compat/src/explainer-contract.mjs';
import {sanitizeCustomScene} from './compat/server-utils.mjs';
import {compileMotionSequence,resolveNarrationCue,separateSvgPlacement} from './compat/src/motion-sequence.mjs';

const target = selector => {
  if (typeof selector !== 'string' || !/^[.#][A-Za-z_][\w-]*(?:\s+[.#][A-Za-z_][\w-]*)*$/.test(selector)) throw Error('Usa un selector local de clases o ID, sin S ni __SCENE__.');
  return `S+${JSON.stringify(' '+selector)}`;
};
const vars = value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Define estados from y to explícitos.');
  const allowed=new Set(['x','y','rotation','scale','scaleX','scaleY','opacity','svgOrigin','transformOrigin','attr']);
  for(const [key,v] of Object.entries(value)){
    if(!allowed.has(key))throw Error('Propiedad de acción no admitida: '+key);
    if(key==='attr'){
      if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Atributos inválidos.');
      for(const [name,a] of Object.entries(v))if(!['transform','x','y','cx','cy','r','rx','ry','width','height','d','opacity','fill','stroke-dashoffset'].includes(name)||!(typeof a==='string'||Number.isFinite(a)))throw Error('Atributo de acción no admitido: '+name);
    }else if(!Number.isFinite(v)&&!(typeof v==='string'&&['svgOrigin','transformOrigin'].includes(key)))throw Error('Estado de acción no numérico: '+key);
  }
  return JSON.stringify(value);
};

export function createExplainer(actorDefinitions) {
  const actors=normalizeActors(actorDefinitions), known=new Set(actors.map(a=>a.id));
  let previous=Object.fromEntries(actors.filter(a=>a.initialState).map(a=>[a.id,a.initialState]));
  return {
    actors,
    scene(options, plan={}) {
      const scene=createScene(options), originalBuild=scene.build.bind(scene);
      let cam;
      const direction=normalizeDirection({...plan,actions:[],shots:[]},scene.duration);
      const initial=new Map(),localMotion=new Set();
      const remember=(selector,at,from)=>{
        if(['x','y','rotation','scale','scaleX','scaleY'].some(k=>k in from))localMotion.add(selector);
        const fields=initial.get(selector)||new Map();
        const put=(key,value)=>{const old=fields.get(key);if(!old||at<old.at)fields.set(key,{at,value:structuredClone(value)});};
        for(const [key,value]of Object.entries(from)){
          if(key==='attr')for(const [name,v]of Object.entries(value))put('attr:'+name,v);
          else put(key,value);
        }
        initial.set(selector,fields);
      };
      scene.action=(action,{from,to,ease='power2.inOut'}={})=>{
        if(!known.has(action.actor))throw Error('Actor no registrado: '+action.actor);
        const checked=normalizeDirection({actions:[action]},scene.duration).actions[0];
        if(!checked.description||!checked.result||!checked.selector)throw Error('La acción necesita descripción, consecuencia y selector.');
        if(direction.actions.some(a=>a.id===checked.id))throw Error('Acción duplicada: '+checked.id);
        const a=vars(from),b=vars(to);scene.touch(action.at+action.duration);
        remember(action.selector,action.at,from);
        scene.js(`tl.fromTo(${target(action.selector)},${a},{...${b},duration:${action.duration},ease:${JSON.stringify(ease)},immediateRender:false},T0+${action.at});`);
        direction.actions.push(checked);return scene;
      };
      scene.sequence=(action,options)=>{
        if(!known.has(action.actor))throw Error('Actor no registrado: '+action.actor);
        const motion=compileMotionSequence({...options,selector:action.selector,at:action.at},scene.duration);
        if(action.duration!==undefined&&Math.abs(action.duration-motion.duration)>.000001)throw Error('La duracion declarada no coincide con las fases.');
        const checked=normalizeDirection({actions:[{...action,duration:motion.duration,checkpoints:motion.checkpoints}]},scene.duration).actions[0];
        if(!checked.description||!checked.result||!checked.selector)throw Error('La secuencia necesita descripcion, consecuencia y selector.');
        if(direction.actions.some(a=>a.id===checked.id))throw Error('Accion duplicada: '+checked.id);
        remember(action.selector,action.at,motion.initial);
        scene.touch(action.at+motion.duration);scene.js(motion.tweens);direction.actions.push(checked);return scene;
      };
      scene.narratedSequence=(action,options,cue)=>{
        if(action.at!==undefined)throw Error('La secuencia narrada calcula at desde la palabra real.');
        const motion=compileMotionSequence({...options,selector:action.selector,at:0},scene.duration);
        const anchor=resolveNarrationCue(cue,motion);
        return scene.sequence({...action,...anchor},options);
      };
      scene.pose=(action,angles)=>{
        if(!known.has(action.actor))throw Error('Actor no registrado: '+action.actor);
        const entries=Object.entries(angles||{});if(!entries.length)throw Error('La pose necesita articulaciones.');
        const checked=normalizeDirection({actions:[action]},scene.duration).actions[0];
        if(!checked.result||!checked.description)throw Error('La pose necesita acción y consecuencia.');
        if(direction.actions.some(a=>a.id===checked.id))throw Error('Acción duplicada: '+checked.id);
        for(const [joint,pair]of entries){if(!Array.isArray(pair)||pair.length!==2||!pair.every(Number.isFinite))throw Error('Cada articulación necesita [desde,hasta].');remember('.'+joint,action.at,{attr:{transform:'rotate('+pair[0]+')'}});scene.js(rotateJoint(joint,{from:pair[0],to:pair[1],at:action.at,duration:action.duration}));}
        scene.touch(action.at+action.duration);direction.actions.push({...checked,selector:action.selector||'.'+entries[0][0]});return scene;
      };
      scene.shot=({at,duration,scale='medium',target:focusName,purpose,focus,k=1,fixed=false})=>{
        const shot=normalizeDirection({shots:[{at,duration,scale,target:focusName,purpose,fixed}]},scene.duration).shots[0];
        if(!focusName||!purpose)throw Error('El plano necesita foco y proposito.');
        if(!fixed){
          if(!Array.isArray(focus)||focus.length!==2||!focus.every(Number.isFinite)||!Number.isFinite(k)||k<=0)throw Error('El plano movil necesita coordenadas y zoom positivo.');
          (cam??=camera(scene)).move(at,duration,{focus,k});
        }
        direction.shots.push(shot);return scene;
      };
      scene.build=opts=>{
        if(!direction.objective)throw Error('Falta el objetivo explicativo.');
        if(!direction.actions.length&&!direction.holdReason)throw Error('Faltan acciones o una pausa justificada.');
        for(const [actor,state]of Object.entries(direction.before)){
          if(!known.has(actor))throw Error('Actor no registrado en continuidad: '+actor);
          if(previous[actor]&&previous[actor]!==state&&!direction.transition)throw Error('Estado discontinuo de '+actor+': conserva el estado o explica el salto en transition.');
        }
        const record={...originalBuild(opts),direction};
        const prefix=[...initial].map(([selector,fields])=>{
          const from={};for(const [key,{value}]of fields){if(key.startsWith('attr:')){from.attr??={};from.attr[key.slice(5)]=value;}else from[key]=value;}
          return `tl.set(${target(selector)},${vars(from)},T0);`;
        }).join('\n');
        record.customScene=sanitizeCustomScene({...record.customScene,html:separateSvgPlacement(record.customScene.html,[...localMotion]),script:prefix+'\n'+record.customScene.script},record.id);
        previous={...previous,...direction.after};return record;
      };
      return scene;
    },
    inspect(project){return inspectExplainer({...project,actors});},
  };
}

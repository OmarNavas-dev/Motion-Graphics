import {checkTime} from './scene-kit.mjs';
export function claimVisual(scene,id){
 if(!/^[A-Za-z][\w-]*$/.test(id??''))throw Error('Identidad visual invalida.');
 scene._visualIds??=new Set();if(scene._visualIds.has(id))throw Error('Identidad visual duplicada: '+id);scene._visualIds.add(id);
}

// Authoring-only helpers. Serialized functions must be self-contained and use
// only their root, numeric time and JSON configuration. No wall-clock state.
export function procedural(scene,{selector,draw,config={},at=0,duration=scene.duration,from=0,to=duration}={}){
 if(typeof selector!=='string'||!/^\.[A-Za-z][\w-]*$/.test(selector))throw Error('Procedural: usa una clase local simple.');
 if(typeof draw!=='function'||![from,to].every(Number.isFinite))throw Error('Procedural: dibujo y reloj invalidos.');
 checkTime(scene,at,duration,'procedural');
 if(duration<=0)throw Error('Procedural: duracion positiva requerida.');
 const data=JSON.stringify(config);if(data===undefined)throw Error('Configuracion JSON requerida.');
 scene.use('procedural');
 scene.js(`{const draw=${draw.toString()},config=${data},root=document.querySelector(S+${JSON.stringify(' '+selector)}),clock={t:${from}};if(!root)throw Error('Procedural root missing: '+${JSON.stringify(selector)});const update=()=>draw(root,clock.t,config);update();tl.fromTo(clock,{t:${from}},{t:${to},duration:${duration},ease:'none',immediateRender:false,onUpdate:update},T0+${at});}`);
 return scene;
}

export function symbolInstances(scene,{id,markup,instances,layer='fg',className='instances'}={}){
 if(!/^[A-Za-z][\w-]*$/.test(id??'')||typeof markup!=='string'||!markup.trim()||!Array.isArray(instances)||instances.length>10000)throw Error('Instancias invalidas.');
 if(!/^[A-Za-z][\w-]*$/.test(className))throw Error('Clase de instancia invalida.');claimVisual(scene,id);
 scene.defs(id,`<g id="${scene.gid(id)}">${markup}</g>`);
 const body=instances.map(p=>{const {x=0,y=0,scale=1,rotation=0,opacity=1}=p;if(![x,y,scale,rotation,opacity].every(Number.isFinite)||scale<=0||opacity<0||opacity>1)throw Error('Transformacion de instancia invalida.');return `<use href="#${scene.gid(id)}" transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})" opacity="${opacity}"/>`;}).join('');
 scene.add(layer,`<g class="${className}">${body}</g>`);return scene;
}

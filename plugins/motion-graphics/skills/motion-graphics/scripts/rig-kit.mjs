// Adapted from the user's escenas-customscene package: fixed placement outside
// motion, separate responsibilities, and held objects belonging to their joint.
// Authoring helpers only. Their SVG/script output is embedded in the final JSON.
const name=s=>{if(typeof s!=='string'||! /^[A-Za-z_][\w-]*$/.test(s))throw Error('Nombre de rig invalido.');return s;};
const number=(n,label)=>{if(!Number.isFinite(n))throw Error(label+' invalido.');return n;};
export function rig(id,{x=0,y=0,scale=1,parts=''}={}) {
 name(id);[x,y,scale].forEach(n=>number(n,'Transform'));if(scale===0)throw Error('Escala cero.');
 return `<g data-dvj-placement="${id}" transform="translate(${x} ${y}) scale(${scale})"><g class="${id}-move"><g class="${id}-scale"><g class="${id}-sway">${parts}</g></g></g></g>`;
}
export function joint(id,{x=0,y=0,rest=0,shape='',held=''}={}) {
 name(id);[x,y,rest].forEach(n=>number(n,'Pivote'));
 return `<g data-dvj-placement="${id}" transform="translate(${x} ${y}) rotate(${rest})"><g class="${id}" data-dvj-joint="true" transform="rotate(0)">${shape}${held}</g></g>`;
}
export function heldObject(id,{x=0,y=0,angle=0,shape=''}={}) {
 name(id);[x,y,angle].forEach(n=>number(n,'Anclaje'));
 return `<g class="${id}" data-dvj-held="true" transform="translate(${x} ${y}) rotate(${angle})">${shape}</g>`;
}
export function rotateJoint(id,{from=0,to=0,at=0,duration=.4,ease='sine.inOut'}={}) {
 name(id);[from,to,at,duration].forEach(n=>number(n,'Movimiento'));if(at<0||duration<=0)throw Error('Intervalo de articulacion invalido.');
 // SVG rotate around local (0,0), unaffected by shape bounds or a held object.
 return `tl.fromTo(S+' .${id}',{attr:{transform:'rotate(${from})'}},{attr:{transform:'rotate(${to})'},duration:${duration},ease:${JSON.stringify(ease)},immediateRender:false},T0+${at});`;
}
export function repeatBudget({at=0,duration,sceneDuration,stagger=0,count=1,repeatDelay=0,maxRepeat=Infinity}) {
 [at,duration,sceneDuration,stagger,repeatDelay].forEach(n=>number(n,'Tiempo'));
 if(at<0||duration<=0||sceneDuration<=0||stagger<0||repeatDelay<0||!Number.isInteger(count)||count<1||!(maxRepeat===Infinity||Number.isInteger(maxRepeat)&&maxRepeat>=0))throw Error('Presupuesto de movimiento invalido.');
 // GSAP repeats the whole staggered sequence. Per-item repeat inside a stagger
 // object has different semantics and is intentionally not generated here.
 const span=duration+stagger*(count-1),available=sceneDuration-at;
 if(span>available+1e-8)throw Error('El primer ciclo no cabe en la escena.');
 const repeat=Math.min(maxRepeat,Math.max(0,Math.floor((available+repeatDelay+1e-8)/(span+repeatDelay))-1));
 return {repeat,end:at+span*(repeat+1)+repeatDelay*repeat};
}
export function sceneSelectors(selectors) {
 const list=selectors.split(',').map(s=>s.trim()).filter(Boolean);
 if(!list.length)throw Error('Selector vacio.');
 return list.map(s=>"S+"+JSON.stringify(' '+s)).join("+','+");
}
export function seededRandom(seed) {
 let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
}


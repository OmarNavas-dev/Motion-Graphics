import {createExplainer} from '../scripts/explainer-kit.mjs';
import * as K from '../scripts/kits/index.mjs';

// Original silent material study. The same geometry and actors persist across the cut.
// Shot sheet: satin coral sphere / translucent cyan elastomer / brushed supports;
// camera approaches the contact then returns; the indentation itself is the effect;
// no labels, captions, narration or invented measurements are needed.
const free={ball:'Sphere center (360,490), radius 80; suspended above the material.',sheet:'Flat elastomer surface at y=760, anchored at x=100 and x=620.'};
const loaded={ball:'Sphere center (360,770), radius 80; held against the indented material.',sheet:'Central contact at y=850; edges remain fixed at y=760.'};
const production=createExplainer([
 {id:'ball',name:'Coral sphere',appearance:'Coral satin sphere, radius 80, upper-left highlight.',parts:['sphere','highlight'],initialState:free.ball},
 {id:'sheet',name:'Cyan elastomer',appearance:'Cyan flexible membrane with dark blue thickness and fixed end clamps.',parts:['surface','thickness','clamps'],initialState:free.sheet},
]);
const surface=d=>`M100 760 C205 760 270 ${760+d} 360 ${760+d} C450 ${760+d} 515 760 620 760`;
const body=d=>`${surface(d)} L620 810 C515 810 450 ${810+d} 360 ${810+d} C270 ${810+d} 205 810 100 810 Z`;
function art(s,depth,y){
 s.defs('sphere',`<radialGradient id="${s.gid('sphere')}" cx=".3" cy=".24" r=".8"><stop stop-color="#ffd7b9"/><stop offset=".35" stop-color="#ff896e"/><stop offset=".75" stop-color="#dc514d"/><stop offset="1" stop-color="#862d46"/></radialGradient>`);
 s.defs('rubber',`<linearGradient id="${s.gid('rubber')}" x2="0" y2="1"><stop stop-color="#54f0da"/><stop offset=".5" stop-color="#24bcb8"/><stop offset="1" stop-color="#116f89"/></linearGradient>`);
 s.add('bg',`<rect x="-220" y="-220" width="1160" height="1720" fill="#0c172b"/><ellipse cx="360" cy="890" rx="290" ry="210" fill="#163347" opacity=".6"/>`);
 s.add('fg',`<ellipse cx="360" cy="1010" rx="265" ry="27" fill="#040c1b" opacity=".8"/>`);
 s.add('fg',K.steel(s,{x:74,y:780,w:52,h:215,tone:'#374e67',rivets:2,texture:.09}));
 s.add('fg',K.steel(s,{x:594,y:780,w:52,h:215,tone:'#374e67',rivets:2,texture:.09}));
 s.add('fg',`<path class="material-body" d="${body(depth)}" fill="${s.url('rubber')}" stroke="#09556c" stroke-width="2"/><path class="material-surface" d="${surface(depth)}" fill="none" stroke="#b2fff0" stroke-width="5"/><path d="M100 760 L100 810 M620 760 L620 810" stroke="#ecffff" stroke-width="4"/>`);
 s.add('fg',`<g transform="translate(360 ${y})" data-dvj-placement="ball"><g class="ball-move"><circle r="80" fill="${s.url('sphere')}" stroke="#ffbba1" stroke-width="1"/><ellipse cx="-25" cy="-32" rx="21" ry="11" fill="#fff2d7" opacity=".27" transform="rotate(-35)"/></g></g>`);
 s.add('fg',K.steel(s,{x:76,y:744,w:47,h:30,tone:'#8ca2ab',rivets:2,texture:.08}));
 s.add('fg',K.steel(s,{x:597,y:744,w:47,h:30,tone:'#8ca2ab',rivets:2,texture:.08}));
}
const scenes=[];
function action(s,id,actor,at,duration,selector,from,to,description,result,ease){s.action({id,actor,at,duration,selector,description,result},{from,to,ease});}
function deform(s,id,at,duration,from,to,ease){
 action(s,id+'-body','sheet',at,duration,'.material-body',{attr:{d:body(from)}},{attr:{d:body(to)}},'The elastomer volume changes with central displacement.','Anchors stay fixed and the central indentation changes.',ease);
 action(s,id+'-surface','sheet',at,duration,'.material-surface',{attr:{d:surface(from)}},{attr:{d:surface(to)}},'The contact surface follows the same displacement.','The bright surface stays attached to the material body.',ease);
}
{
 const s=production.scene({id:'press',duration:4},{objective:'Show approach, contact, indentation and a loaded hold.',before:free,after:loaded,materials:'Satin coral sphere; translucent cyan elastomer; brushed metal clamps.',lighting:'Upper-left soft light and dark grounded shadow.',holdReason:'The final 0.85 seconds show the loaded equilibrium.'});
 art(s,0,490);
 s.shot({at:.1,duration:1.5,scale:'close',target:'Contact between sphere and membrane',purpose:'Approach the cause of the indentation.',focus:[360,704],k:1.08});
 action(s,'approach','ball',.25,.9,'.ball-move',{y:0},{y:190},'Sphere descends toward the surface.','The bottom reaches the flat membrane at y=760.','power2.in');
 action(s,'press-down','ball',1.15,2,'.ball-move',{y:190},{y:280},'The sphere presses 90 pixels into the elastomer.','Bottom remains tangent to the center of the deformed surface.','power2.inOut');
 deform(s,'indent',1.15,2,0,90,'power2.inOut');
 scenes.push(s.build({title:'Compresion',scriptExcerpt:''}));
}
{
 const s=production.scene({id:'recover',duration:4},{objective:'Release the load and show damped elastic recovery.',before:loaded,after:free,materials:'The same sphere, membrane, clamps and light.',lighting:'Same upper-left illumination.',transition:'Direct cut at identical geometry, loading and camera pose.',holdReason:'The final 0.8 seconds confirm the flat resting state.'});
 art(s,90,770);
 // First shot is a zero-distance initialization over 1ms, then a motivated pullback.
 s.shot({at:0,duration:.001,scale:'close',target:'Loaded contact',purpose:'Keep the previous camera pose at the cut.',focus:[360,704],k:1.08});
 s.shot({at:2.5,duration:.7,scale:'medium',target:'Sphere and restored membrane',purpose:'Reveal full recovery and renewed separation.',focus:[360,704],k:1});
 action(s,'unload','ball',.35,.95,'.ball-move',{y:0},{y:-90},'The sphere unloads the material while remaining in contact.','The surface returns to its neutral plane.','power2.inOut');
 deform(s,'restore',.35,.95,90,0,'power2.inOut');
 action(s,'lift','ball',1.3,1.4,'.ball-move',{y:-90},{y:-280},'The sphere separates and rises.','The sphere returns to its initial height.','power2.out');
 deform(s,'overshoot',1.3,.28,0,-10,'sine.out');
 deform(s,'settle-down',1.58,.36,-10,4,'sine.inOut');
 deform(s,'settle-flat',1.94,.76,4,0,'sine.out');
 scenes.push(s.build({title:'Recuperacion',scriptExcerpt:''}));
}
export default scenes;
export const projectBase={name:'Elasticidad - prueba silenciosa',format:'vertical',resolution:'720p',fps:24,palette:'aurora',style:'cinematic',visualEngine:'adaptive',showText:false,captionMode:'none',audioAsset:'',musicAsset:'',fontAsset:'',script:'',creativeBrief:'Silent original material study: coral sphere presses a cyan elastomer between metal clamps. Two scenes preserve exact contact and state across the cut. Dark studio, soft directional light, visible thickness and surface highlight. No narration, labels or captions.',characterMode:'new',references:[],narrationMode:'single',voiceClips:[],actors:production.actors,scenes:[]};

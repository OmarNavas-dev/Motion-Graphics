import {rig,joint,heldObject,rotateJoint} from '../scripts/rig-kit.mjs';
// Component exercise, not a prescribed character style or a narrated story.
const held=heldObject('lamp',{x:0,y:110,shape:'<circle r="13" fill="#d9b18d"/><path d="M0 0L26 10" stroke="#c7b67b" stroke-width="6"/><path d="M26 -2H55V36H26Z" fill="#b79a5b"/><rect x="32" y="4" width="17" height="23" fill="#ffe5a2"/>'});
const forearm=joint('elbow',{x:0,y:110,shape:'<path d="M0 0V105" stroke="#62838c" stroke-width="28" stroke-linecap="round"/><circle r="18" fill="#adbec0"/>',held});
const arm=joint('shoulder',{x:60,y:-160,shape:'<path d="M0 0V110" stroke="#86a7a8" stroke-width="35" stroke-linecap="round"/><circle r="21" fill="#c5cfc6"/>',held:forearm});
const art=rig('actor',{x:300,y:790,parts:'<path d="M-65 -200Q0 -225 65 -200L88 130H-88Z" fill="#3d626c"/><rect x="-24" y="-245" width="48" height="55" fill="#bac7c3"/><path d="M-46 -325Q0 -350 46 -325L40 -250Q0 -224 -40 -250Z" fill="#9cafac"/><path d="M-24 -288H-8M10 -288H27" stroke="#263e48" stroke-width="7"/>'+arm});
export default [{id:'rig-example',title:'Articulacion y objeto sujeto',duration:4,scriptExcerpt:'',customScene:{
 html:'<svg viewBox="0 0 720 1280" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rig-example-bg" x2="0" y2="1"><stop stop-color="#13212f"/><stop offset="1" stop-color="#344b50"/></linearGradient></defs><rect width="720" height="1280" fill="url(#rig-example-bg)"/><path d="M0 1050H720" stroke="#5d7876" stroke-width="2"/>'+art+'</svg>',
 css:'__SCENE__ svg{width:100%;height:100%;display:block}',
 script:rotateJoint('shoulder',{to:-45,at:.5,duration:.8})+rotateJoint('elbow',{to:-55,at:.7,duration:.8})+rotateJoint('elbow',{from:-55,to:0,at:2.3,duration:.8})+rotateJoint('shoulder',{from:-45,to:0,at:2.5,duration:.8})
}}];


import assert from 'node:assert/strict';
import {auditStoryboardV3} from './audit-storyboard-v3.mjs';
import {gateSequentialQuality} from './gate-sequential-quality.mjs';

const project={
 name:'Prueba causal',scenes:[],wordTimings:[
  {text:'sellaron',start:1.5,end:1.8},{text:'envolvieron',start:5.5,end:5.9}
 ]
};
const plan={
 schema:'motion-studio.storyboard/v3',duration:8,
 source:{narration:'SRT original',audioDuration:8},
 styleBible:{materials:'polímero translúcido sombreado',cameraGrammar:'detalle de contacto motivado',identity:'las mismas dos láminas'},
 scenes:[
  {id:'a',start:0,end:4,visualMode:'mechanism',actors:['rodillo'],props:['lámina','costura'],incoming:'láminas separadas',outgoing:'láminas unidas'},
  {id:'b',start:4,end:8,visualMode:'mechanism',actors:['operador'],props:['paquete','protector'],incoming:'paquete abierto',outgoing:'paquete protegido'}
 ],
 shots:[
  {id:'a1',sceneId:'a',start:0,end:4,visualPurpose:'el rodillo presiona dos películas y aparece una costura continua',
   framing:'detalle lateral del rodillo y las capas',camera:{motion:'dolly suave al contacto',reason:'explicar presión'},
   speechAnchor:{text:'sellaron',at:1.5},raccord:'la costura enlaza con el empaquetado',
   phases:[
    {kind:'cause',start:.1,end:1,selector:'.roller',change:'rotation: 0 a 90'},
    {kind:'contact',start:1,end:2,selector:'.film',change:'x: 80 a 0'},
    {kind:'result',start:2,end:3.5,selector:'.seam',change:'opacity: 0 a 1'}]},
  {id:'b1',sceneId:'b',start:4,end:8,visualPurpose:'el operador acomoda una lámina protectora alrededor de la caja',
   framing:'plano medio tres cuartos de la mesa',camera:{motion:'paneo lateral corto',reason:'seguir agarre'},
   speechAnchor:{text:'envolvieron',at:5.5},raccord:'corte motivado al paquete final',
   phases:[
    {kind:'cause',start:4.2,end:5.2,selector:'.hand',change:'x: 0 a 70'},
    {kind:'contact',start:5.2,end:6.2,selector:'.wrapper',change:'rotation: -10 a 0'},
    {kind:'result',start:6.2,end:7.8,selector:'.wrapped',change:'opacity: 0 a 1'}]}
 ]
};
for(const [i,id] of ['a','b'].entries()){
 const shot=plan.shots[i],selectors=shot.phases.map(p=>p.selector);
 project.scenes.push({id,duration:4,
  customScene:{html:selectors.map(s=>'<g class="'+s.slice(1)+'"></g>').join(''),css:'',
   script:selectors.map(s=>"tl.to(S+' "+s+"',{x:12,duration:1},0);").join('\n')},
  direction:{visualMode:'mechanism',objective:shot.visualPurpose,
   actions:shot.phases.map(p=>({selector:p.selector,action:p.change,result:'el material cambió de forma visible'})),
   shots:[{at:0,duration:4,purpose:shot.visualPurpose}]}
 });
}
const clone=x=>structuredClone(x);
const codes=r=>r.issues.map(x=>x.code);
const ok=auditStoryboardV3(plan,project);
assert.equal(ok.pass,true,JSON.stringify(ok.issues));
assert.equal(ok.visualApproved,false,'Nunca autoaprobar calidad visual.');
assert(codes(auditStoryboardV3(null,project)).includes('STORYBOARD_MISSING'));
const missingTarget=clone(project);missingTarget.scenes[0].customScene.script='';
assert(codes(auditStoryboardV3(plan,missingTarget)).includes('PHASE_NOT_EXECUTED'));
const missingCausal=clone(plan);missingCausal.shots[0].phases=missingCausal.shots[0].phases.filter(x=>x.kind!=='contact');
assert(codes(auditStoryboardV3(missingCausal,project)).length===0,'Sin contacto declarado no inventar contacto obligatorio.');
const badAnchor=clone(plan);badAnchor.shots[1].speechAnchor={text:'inventada',at:5.5};
assert(codes(auditStoryboardV3(badAnchor,project)).includes('SPEECH_ANCHOR_NOT_FOUND'));
const repeated=clone(project);
for(let i=0;i<8;i++){
 const scene=clone(project.scenes[i%2]);
 scene.id='test'+i;scene.direction.shots[0].purpose='Mostrar causa contacto y resultado sin cortar mecanismo';
 scene.customScene.script += "\ntl.fromTo(S+' .camera',{scale:1},{scale:1.04,duration:D},0);";
 repeated.scenes.push(scene);
}
assert(codes(auditStoryboardV3(null,repeated)).includes('REPEATED_SHOT_PURPOSE'));
const blocked=gateSequentialQuality(project,{},{storyboard:plan});
assert.equal(blocked.blockedAt,1,'No se debe pasar etapa 1 sin revisión humana.');
console.log('PASS storyboard v3: preflight, congruencia, contacto, ancla, código, rechazo de plantilla y gate visual.');

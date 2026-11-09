import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_ACTIONS,createCharacterAction,createCharacterProject,characterPoseAt,
 inspectCharacterMotion,validateCharacterRig,solveLimb} from './src/character-motion.mjs';
import {validateProject} from './server-utils.mjs';
import {validateProject as validateInPlugin} from './plugins/motion-graphics/skills/motion-graphics/scripts/compat/server-utils.mjs';
import {renderAuthored} from './src/authored-renderer.mjs';
import {inspectContactSamples} from './src/contact-motion-audit.mjs';
import {generateCharacterWorkflow} from './plugins/motion-graphics/skills/motion-graphics/scripts/generate-character-project.mjs';

test('P5: cinco planes de acción se importan de forma idéntica en sistema y complemento',()=>{
 const project=createCharacterProject();
 assert.equal(project.scenes.length,5);
 assert.deepEqual(project.scenes.map(s=>s.authored.characterRules.action),CHARACTER_ACTIONS);
 const validated=validateProject(project);
 assert.deepEqual(validateInPlugin(project),validated);
 assert.deepEqual(validateProject(validated),validated);
 assert.equal(validated.scenes.every(s=>s.authored.layers.some(l=>l.type==='character')),true);
 assert.deepEqual(generateCharacterWorkflow({action:'all',demo:true}),validated);
});

for(const action of CHARACTER_ACTIONS)test('P5: '+action+' conserva articulaciones, expresiones y anclas verificables',()=>{
 const rig=createCharacterAction(action),duration=rig.poses.at(-1).at;
 const report=inspectCharacterMotion(rig,{duration});
 assert.equal(report.passed,true,JSON.stringify(report.findings));
 assert.ok(report.plantedPairs>0);
 assert.ok(report.maxStretch<1);
 const project=validateProject(createCharacterProject({action}));
 const scene=project.scenes[0];
 const html=[0.3,duration*.6].map(time=>renderAuthored(scene.authored,
   {time,duration,width:1280,height:720,showText:true}));
 assert.ok(html.every(frame=>frame.includes('data-dvj-rig="protagonist"')));
 assert.ok(html.every(frame=>frame.includes('data-dvj-foot="left"')&&frame.includes('data-dvj-foot="right"')));
 assert.ok(html.every(frame=>frame.includes('data-dvj-joint="left-elbow"')&&frame.includes('data-dvj-joint="right-knee"')));
 assert.notEqual(html[0],html[1]);
});

test('P5: caminar mantiene puntos plantados estables durante el desplazamiento de raíz',()=>{
 const rig=createCharacterAction('walk'),duration=rig.poses.at(-1).at;
 const samples=[];
 for(let frame=0;frame<Math.floor(duration*24);frame++){
  const time=frame/24,p=characterPoseAt(rig.poses,time);
  samples.push({scene:'walk',time,feet:['left','right'].map(id=>({id,
    x:(p.rootX+p[id+'Foot'][0])*1.6,y:(p.rootY+p[id+'Foot'][1])*1.6,contact:p.contact[id]}))});
 }
 const report=inspectContactSamples(samples,{slideThresholdPx:7});
 assert.ok(report.plantedPairs>20);
 assert.equal(report.findings.length,0,JSON.stringify(report.findings.slice(0,3)));
});

test('P5: detecta deslizamiento, articulación inalcanzable y deformaciones excesivas',()=>{
 const actor=createCharacterAction('greet');
 const badSlide=structuredClone(actor);
 badSlide.poses[1].leftFoot=[140,280];
 const report=inspectCharacterMotion(badSlide,{duration:badSlide.poses.at(-1).at});
 assert.equal(report.passed,false);
 assert.ok(report.findings.some(f=>f.code==='FOOT_SLIDE'));
 assert.throws(()=>validateProject({...createCharacterProject({action:'greet'}),scenes:[{
   ...createCharacterProject({action:'greet'}).scenes[0],authored:{
     ...createCharacterProject({action:'greet'}).scenes[0].authored,layers:[
       {id:'bad-character',type:'character',x:50,y:50,width:30,height:40,actor:badSlide}]}}]}),/P5: personaje con problemas de contacto/);
 const unreachable=structuredClone(actor);unreachable.poses[1].rightHand=[240,270];
 assert.throws(()=>validateCharacterRig(unreachable,unreachable.poses.at(-1).at),/articulación/);
 const deformation=structuredClone(actor);deformation.poses[1].squash=.75;
 assert.throws(()=>validateCharacterRig(deformation,deformation.poses.at(-1).at),/límites anatómicos/);
 assert.throws(()=>solveLimb([0,0],[200,0],40,40),/articulación/);
});

test('P5: agarre sigue el puño, las expresiones cambian y la customización conserva la pose',()=>{
 const rig=createCharacterAction('reach');
 const scene=validateProject(createCharacterProject({action:'reach'})).scenes[0];
 const early=renderAuthored(scene.authored,{time:.25,duration:scene.duration,width:1280,height:720});
 const late=renderAuthored(scene.authored,{time:1.5,duration:scene.duration,width:1280,height:720});
 assert.ok(!early.includes('data-dvj-held="right"'));
 assert.ok(late.includes('data-dvj-held="right"'));
 const custom=createCharacterProject({action:'custom',rig:{id:'narrator',poses:rig.poses}});
 assert.equal(validateProject(custom).scenes[0].authored.layers[1].actor.id,'narrator');
 assert.equal(custom.scenes[0].authored.characterRules.action,'custom');
 const reactions=validateProject(createCharacterProject({action:'react'})).scenes[0];
 assert.notEqual(renderAuthored(reactions.authored,{time:.5,duration:reactions.duration}),
   renderAuthored(reactions.authored,{time:2,duration:reactions.duration}));
});

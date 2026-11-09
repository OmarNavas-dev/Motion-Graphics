import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProject} from './server-utils.mjs';
import {
  VISUAL_REVISION_SCHEMA,createVisualDefectReport,projectFingerprint,applyVisionRevisionPlan,
} from './plugins/motion-graphics/skills/motion-graphics/scripts/visual-iteration.mjs';
import {runVisualAutoLoop} from './src/visual-auto-loop.mjs';
import {visionModelConfig,assertVisionModel,proposeVisionRevisions,judgeVisionRevision,
  chatVision,chooseScenesForVision} from './src/visual-vision-review.mjs';

const original=()=>validateProject({name:'prueba P1',format:'vertical',palette:'aurora',
  script:'Aparece el texto',audioAsset:'',musicAsset:'',scenes:[{
    id:'escena-1',duration:3,layout:'hero',title:'Aparece el texto',subtitle:'',
    imageAsset:'',cues:[],approved:true,scriptExcerpt:'Aparece el texto',
    authored:{background:{color:'#111111'},layers:[{id:'txt',type:'text',text:'Hola',
      color:'#111111',x:0,y:0,size:34}]},
  }]});
const report=(p,low=true)=>createVisualDefectReport(p,{
  visualAudit:{metrics:{frozenSegments:[],lowContrastSegments:low?[{startSeconds:0,endSeconds:2}]:[],
    largeVisualChanges:[]},video:{audioPresent:false}},
  contactSheet:{captured:1,frames:[{scene:'escena-1',seconds:1.5,file:'001.png'}],errors:[]},
},{jobId:'job-'+(low?'old':'new')});
const revision=(project,r)=>({schema:VISUAL_REVISION_SCHEMA,projectHash:projectFingerprint(project),
  sourceJobId:r.jobId,scenes:[{sceneId:'escena-1',confidence:.92,
    localSeconds:1.5,observation:'Texto ilegible contra el fondo oscuro',type:'authoredLayers',
    layerEdits:[{layerId:'txt',color:'#ffffff',x:10}]}]});

test('P1 visual corrige escena específica sin cambiar narración, IDs o aprobación',()=>{
  const p=original(),r=report(p),applied=applyVisionRevisionPlan(p,r,revision(p,r));
  assert.equal(applied.project.scenes[0].authored.layers[0].color,'#ffffff');
  assert.equal(applied.project.scenes[0].approved,false);
  assert.equal(applied.project.scenes[0].duration,p.scenes[0].duration);
  assert.equal(applied.project.script,p.script);
  assert.equal(p.scenes[0].authored.layers[0].color,'#111111');
  assert.throws(()=>applyVisionRevisionPlan(p,r,{...revision(p,r),projectHash:'wrong'}),/inválido/);
  assert.throws(()=>applyVisionRevisionPlan(p,r,{...revision(p,r),scenes:[{
    ...revision(p,r).scenes[0],layerEdits:[{layerId:'txt',asset:'evil.mp4'}]}]}),/No se permite/);
});

test('P1 solo acepta sustituciones GSAP mediante validador y sin alterar la escena original',()=>{
  const p=original();p.scenes[0].customScene={html:'<div class="sol"></div>',css:'',script:''};
  const r=report(p),plan={...revision(p,r),scenes:[{sceneId:'escena-1',confidence:.9,
    localSeconds:1,observation:'La figura falta en la composición',type:'customScene',
    customScene:{html:'<div class="nueva"></div>',css:'',script:''}}]};
  assert.throws(()=>applyVisionRevisionPlan(p,r,plan),/validador/);
  const corrected=applyVisionRevisionPlan(p,r,plan,{validateCustomScene:x=>x});
  assert.match(corrected.project.scenes[0].customScene.html,/nueva/);
});

test('P1 ejecuta render de prueba, revisa mejora y entrega candidato sin autoaprobar',async()=>{
  const p=original(),before=report(p),old={id:'job-old',engine:'remotion',output:'old.mp4',
    attempt:1,projectHash:projectFingerprint(p),status:'completado',visualDefects:before};
  let rendered=0;
  const result=await runVisualAutoLoop({project:p,sourceJob:old,validateProject,
    propose:async(candidate,source)=>({plan:revision(candidate,source.visualDefects)}),
    render:async candidate=>{
      rendered++;
      const after=report(candidate,false);
      return {id:'job-new',status:'completado',visualDefects:after,
        qualityEvidence:{screenshotEvidence:true}};
    },
    wait:async job=>job,
    judge:async()=>({accepted:true,judgments:[{sceneId:'escena-1',improved:true,confidence:.95}]}),
  });
  assert.equal(rendered,1);
  assert.equal(result.status,'review_ready');
  assert.equal(result.rounds[0].status,'candidate_improved');
  assert.equal(result.project.scenes[0].approved,false);
  assert.equal(p.scenes[0].authored.layers[0].color,'#111111');
});

test('P1 rechaza un cambio perceptualmente peor aunque se haya renderizado',async()=>{
  const p=original(),old={id:'job-old',engine:'remotion',output:'old.mp4',
    attempt:1,projectHash:projectFingerprint(p),status:'completado',visualDefects:report(p)};
  const result=await runVisualAutoLoop({project:p,sourceJob:old,validateProject,
    propose:async(candidate,source)=>({plan:revision(candidate,source.visualDefects)}),
    render:async candidate=>({id:'job-new',status:'completado',
      qualityEvidence:{screenshotEvidence:true},visualDefects:report(candidate,false)}),
    wait:async x=>x,judge:async()=>({accepted:false,judgments:[{reason:'Pérdida de detalle'}]}),
  });
  assert.equal(result.status,'needs_review');
  assert.equal(result.project,null);
  assert.equal(result.rounds[0].status,'candidate_rejected');
});
test('P8 final exige mejora respecto a la referencia aunque el modelo visual apruebe',async()=>{
  const p=original(),old={id:'job-old',engine:'remotion',output:'old.mp4',attempt:1,
    projectHash:projectFingerprint(p),status:'completado',visualDefects:report(p)};
  let measured=0;
  const result=await runVisualAutoLoop({project:p,sourceJob:old,validateProject,
    propose:async(candidate,source)=>({plan:revision(candidate,source.visualDefects)}),
    render:async candidate=>({id:'job-new',status:'completado',qualityEvidence:{screenshotEvidence:true},visualDefects:report(candidate,false)}),
    wait:async x=>x,judge:async()=>({accepted:true}),
    compareReference:async()=>{measured++;return {passed:false,relativeGain:-.14};},
  });
  assert.equal(measured,1);assert.equal(result.status,'needs_review');
  assert.equal(result.rounds[0].status,'candidate_rejected');
  assert.equal(result.project,null);
});

test('P1 realimenta un error de contrato al modelo y exige corrección antes de renderizar',async()=>{
  const p=original(),old={id:'job-old',engine:'remotion',output:'old.mp4',
    attempt:1,projectHash:projectFingerprint(p),status:'completado',visualDefects:report(p)};
  let calls=0,rendered=0;
  const result=await runVisualAutoLoop({project:p,sourceJob:old,validateProject,
    propose:async(candidate,source,{validationFeedback}={})=>{
      calls++;
      if(calls===2)assert.match(validationFeedback,/No se permite/);
      const plan=revision(candidate,source.visualDefects);
      if(calls===1)plan.scenes[0].layerEdits=[{layerId:'txt',asset:'external-file'}];
      return {plan};
    },
    render:async candidate=>{rendered++;return{id:'job-new',status:'completado',
      qualityEvidence:{screenshotEvidence:true},visualDefects:report(candidate,false)};},
    wait:async x=>x,judge:async()=>({accepted:true,judgments:[{confidence:.9}]}),
  });
  assert.equal(calls,2);
  assert.equal(rendered,1);
  assert.equal(result.status,'review_ready');
});

test('P1 Ollama visual solo local, comprueba modelo e imágenes sin proveedor externo',async()=>{
  const env={OLLAMA_VISION_MODEL:'vision-test:1',OLLAMA_ENABLED:'true'};
  const config=visionModelConfig(env);
  assert.equal(new URL(config.endpoint).hostname,'127.0.0.1');
  assert.throws(()=>visionModelConfig({OLLAMA_VISION_MODEL:'https://evil.com'}),/modelo local/);
  const calls=[];
  const fetcher=async(url,options)=>{
    calls.push({url:String(url),options});
    if(String(url).endsWith('/api/tags'))
      return {ok:true,json:async()=>({models:[{name:'vision-test:1'}]})};
    return {ok:true,text:async()=>JSON.stringify({message:{content:JSON.stringify({
      decision:'revise',confidence:.94,localSeconds:1.5,
      observation:'Texto sin legibilidad suficiente',type:'authoredLayers',
      layerEdits:[{layerId:'txt',color:'#ffffff'}],
    })}})};
  };
  await assertVisionModel({env,fetcher});
  const p=original(),r=report(p);
  assert.equal(chooseScenesForVision(p,r)[0].id,'escena-1');
  const result=await proposeVisionRevisions(p,r,'ignored.mp4',{env,fetcher,
    capture:async()=>('a'.repeat(150))});
  assert.equal(result.plan.scenes[0].sceneId,'escena-1');
  assert.equal(calls.filter(x=>x.options?.method==='POST').length,1);
  const body=JSON.parse(calls.at(-1).options.body);
  assert.equal(body.messages.at(-1).images.length,3);
  assert.equal(body.model,'vision-test:1');
  await assert.rejects(()=>chatVision(config,'system','user',[],{fetcher}),/fotogramas/);
});

test('P1 el evaluador visual compara antes/después y no aprueba sin confianza',async()=>{
  const p=original(),calls=[];
  const fetcher=async(_url,options)=>{
    calls.push(JSON.parse(options.body));
    return {ok:true,text:async()=>JSON.stringify({message:{content:JSON.stringify({
      improved:true,confidence:.92,reason:'Texto más legible'})}})};
  };
  const result=await judgeVisionRevision('old.mp4','new.mp4',p,
    [{sceneId:'escena-1',observation:'Texto no legible'}],{
      modelConfig:{model:'test',endpoint:'http://127.0.0.1:11434/api/chat'},
      capture:async()=>('a'.repeat(150)),fetcher,
    });
  assert.equal(result.accepted,true);
  assert.equal(calls[0].messages.at(-1).images.length,6);
  assert.equal(result.judgments[0].sceneId,'escena-1');
});

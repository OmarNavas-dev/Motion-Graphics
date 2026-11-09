import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProject} from './server-utils.mjs';
import {validateProject as authorValidate} from './plugins/motion-graphics/skills/motion-graphics/scripts/compat/server-utils.mjs';
import {verifyBrollProject} from './plugins/motion-graphics/skills/motion-graphics/scripts/validate-broll.mjs';
import {collectProjectAssets} from './src/project-assets.mjs';

const asset='user-assets/11111111-1111-4111-8111-111111111111.png';
const project = () => ({name:'B-roll P2',format:'horizontal',palette:'aurora',scenes:[
  {id:'escena-uno',duration:3,layout:'hero',title:'A',subtitle:'',imageAsset:'',cues:[]},
  {id:'escena-dos',duration:2,layout:'hero',title:'B',subtitle:'',imageAsset:'',cues:[]}],
  wordTimings:[{text:'mundo',start:1.2,end:1.5},{text:'hoy',start:3.4,end:3.7}],
  broll:[{id:'plano-uno',sceneId:'escena-uno',duration:1.5,kind:'overlay',
    narration:{wordIndex:0,edge:'start',offset:0,phrase:'mundo'},motion:'zoom',objects:[
      {id:'texto',type:'text',x:10,y:12,width:80,height:20,color:'#FFFFFF',text:'Mundo',fontSize:42},
      {id:'imagen',type:'image',x:20,y:35,width:40,height:45,asset}]},
    {id:'plano-dos',sceneId:'escena-dos',at:0.4,duration:1.2,kind:'cutaway',
      background:'#111122',objects:[{id:'forma',type:'shape',x:10,y:20,width:65,height:50,color:'#DDAA22',shape:'circle'}]}]});

test('P2: el complemento y Motion Studio generan idéntica línea temporal verificable',()=>{
  const a=validateProject(project()),b=authorValidate(project());
  assert.deepEqual(a.broll,b.broll);
  assert.equal(a.broll[0].at,1.2);
  assert.equal(a.broll[1].globalAt,3.4);
  assert.equal(verifyBrollProject(project()).audit.anchored,1);
  assert.deepEqual(collectProjectAssets(a).filter(x=>x===asset),[asset]);
  assert.equal(a.broll[0].objects[0].text,'Mundo');
});

test('P2: rechaza tiempos falsos, clips fuera de escena y recursos externos',()=>{
  const invalid=[
    p=>{p.broll[0].at=2.4;},
    p=>{p.broll[0].duration=2.7;},
    p=>{p.broll[0].narration.phrase='palabra falsa';},
    p=>{p.broll[0].objects[1].asset='https://example.com/secret.png';},
    p=>{p.broll[0].objects[1].asset='../../secret.png';},
    p=>{p.broll[0].objects[0].x=101;},
    p=>{p.broll[0].objects=[];},
    p=>{p.broll[1].kind='cutaway';delete p.broll[1].background;},
    p=>{p.broll[1].id=p.broll[0].id;},
    p=>{p.broll[0].sceneId='no-existe';},
  ];
  for(const mutate of invalid){
    const p=project();mutate(p);
    assert.throws(()=>validateProject(p),/P2:/);
    assert.throws(()=>authorValidate(p),/P2:/);
  }
});

test('P2: proyecto antiguo sin B-roll conserva importación y no inventa planos',()=>{
  const p=project();delete p.broll;
  assert.deepEqual(validateProject(p).broll,[]);
});

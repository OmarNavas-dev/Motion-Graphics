import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chooseConcept, identities, visualHeadline, supportingLine} from './src/semantic-director.mjs';
import {validateProject, assertApproved} from './server-utils.mjs';

test('bacterias y defensa se convierten en ilustración inmune sin IA',()=>{
  assert.equal(chooseConcept({title:'Tu cuerpo se protege de las bacterias',scriptExcerpt:'Los glóbulos blancos son nuestros defensores'}).kind,'immune');
  assert.equal(chooseConcept({title:'La piel es nuestra barrera ante los microbios'}).detail,'skin');
  assert.equal(chooseConcept({title:'Lavarse las manos elimina gérmenes'}).detail,'wash');
});
test('el director no se queda en una sola temática',()=>{
  assert.equal(chooseConcept({title:'Cómo hacer un presupuesto de mil dólares'}).kind,'finance');
  assert.equal(chooseConcept({title:'La mujer del río en la noche'}).kind,'horror');
  assert.equal(chooseConcept({title:'La red y el algoritmo digital'}).kind,'technology');
  assert.equal(chooseConcept({title:'Un paseo por el bosque y la naturaleza'}).kind,'nature');
  assert.equal(chooseConcept({title:'Los libros nos enseñan historia'}).kind,'learning');
  assert.equal(chooseConcept({title:'Pensamientos e ideas'}).kind,'ideas');
});
test('Venecia se dirige a una ilustración de ciudad, cimientos o mareas',()=>{
  assert.equal(chooseConcept({title:'Por qué no se hunde Venecia', scriptExcerpt:'Venecia y la laguna'}).kind, 'venice');
  assert.equal(chooseConcept({title:'Los pilotes de madera bajo Venecia'}).detail, 'timber');
  assert.equal(chooseConcept({title:'Pilotes de madera clavados bajo Venecia'}).detail, 'timber');
  assert.equal(chooseConcept({title:'Los cimientos bajo Venecia'}).detail, 'foundation');
  assert.equal(chooseConcept({title:'Las cargas se distribuyen en Venecia', scriptExcerpt:'El suelo firme soporta el peso'}).detail, 'load');
  const veniceProject = {name:'Venecia'};
  assert.equal(chooseConcept({title:'El peso se distribuye',subtitle:'Pilotes, plataformas y edificios',visualQuery:'carga distribuida'},veniceProject).detail,'load');
  assert.equal(chooseConcept({title:'MOSE está en las entradas',subtitle:'Barreras móviles en la laguna'},veniceProject).detail,'mose');
  assert.equal(chooseConcept({title:'La marea alta inunda Venecia'}).detail, 'tide');
  assert.equal(chooseConcept({title:'El MOSE cierra las entradas de Venecia'}).detail, 'mose');
  assert.equal(chooseConcept({title:'Venecia sigue expuesta', subtitle:'MOSE ayuda frente a ciertas mareas', visualQuery:'Venecia sobre laguna con cimientos visibles en corte ilustrativo', scriptExcerpt:'El sistema ayuda frente a ciertas mareas, pero no hace desaparecer todo riesgo.'}, {name:'Venecia'}).detail, 'foundation');
  assert.equal(chooseConcept({title:'Un equilibrio que proteger', scriptExcerpt:'Venecia depende de sus pilotes y cimientos'}).detail, 'city');
});
test('titulares cortos y ningún subtítulo duplicado',()=>{
  assert.equal(visualHeadline('¿Sabías que tu cuerpo tiene un ejército de superhéroes diminutos? Te protege todos los días.',9),
    '¿Sabías que tu cuerpo tiene un ejército de superhéroes');
  assert.equal(supportingLine({title:'La piel nos protege',subtitle:'La piel nos protege'}),'');
  assert.ok(Object.keys(identities).length>=9);
});
test('la migración genera plan visual y devuelve a revisión escenas antiguas aprobadas',()=>{
  const project={name:'Prueba',format:'vertical',palette:'aurora',audioAsset:'',musicAsset:'',
    visualEngine:'adaptive',scenes:[{id:'scene-1',title:'Bacterias',duration:4,layout:'hero',approved:false,cues:[],imageAsset:''}]};
  assert.equal(validateProject(project).visualEngine,'adaptive');
  assert.throws(()=>assertApproved(validateProject(project)),/aprueba/);
  assert.equal(validateProject({...project,visualEngine:'classic'}).visualEngine,'classic');
  const legacyApproved = validateProject({...project,scenes:[{...project.scenes[0],approved:true}]});
  assert.equal(legacyApproved.scenes[0].approved,false);
  assert.equal(legacyApproved.scenes[0].visualActionPlan.version,1);
  assert.equal(validateProject({...legacyApproved,scenes:legacyApproved.scenes.map((scene)=>({...scene,approved:true}))}).scenes[0].approved,true);
  const seed = legacyApproved.scenes[0];
  const duplicates = validateProject({...legacyApproved,scenes:[
    {...seed,id:'first',approved:true}, {...seed,id:'second',approved:true},
  ]});
  assert.notEqual(duplicates.scenes[0].visualActionPlan.action, duplicates.scenes[1].visualActionPlan.action);
  assert.equal(duplicates.scenes[1].approved,false);
});

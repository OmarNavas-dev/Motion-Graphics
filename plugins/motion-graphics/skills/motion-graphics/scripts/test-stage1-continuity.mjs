import assert from 'node:assert/strict';
import {createAssetRegistry} from './shared-scene-assets.mjs';
import {auditVisualContinuity} from './audit-visual-continuity.mjs';

const registry=createAssetRegistry();
const token=registry.register({assetId:'rollo-plastico',appearanceToken:'polimero-azul-v1',markup:'<defs><linearGradient id="shading"><stop stop-color="#aaccee"/></linearGradient></defs><rect fill="url(#shading)" width="80" height="160"/>'});
const html1='<svg>'+registry.instantiate('rollo-plastico',{sceneId:'taller',className:'rollo'})+'</svg>';
const html2='<svg>'+registry.instantiate('rollo-plastico',{sceneId:'embalaje',className:'rollo',transform:'translate(30 10)'})+'</svg>';
assert(html1.includes('url(#taller-shading)'));
assert(html2.includes('url(#embalaje-shading)'));
const project={scenes:[{id:'taller',customScene:{html:html1}},{id:'embalaje',customScene:{html:html2}}]};
const plan={schema:'motion-studio.continuity-plan/1',assets:[{assetId:'rollo-plastico',appearanceToken:'polimero-azul-v1',modelToken:token,occurrences:[{sceneId:'taller',selector:'.rollo'},{sceneId:'embalaje',selector:'.rollo'}]}]};
assert.equal(auditVisualContinuity(project,plan).pass,true);
const broken=structuredClone(project);
broken.scenes[1].customScene.html=broken.scenes[1].customScene.html.replace('polimero-azul-v1','polimero-rojo-v1');
assert(auditVisualContinuity(broken,plan).issues.some(x=>x.code==='APPEARANCE_DRIFT'));
assert.throws(()=>registry.register({assetId:'rollo-plastico',appearanceToken:'otro',markup:'<circle r="10"/>'}));
console.log('PASS: misma geometría en escenas; IDs SVG aislados; cambio de apariencia bloqueado.');

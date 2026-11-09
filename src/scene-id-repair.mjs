// Conservative, deterministic normalization of cross-scene SVG/HTML IDs.
// Local duplicate IDs remain errors: choosing a target would be ambiguous.
const idsIn = html => [...String(html??'').matchAll(/\bid\s*=\s*(["'])([^"']+)\1/g)].map(m=>m[2]);
const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const safeId = id => /^[A-Za-z_][\w-]*$/.test(id);

function rewriteReferences(source,map,{html=false}={}) {
  let result=String(source??'');
  for(const [oldId,newId] of map) {
    const escaped=escapeRegExp(oldId);
    // CSS selectors, SVG paint servers, xlink:href, JS querySelector('#id').
    result=result.replace(new RegExp(`#${escaped}(?![\\w-])`,'g'),`#${newId}`);
    // JS DOM access by literal ID rather than a CSS selector.
    result=result.replace(new RegExp(`(\\bgetElementById\\s*\\(\\s*["'])${escaped}(["']\\s*\\))`,'g'),`$1${newId}$2`);
    if(html){
      result=result.replace(new RegExp(`(\\bid\\s*=\\s*["'])${escaped}(["'])`,'g'),`$1${newId}$2`);
      // IDREF and IDREF-list attributes may not use a # prefix.
      result=result.replace(/\b(aria-labelledby|aria-describedby|aria-controls|aria-owns|for|list|headers)\s*=\s*(["'])([^"']*)\2/g,
        (whole,attr,quote,value)=>`${attr}=${quote}${value.split(/(\s+)/).map(part=>part===oldId?newId:part).join('')}${quote}`);
    }
  }
  return result;
}

export function repairCrossSceneIds(project) {
  const scenes=project?.scenes;
  if(!Array.isArray(scenes))return {project,repaired:false,changes:[],warnings:[]};
  const occurrences=new Map(),used=new Set(),warnings=[],changes=[];
  for(const [index,scene] of scenes.entries()) {
    const ids=idsIn(scene.customScene?.html),local=new Set();
    for(const id of ids){
      if(local.has(id))warnings.push(`Escena ${scene.id}: #${id} aparece más de una vez dentro de la misma escena; requiere corrección manual.`);
      local.add(id);used.add(id);
      const list=occurrences.get(id)??new Set();list.add(index);occurrences.set(id,list);
    }
  }
  const repeated=new Set([...occurrences].filter(([,locations])=>locations.size>1).map(([id])=>id));
  if(!repeated.size)return {project,repaired:false,changes,warnings};
  const updated=scenes.map((scene,index)=>{
    if(!scene.customScene?.html)return scene;
    const html=scene.customScene.html,localIds=new Set(idsIn(html)),map=new Map();
    for(const id of localIds){
      if(!repeated.has(id))continue;
      if(!safeId(id)) {warnings.push(`Escena ${scene.id}: #${id} usa caracteres no seguros; requiere corrección manual.`);continue;}
      if(idsIn(html).filter(value=>value===id).length>1)continue;
      const prefix=`ms-${String(scene.id??index).replace(/[^a-zA-Z0-9_-]/g,'-')}-`;
      let replacement=prefix+id,suffix=2;
      while(used.has(replacement)){replacement=prefix+id+'-'+suffix++;}
      const tentative=rewriteReferences(scene.customScene.script,new Map([[id,replacement]]));
      if(new RegExp(`(["'\\x60])${escapeRegExp(id)}\\1`).test(tentative)){
        warnings.push(`Escena ${scene.id}: #${id} puede construirse dinámicamente en JavaScript; requiere corrección manual.`);
        continue;
      }
      used.add(replacement);map.set(id,replacement);
      changes.push({scene:scene.id,from:id,to:replacement});
    }
    if(!map.size)return scene;
    const customScene={...scene.customScene,
      html:rewriteReferences(scene.customScene.html,map,{html:true}),
      css:rewriteReferences(scene.customScene.css,map),
      script:rewriteReferences(scene.customScene.script,map)};
    const direction=scene.direction ? {...scene.direction,
      actions:scene.direction.actions?.map(action=>({...action,selector:rewriteReferences(action.selector,map)}))} : scene.direction;
    return {...scene,customScene,...(direction?{direction}:{})};
  });
  return {project:{...project,scenes:updated},repaired:changes.length>0,changes,warnings};
}

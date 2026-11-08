// Runs unchanged inside the private browser; no module closure dependencies.
export function observeMotionCheckpoints({sceneIndex,local,actions}) {
  const root=document.getElementById('hf-scene-'+sceneIndex),errors=[],observations=[];
  if(!root)return {errors:['Escena ausente al comprobar movimiento.'],observations};
  for(const action of actions??[])for(const point of action.checkpoints??[]){
    if(Math.abs(local-action.at-point.at)>1e-5)continue;
    let nodes;
    try{nodes=[...root.querySelectorAll(action.selector)];}catch{errors.push('Selector de movimiento invalido: '+action.selector);continue;}
    if(!nodes.length){errors.push('Selector de movimiento ausente: '+action.selector);continue;}
    nodes.forEach((node,index)=>{
      for(const [key,expected]of Object.entries(point.state)){
        const fields=key==='attr'?Object.entries(expected):[[key,expected]];
        for(const [field,wanted]of fields){
          const actual=key==='attr'?node.getAttribute(field):window.gsap.getProperty(node,field);
          const numeric=typeof wanted==='number';
          const passed=numeric ? actual!==null && Number.isFinite(Number(actual)) && Math.abs(Number(actual)-wanted)<=Math.max(.002,Math.abs(wanted)*.00001) : String(actual)===String(wanted);
          observations.push({action:action.id,phase:point.phase,selector:action.selector,node:index,property:key==='attr'?'attr.'+field:field,expected:wanted,actual,passed});
          if(!passed)errors.push(`Movimiento ${action.id}/${point.phase}: ${field} esperado ${wanted}; obtenido ${actual}.`);
        }
      }
    });
  }
  return {errors,observations};
}

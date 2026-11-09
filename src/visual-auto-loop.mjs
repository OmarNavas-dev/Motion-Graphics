/* global structuredClone */
import {
  applyVisionRevisionPlan,applySafeVisualCorrections,compareVisualReports,
  projectFingerprint,validateIterationRequest,
} from '../plugins/motion-graphics/skills/motion-graphics/scripts/visual-iteration.mjs';

// Orchestration is deliberately injectable: CI can verify every branch with
// real evidence reports and fake renderers, while production uses real jobs.
// A trial candidate is never saved or approved without user review.
export async function runVisualAutoLoop({project,sourceJob,propose,render,wait,judge,
  validateProject,validateCustomScene,compareReference,onProgress=()=>{},maxAttempts=3}={}) {
  if(typeof propose!=='function'||typeof render!=='function'||typeof wait!=='function'||
     typeof judge!=='function'||typeof validateProject!=='function')
    throw Error('La revisión autónoma requiere modelo, renderizador, validación y comparación reales.');
  if(sourceJob?.status!=='completado'||!sourceJob.visualDefects||
     sourceJob.projectHash!==projectFingerprint(project))
    throw Error('Se necesita un MP4 completo y el JSON exacto del render de origen.');
  let currentProject=structuredClone(project), previous=sourceJob, acceptedProject=null;
  const rounds=[];
  for(let turn=previous.attempt;turn<maxAttempts;turn++){
    onProgress({phase:'vision',attempt:turn,jobId:previous.id});
    let revision,candidate,validationFeedback='';
    for(let codingAttempt=0;codingAttempt<2;codingAttempt++){
      const feedback=await propose(currentProject,previous,{validationFeedback});
      try{
        if(feedback.plan?.scenes?.length) {
          revision=applyVisionRevisionPlan(currentProject,previous.visualDefects,feedback.plan,
            {validateCustomScene});
        } else {
          const safe=applySafeVisualCorrections(currentProject,previous.visualDefects);
          if(!safe.manifest.applied.length)
            return {status:rounds.length?'review_ready':'needs_review',
              reason:'El modelo no propuso cambios verificables y no existen reparaciones seguras.',
              project:acceptedProject,rounds,approval:'PENDING_VISUAL_REVIEW'};
          revision={project:safe.project,manifest:{...safe.manifest,applied:safe.manifest.applied.map(x=>({
            ...x,observation:'Contraste de texto insuficiente medido en el JSON.'}))}};
        }
        candidate=validateProject(revision.project);
        break;
      }catch(error){
        validationFeedback=String(error?.message??error).slice(0,500);
        onProgress({phase:'repair_model',attempt:turn,reason:validationFeedback});
        if(codingAttempt===1)throw Error('El modelo visual no logró corregir un plan inválido: '+validationFeedback);
      }
    }
    const context=validateIterationRequest(previous,candidate,{maxAttempts});
    onProgress({phase:'render',attempt:context.attempt,sourceJobId:previous.id});
    const trial=await render(candidate,previous,context);
    const completed=await wait(trial);
    if(completed.status!=='completado'||!completed.visualDefects){
      rounds.push({attempt:context.attempt,jobId:completed.id,status:'render_failed',
        error:completed.error??'Fallo de exportación'});
      return {status:'needs_review',reason:'Falló el render corregido; se conservó el último proyecto válido.',
        project:acceptedProject,rounds,approval:'PENDING_VISUAL_REVIEW'};
    }
    onProgress({phase:'compare',attempt:context.attempt,jobId:completed.id});
    const technical=compareVisualReports(previous.visualDefects,completed.visualDefects);
    const perceptual=await judge(previous,completed,candidate,revision.manifest.applied);
    const reference=typeof compareReference==='function'?await compareReference(previous,completed,candidate):null;
    // A positive image-model opinion cannot override new technical errors.
    const accepted=perceptual.accepted===true&&
      completed.visualDefects.counts.error<=previous.visualDefects.counts.error&&
      completed.qualityEvidence?.screenshotEvidence===true&&(!reference||reference.passed===true);
    const round={attempt:context.attempt,jobId:completed.id,sourceJobId:previous.id,
      status:accepted?'candidate_improved':'candidate_rejected',
      technical,perceptual,reference,manifest:revision.manifest};
    rounds.push(round);
    if(!accepted)return {status:'needs_review',
      reason:'La comparación visual no demuestra mejora suficiente; el original se conservó.',
      project:acceptedProject,rounds,approval:'PENDING_VISUAL_REVIEW'};
    acceptedProject=candidate;
    currentProject=candidate;
    previous=completed;
    // Stop once there are no actionable technical findings. Further subjective
    // work can be requested explicitly; do not churn an already improved shot.
    if(completed.visualDefects.counts.error+completed.visualDefects.counts.warning===0)break;
  }
  return {status:acceptedProject?'review_ready':'needs_review',
    reason:acceptedProject?'Candidato renderizado y comparado; requiere aprobación visual final.':'Sin candidato aprobado.',
    project:acceptedProject,rounds,approval:'PENDING_VISUAL_REVIEW'};
}

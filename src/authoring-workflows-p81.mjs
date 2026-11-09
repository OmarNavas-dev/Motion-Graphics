// P8.1: executable, source-aware brand intake + quantitative brief + eight-part prompt.
// This is deterministic authoring; do not invent brand assets or claim an unreviewed reference was inspected.
import {normalizeBrandProfile} from './motion-capabilities.mjs';

const text=(v,max=300)=>typeof v==='string'?v.trim().slice(0,max):'';
const hex=v=>typeof v==='string'&&/^#[0-9a-fA-F]{6}$/.test(v);
const allowedSizes=new Set(['1080x960','1080x1350','1080x1920','1920x1080']);
const check=(ok,message)=>{if(!ok)throw Error('P8.1: '+message);};
const safe=(v)=>String(v).replace(/[\r\n]+/g,' ').trim();
export function validateBrandIntake(raw){
 check(raw&&typeof raw==='object'&&!Array.isArray(raw),'datos de marca inválidos.');
 const questions=[];
 for(const [key,label]of [['name','nombre'],['description','actividad'],['audience','audiencia'],['offer','oferta'],['feeling','emoción principal'],['font','tipografía']])
  if(!text(raw[key]))questions.push('¿Cuál es '+label+' de la marca?');
 if(!raw.colors||!['background','ink','accent'].every(k=>hex(raw.colors[k])))questions.push('Indica los tres colores exactos en HEX (fondo, texto y acento).');
 if(!Array.isArray(raw.avoid)||!raw.avoid.length)questions.push('¿Qué debe evitar siempre la animación?');
 const references=Array.isArray(raw.references)?raw.references:[];
 if(references.length<3||references.length>5)questions.push('Facilita entre tres y cinco referencias de fotogramas con observaciones.');
 for(const [i,r]of references.entries())if(!text(r.source)||!text(r.observation)||!['observed','inferred','unknown'].includes(r.confidence))
  questions.push(`Referencia ${i+1}: indica fuente, observación y nivel de certeza.`);
 return {complete:questions.length===0,questions:questions.slice(0,7)};
}
export function createBrandKit(raw){
 const status=validateBrandIntake(raw);if(!status.complete)return {ready:false,questions:status.questions};
 const brandProfile=normalizeBrandProfile({name:raw.name,colors:raw.colors,typography:raw.font,
  motionRules:(raw.motionRules||[]).slice(0,12),avoid:raw.avoid.slice(0,12),narrativePromise:raw.feeling});
 const rules=brandProfile.motionRules,never=brandProfile.avoid;
 const brand=['# Brand',`## Name and what we do\n${safe(raw.name)} — ${safe(raw.description)}`,
  `## Audience\n${safe(raw.audience)}`,`## What we promote\n${safe(raw.offer)}`,
  `## The feeling\n${safe(raw.feeling)}`,`## Assets\nColours: ${Object.entries(brandProfile.colors).map(([k,v])=>k+' '+v).join(', ')}; font: ${safe(raw.font)}; logo: ${text(raw.logo)||'ASK ME'}`,
  `## Never\n${never.map(x=>'- '+safe(x)).join('\n')}`].join('\n\n')+'\n';
 const motion=['# MOTION',`## Colours\n${Object.entries(brandProfile.colors).map(([k,v])=>'- '+k+': '+v).join('\n')}`,
  `## Typography\n${safe(raw.font)}; sizes: ASK ME`,
  '## Timing\nEntrance, hold, exit: ASK ME. Confirm timing from source frames.',
  `## Movement\n${rules.length?rules.map(x=>'- '+safe(x)).join('\n'):'ASK ME'}`,
  '## Texture and finish\nASK ME',
  `## Never\n${never.map(x=>'- '+safe(x)).join('\n')}`,
  '## References (observed vs inferred)\n'+raw.references.map(r=>`- [${r.confidence}] ${safe(r.source)}: ${safe(r.observation)}`).join('\n'),
  '## Approved example\nASK ME: no shot-by-shot example was supplied.'].join('\n\n')+'\n';
 const readFirst='Before designing, generating or animating anything, read MOTION.md in full.\n'+
  'Every colour, font, timing and motion value comes from that file.\n'+
  'The file sets the look, not the ambition. When I say go all out, go all out.\n'+
  'If something I ask for is not covered there, ask me rather than choosing for yourself.\n'+
  'When you have finished, check your own frames against MOTION.md, fix what fails, and only then show me.\n';
 return {ready:true,brandProfile,files:{'brand.md':brand,'MOTION.md':motion,'CLAUDE.md':readFirst},
  unverified:['No se han inspeccionado visualmente las referencias; las observaciones son aportadas por el usuario.']};
}
export function validateMotionIdea(input){
 const questions=[];
 if(!text(input?.hero)||!text(input?.before)||!text(input?.after))questions.push('¿Qué objeto cambia y cuáles son sus estados antes y después?');
 if(!Array.isArray(input?.exactText)||!input.exactText.length||input.exactText.some(x=>!text(x)))questions.push('¿Cuáles son las palabras exactas en pantalla?');
 if(!allowedSizes.has(input?.size))questions.push('Elige 1080x960, 1080x1350, 1080x1920 o 1920x1080.');
 if(!Number.isFinite(input?.duration)||input.duration<3||input.duration>30)questions.push('¿Cuánto dura el video (3–30 segundos)?');
 const facts=Array.isArray(input?.numbers)?input.numbers:[];
 if(facts.some(f=>!text(f?.label)||!Number.isFinite(f?.value)||!['measured','target','illustrative'].includes(f?.kind)))
  questions.push('Confirma cada cifra y clasifícala como resultado, objetivo o ilustrativa.');
 return {complete:questions.length===0,questions};
}
const timed=(duration)=>{const marks=[0,.2,.48,.8,1].map(v=>Number((v*duration).toFixed(3)));
 return [{name:'start',start:marks[0],end:marks[1]},{name:'change',start:marks[1],end:marks[2]},
  {name:'hold',start:marks[2],end:marks[3]},{name:'return',start:marks[3],end:marks[4]}];};
export function createMotionBrief({brand,idea}){
 const intake=createBrandKit(brand),checkIdea=validateMotionIdea(idea);
 const questions=[...(intake.ready?[]:intake.questions),...checkIdea.questions];
 if(questions.length)return {ready:false,questions:questions.slice(0,5)};
 const palette=intake.brandProfile.colors,states=timed(idea.duration),[width,height]=idea.size.split('x').map(Number);
 const numbers=(idea.numbers||[]).map(n=>`${safe(n.label)} = ${n.value} [${n.kind}]`);
 const summary=`${safe(idea.hero)} pasa de «${safe(idea.before)}» a «${safe(idea.after)}». `+
  `Formato ${width}×${height} durante ${idea.duration} s en la marca ${safe(brand.name)}. `+
  `Las cifras se conservan literalmente y se diferencian resultados, objetivos y ejemplos.`;
 const prompt=['# Motion Studio · Quantitative build brief',`Canvas: ${width} x ${height}; duration: ${idea.duration}s; seamless loop (last frame equals first).`,
  'Four timed states:',...states.map(s=>`- ${s.name}: ${s.start}–${s.end}s`),
  `Hero: ${safe(idea.hero)}. Before: ${safe(idea.before)}. After: ${safe(idea.after)}. Return to initial state.`,
  'Exact words (immutable): '+idea.exactText.map(safe).join(' | '),
  'Exact figures (never invent or relabel status): '+(numbers.join(' | ')||'none'),
  `Brand: ${safe(brand.name)}; background ${palette.background}; ink ${palette.ink}; accent ${palette.accent}; font ${safe(brand.font)}.`,
  `Assets: ${text(brand.logo)||'No supplied logo; do not invent one.'}`,
  'Generate an importable Motion Studio project JSON with deterministic authored layers and global timing.',
  'After rendering: capture start/change/hold/return frames, inspect crop, overlap and each fixed value; repair actual defects.',
  'Do not spend, install, publish or transmit any media to third parties without explicit approval.'].join('\n');
 return {ready:true,summary,buildPrompt:prompt,states,brandProfile:intake.brandProfile,
  exactText:[...idea.exactText],numbers:idea.numbers||[],size:idea.size,duration:idea.duration,
  warnings:['El plan no verifica todavía el render MP4 ni la interpretación artística.']};
}
export function createMotionPrompt({brand,idea}){
 const brief=createMotionBrief({brand,idea});if(!brief.ready)return brief;
 const {brandProfile:profile}=brief,p=profile.colors;
 const sections=[
  ['The bar','Tactile, original motion design. Reject generic or unreviewed output.'],
  ['Format',`${brief.size} pixels, ${brief.duration} seconds, seamless loop; music ${idea.music===true?'on':'off'}.`],
  ['The one rule',`One hero (${safe(idea.hero)}) fills 60–70% of frame and changes only once before reset.`],
  ['Look',`Background ${p.background}, ink ${p.ink}, accent ${p.accent}, font ${safe(brand.font)}. Use original elements; labels readable.`],
  ['Motion',`Spring easing and settle, hold after state at least ${Math.min(1.2,brief.duration*.24).toFixed(2)} seconds; ${brief.states.map(s=>s.name+' '+s.start+'–'+s.end).join(', ')}.`],
  ['Never',profile.avoid.map(safe).join('; ')+'; never copy third-party logos or invented statistics.'],
  ['Before you finish','Render stills at every second and at 200px width; check each label, number, bounds and final loop; correct real defects.'],
  ['The scene',`${safe(idea.hero)} starts ${safe(idea.before)}, changes to ${safe(idea.after)} and returns to the exact starting state. Text: ${brief.exactText.map(safe).join(' | ')}.`],
  ['Originality','Every visual element is original; no third-party logos, icons, UI copies or claims without sources.']];
 const full='Make me a motion graphic. Follow this motion brief exactly:\n\n'+
  '# Motion brief: '+safe(brand.name)+'\n\n'+sections.map(([name,body])=>'## '+name+'\n'+body).join('\n\n');
 return {...brief,prompt:full,sections,brandLabel:brand.name,extraScenes:[],ready:true};
}

// Style catalog from ItsssssJack/claude-video-2 (MIT). Full original guides are bundled.
// P3 adds executable visual recipes; reference guides still govern advanced art direction.
import fs from 'node:fs';
import path from 'node:path';
import {getExecutableStyle} from './style-recipes.mjs';
const styleMeta=Object.freeze([
  {
    "id": "paper-world",
    "name": "Cut-paper world",
    "kind": "studio",
    "media": true,
    "best": "Story openers, travel, calm brand films"
  },
  {
    "id": "ink-line",
    "name": "One ink line",
    "kind": "studio",
    "media": true,
    "best": "Brand stings, calm intros, one idea into the next"
  },
  {
    "id": "weather-widget",
    "name": "One widget, every sky",
    "kind": "studio",
    "media": true,
    "best": "App and product UI promos, change over time"
  },
  {
    "id": "data-story",
    "name": "Where viewers leave",
    "kind": "studio",
    "media": true,
    "best": "Charts, data stories, before and after"
  },
  {
    "id": "swiss-kinetic",
    "name": "Swiss kinetic type",
    "kind": "studio",
    "media": true,
    "best": "Kinetic type, music, bold titles"
  },
  {
    "id": "particle-field",
    "name": "Ten thousand points",
    "kind": "studio",
    "media": true,
    "best": "AI and science topics, reveals, portraits"
  },
  {
    "id": "growing-city",
    "name": "A city that grows",
    "kind": "studio",
    "media": true,
    "best": "Growth stories, milestones, worlds that build"
  },
  {
    "id": "explainer-diagram",
    "name": "How an AI makes a video",
    "kind": "studio",
    "media": true,
    "best": "Workflows, how it works, tool explainers"
  },
  {
    "id": "time-travel",
    "name": "30,000 years in 15 seconds",
    "kind": "studio",
    "media": true,
    "best": "History, timelines, then and now"
  },
  {
    "id": "editor-ui",
    "name": "Edited in a pro editor",
    "kind": "studio",
    "media": true,
    "best": "AI edits my video, intros, before and after"
  },
  {
    "id": "motion-app-ui",
    "name": "Animated in a motion app",
    "kind": "studio",
    "media": true,
    "best": "Easing and keyframe explainers, title launches"
  },
  {
    "id": "design-app-ui",
    "name": "A thumbnail, designed",
    "kind": "studio",
    "media": true,
    "best": "Design tool demos, thumbnails, layout builds"
  },
  {
    "id": "audio-app-ui",
    "name": "Scored in a music app",
    "kind": "studio",
    "media": true,
    "best": "Music and audio demos, beat sync"
  },
  {
    "id": "swiss-grid",
    "name": "Swiss grid",
    "kind": "code",
    "media": false,
    "best": "Titles, product facts, launch cards"
  },
  {
    "id": "editorial-paper",
    "name": "Editorial paper",
    "kind": "code",
    "media": false,
    "best": "Data, charts, what the numbers say"
  },
  {
    "id": "midnight-grid",
    "name": "Midnight grid",
    "kind": "code",
    "media": false,
    "best": "Tech explainers, diagrams, flows"
  },
  {
    "id": "paper-cut",
    "name": "Paper cut",
    "kind": "code",
    "media": false,
    "best": "Title cards, gentle brand moments, loops"
  },
  {
    "id": "risograph",
    "name": "Risograph",
    "kind": "code",
    "media": false,
    "best": "Events, music, playful promos"
  },
  {
    "id": "blueprint",
    "name": "Blueprint",
    "kind": "code",
    "media": false,
    "best": "How things work, product parts"
  },
  {
    "id": "graphite-ui",
    "name": "Graphite UI",
    "kind": "code",
    "media": false,
    "best": "Software launches, feature reveals"
  },
  {
    "id": "poster-pop",
    "name": "Poster pop",
    "kind": "code",
    "media": false,
    "best": "Hooks, Shorts, countdowns, big claims"
  }
]);
const ids=new Set(styleMeta.map(item=>item.id));
const refs=path.join(import.meta.dirname,'..','plugins','motion-graphics','skills','motion-graphics','references','styles');
const styleDoc=id=>fs.readFileSync(path.join(refs,id+'.md'),'utf8');
const firstHex=(content,names)=>{
 for(const name of names){const line=content.split(/\r?\n/).find(l=>new RegExp('^[-*]\\s*'+name+'\\s*:', 'i').test(l.trim()));
  const found=line?.match(/#[0-9a-f]{6}/i);if(found)return found[0].toUpperCase();}
 return null;
};
export const STYLE_IDS=Object.freeze(styleMeta.map(s=>s.id));
export function isKnownStylePreset(id){return ids.has(id);}
export function getStylePreset(id){
 if(!ids.has(id))throw Error('Estilo desconocido.');
 const metadata=styleMeta.find(s=>s.id===id),guide=styleDoc(id);
 const executable=getExecutableStyle(id);
 const colors={background:firstHex(guide,['ground','background','bg','canvas'])||'#101820',
 ink:firstHex(guide,['text','ink','type','foreground','lines','points'])||'#FFFFFF',
 accent:firstHex(guide,['accent','highlight'])||'#FFC857'};
 return {...metadata,colors,executable:true,recipe:{signature:executable.signature,
   family:executable.family,motion:executable.motion,noText:!!executable.noText,
   renderer:'shared-authored/1'},
   guidePath:'references/styles/'+id+'.md',source:'ItsssssJack/claude-video-2'};
}
export function listStylePresets(){return STYLE_IDS.map(getStylePreset);}
export function getStyleGuide(id){if(!ids.has(id))throw Error('Estilo desconocido.');return styleDoc(id);}

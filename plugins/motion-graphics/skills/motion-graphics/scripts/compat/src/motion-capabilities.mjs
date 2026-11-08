import {CUSTOM_SCENE_LIMITS} from './scene-limits.mjs';

// Shared by the local service and the authoring plugin, not a quality certificate.
export const MOTION_STUDIO_CONTRACT=Object.freeze({
 version:1,
 customScene:{engine:'hyperframes-gsap',fields:['html','css','script'],limits:CUSTOM_SCENE_LIMITS,
  timeBase:'seconds',sceneClock:'T0 + local seconds; D is the scene duration',
  selectorToken:'__SCENE__',optionalMediaTokens:['__IMAGE__','__VIDEO__'],
  scriptBindings:['tl','S','T0','D','gsap']},
 fps:[24,30],
 formats:['vertical','horizontal'],
 captionModes:['embedded','global','none'],
 wordTimings:{timeBase:'global seconds',fields:['text','start','end','emphasis']},
 motionCheckpoints:{version:1,timeBase:'seconds relative to action.at',fields:['at','state','phase'],verification:['forward seek','backward seek']},
 remotionCustomScene:false,
 approval:{technicalChecksAreVisualApproval:false,technicalChecksVerifyAudioAlignment:false},
});

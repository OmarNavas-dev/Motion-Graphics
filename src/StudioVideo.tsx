import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  FPS,
  paletteColors,
  resolveSceneStyle,
  type MotionPreset,
  type TransitionPreset,
  type StudioCue,
  type StudioProps,
  type StudioScene,
  type StyleName,
} from './studio-schema';
import {SmartGraphicScene} from './SmartGraphicScene';
import {AdaptiveScene} from './AdaptiveScene';
import {Canvas3DScene} from './Canvas3DScene';
import {AuthoredScene as ComplexAuthoredScene} from './AuthoredScene';
import {MediaFirstScene} from './MediaFirstScene';
import {chooseConcept} from './semantic-director.mjs';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const progress = (frame: number, from: number, duration: number) =>
  interpolate(frame, [from, from + Math.max(duration, 1)], [0, 1], {
    ...clamp, easing: Easing.out(Easing.cubic),
  });

// Every frame is a pure function of time: deterministic in the Player and CPU renderer.
const sceneMotion = (frame: number, frames: number, preset: MotionPreset | undefined,
  style: StyleName, strength = 40, index = 0, shotScale: 'wide' | 'medium' | 'close' = 'medium') => {
  const t = Math.max(0, Math.min(1, frame / Math.max(1, frames - 1)));
  const power = Math.max(0, Math.min(1, strength / 100));
  const automatic: MotionPreset = style === 'horror' || style === 'cinematic' ? 'push' :
    style === 'watercolor' || style === 'minimal' ? 'drift' :
    style === 'energetic' || style === 'tech' ? 'pull' : 'pan-right';
  const move = preset && preset !== 'auto' ? preset : automatic;
  const framing = shotScale === 'close' ? 1.1 : shotScale === 'wide' ? 0.9 : 1;
  if (move === 'static' || power === 0) return framing === 1 ? 'none' : `scale(${framing})`;
  const distance = 22 * power;
  let x = 0;
  let y = 0;
  let scale = framing * (1 + 0.045 * power);
  if (move === 'push') scale += t * 0.11 * power;
  if (move === 'pull') scale += (1 - t) * 0.11 * power;
  if (move === 'pan-left') x = (0.5 - t) * distance * 2;
  if (move === 'pan-right') x = (t - 0.5) * distance * 2;
  if (move === 'rise') y = (0.5 - t) * distance * 2;
  if (move === 'drift') {
    x = (t - 0.5) * distance * (index % 2 ? -1 : 1);
    y = Math.sin(t * Math.PI) * distance * 0.25;
    scale += 0.02 * power * t;
  }
  return `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
};

const SceneBoundary: React.FC<{entry?: TransitionPreset; exit?: TransitionPreset;
  frames: number}> = ({entry, exit, frames}) => {
  const frame = useCurrentFrame();
  const blackAtEntry = entry === 'fade' || entry === 'dip'
    ? 1 - progress(frame, 0, Math.min(12, Math.max(2, Math.floor(frames / 3)))) : 0;
  const blackAtExit = exit === 'dip' && frames >= 10
    ? progress(frame, frames - 9, 9) : 0;
  const black = Math.max(blackAtEntry, blackAtExit);
  const flash = entry === 'flash' ? 0.82 * (1 - progress(frame, 0, 5)) : 0;
  return <>
    {black > 0 && <AbsoluteFill style={{background: '#000', opacity: black, pointerEvents: 'none'}}/>}
    {flash > 0 && <AbsoluteFill style={{background: '#FFF', opacity: flash, pointerEvents: 'none'}}/>}
  </>;
};

const CaptionTrack: React.FC<{scene: StudioScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, height} = useVideoConfig();
  const cues = scene.captions ?? [];
  return <AbsoluteFill style={{pointerEvents: 'none', zIndex: 20}}>
    {cues.map((caption, index) => {
      const start = Math.round(caption.at * fps);
      const end = start + Math.max(1, Math.round(caption.duration * fps));
      if (frame < start || frame >= end) return null;
      const entrance = progress(frame, start, Math.max(3, Math.round(fps * 0.16)));
      const exit = 1 - progress(frame, end - Math.max(3, Math.round(fps * 0.12)), Math.max(3, Math.round(fps * 0.12)));
      const emphasis = new Set((caption.emphasis ?? []).map((word) => word.toLocaleLowerCase()));
      return <div key={caption.id || index} style={{position: 'absolute', left: '7%', right: '7%',
        top: caption.position === 'top' ? '11%' : undefined,
        bottom: caption.position === 'top' ? undefined : height > 720 ? '10%' : '8%',
        display: 'flex', justifyContent: 'center', opacity: entrance * exit,
        transform: `translateY(${(1 - entrance) * 18}px)`, textAlign: 'center'}}>
        <span style={{display: 'inline', padding: '0.16em 0.34em', borderRadius: 12,
          background: 'rgba(5,9,18,.86)', color: '#fff', fontSize: height > 720 ? 38 : 25,
          fontWeight: 900, lineHeight: 1.25, textShadow: '0 2px 9px #000', boxDecorationBreak: 'clone',
          WebkitBoxDecorationBreak: 'clone'}}>
          {caption.text.split(/(\s+)/).map((part, wordIndex) => {
            const clean = part.replace(/[^\p{L}\p{N}]/gu, '').toLocaleLowerCase();
            return emphasis.has(clean) ? <span key={wordIndex} style={{color: '#FFD54A'}}>{part}</span> : part;
          })}
        </span>
      </div>;
    })}
  </AbsoluteFill>;
};

const EventVisual: React.FC<{
  cue: StudioCue;
  index: number;
  accent: string;
  second: string;
}> = ({cue, index, accent, second}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const {fps} = useVideoConfig();
  const start = Math.round(cue.at * fps);
  const end = start + Math.round(cue.duration * fps);
  if (frame < start || frame >= end) return null;
  const alpha = progress(frame, start, 9) * (1 - progress(frame, end - 8, 8));
  const scale = 0.68 + progress(frame, start, 13) * 0.32;
  const size = Math.round(width * 0.20);
  const left = width * (index % 2 === 0 ? 0.68 : 0.48) - size / 2;
  const top = height * (index % 2 === 0 ? 0.60 : 0.73) - size / 2;
  const shape = cue.shape;
  return (
    <div style={{
      position: 'absolute', left, top, width: size, height: size,
      opacity: alpha, transform: `scale(${scale})`,
      display: 'grid', placeItems: 'center',
    }}>
      {shape === 'ring' && (
        <div style={{
          width: size * 0.85, height: size * 0.85,
          border: `12px solid ${accent}`, borderRadius: '50%',
          boxShadow: `0 0 0 15px ${second}24`,
        }} />
      )}
      {shape === 'dot' && (
        <div style={{
          width: size * 0.64, height: size * 0.64,
          background: accent, borderRadius: '50%',
          boxShadow: `0 0 0 22px ${accent}20`,
        }} />
      )}
      {shape === 'square' && (
        <div style={{
          width: size * 0.7, height: size * 0.7,
          border: `10px solid ${second}`, borderRadius: 24,
          transform: `rotate(${frame * 0.7}deg)`,
        }} />
      )}
      {shape === 'bars' && (
        <div style={{display: 'flex', alignItems: 'end', gap: 10, height: size * 0.8}}>
          {[0.42, 0.72, 0.56, 0.94].map((h, i) => (
            <div key={i} style={{
              width: 20, borderRadius: 8, background: i % 2 ? second : accent,
              height: size * h * (0.88 + 0.12 * Math.sin(frame * 0.13 + i)),
            }} />
          ))}
        </div>
      )}
      {cue.label && (
        <div style={{
          position: 'absolute', top: size + 12, fontWeight: 700,
          fontSize: Math.max(15, width * 0.019), color: '#FFFFFF',
        }}>{cue.label}</div>
      )}
    </div>
  );
};

const OrbitArt: React.FC<{
  frame: number;
  accent: string;
  second: string;
  width: number;
}> = ({frame, accent, second, width}) => {
  const size = width * 0.65;
  return (
    <svg width={size} height={size} viewBox="0 0 500 500"
      style={{overflow: 'visible'}}>
      <g transform={`rotate(${frame * 0.5} 250 250)`}>
        <circle cx="250" cy="250" r="198" stroke={accent} strokeWidth="5"
          strokeDasharray="260 985" strokeLinecap="round" fill="none" />
        <circle cx="250" cy="52" r="11" fill={accent} />
      </g>
      <g transform={`rotate(${-frame * 0.75} 250 250)`}>
        <circle cx="250" cy="250" r="145" stroke={second} strokeWidth="7"
          strokeDasharray="190 720" fill="none" strokeLinecap="round" />
        <circle cx="105" cy="250" r="10" fill={second} />
      </g>
      <circle cx="250" cy="250" r="198" stroke="#FFFFFF" strokeOpacity="0.14"
        strokeWidth="2" fill="none" />
      <rect x="175" y="175" width="150" height="150" rx="28" fill={accent}
        fillOpacity="0.1" stroke={second} strokeWidth="4"
        transform={`rotate(${frame * 0.32 + 25} 250 250)`} />
      <circle cx="250" cy="250" r="38" fill={accent} />
    </svg>
  );
};

const graphicColors: Record<StyleName, {back: string; accent: string; ink: string}> = {
  modern: {back: '#080D19', accent: '#65F5D5', ink: '#F8FBFF'},
  horror: {back: '#09080E', accent: '#E52438', ink: '#FFFFFF'},
  watercolor: {back: '#F2E8D5', accent: '#E57D4F', ink: '#3E3B37'},
  documentary: {back: '#F2F0EA', accent: '#DD473C', ink: '#171E25'},
  cinematic: {back: '#0D1016', accent: '#D9B676', ink: '#FFFFFF'},
  tech: {back: '#061523', accent: '#21DAF1', ink: '#F2FAFF'},
  minimal: {back: '#F4F1EA', accent: '#CA3F35', ink: '#171717'},
  energetic: {back: '#17101C', accent: '#FFDA40', ink: '#FFFFFF'},
  playful: {back: '#173F56', accent: '#FFCB5C', ink: '#FFFFFF'},
};

// Reusable title and editorial-photo templates, independent of the project's topic.
const GraphicTemplate: React.FC<{scene: StudioScene; style: StyleName;
  showText: boolean; sceneNumber: number}> = ({scene, style, showText, sceneNumber}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const frames = Math.max(1, Math.round(scene.duration * useVideoConfig().fps));
  const colors = graphicColors[style];
  const collage = scene.layout === 'collage';
  const motion = sceneMotion(frame, frames, scene.visualActionPlan?.camera ?? scene.motion, style,
    scene.motionStrength, sceneNumber, scene.visualActionPlan?.shotScale);
  const words = scene.title.trim().split(/\s+/).filter(Boolean).slice(0, 18);
  const typeSize = Math.max(34, Math.min(width * 0.19,
    width * (words.length > 8 ? 0.105 : words.length > 4 ? 0.145 : 0.18)));
  const image = scene.imageAsset ? staticFile(scene.imageAsset) : '';
  const focus = `${scene.focusX ?? 50}% ${scene.focusY ?? 50}%`;
  const enter = (index: number) => progress(frame, 4 + index * 4, 10);
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: colors.back,
      color: colors.ink, fontFamily: 'Arial, Helvetica, sans-serif'}}>
      {image && <Img src={image} style={{position: 'absolute', width: '100%', height: '100%',
        objectFit: 'cover', objectPosition: focus, opacity: collage ? 0.22 : 0.16,
        filter: 'grayscale(1) contrast(1.2)', transform: motion}} />}
      {collage && <>
        <div style={{position: 'absolute', width: width * 0.85, height: width * 0.85,
          borderRadius: '50%', background: colors.accent, top: height * 0.33,
          left: width * 0.07, transform: `scale(${0.82 + 0.18 * enter(0)})`}} />
        {image ? <Img src={image} style={{position: 'absolute', width: width * 0.89,
          height: height * 0.50, objectFit: 'cover', objectPosition: focus,
          borderRadius: Math.min(width * 0.08, 42), left: width * 0.055,
          top: height * 0.31, transform: motion, filter: 'grayscale(1) contrast(1.14)'}} /> :
          <div style={{position: 'absolute', left: width * 0.17, top: height * 0.4,
            width: width * 0.66, height: height * 0.22,
            borderRadius: 16, border: `12px solid ${colors.ink}66`, transform: motion}} />}
      </>}
      {!collage && <>
        <div style={{position: 'absolute', top: height * 0.15, left: -width * 0.10,
          width: width * 0.75, height: Math.max(8, width * 0.026),
          background: colors.accent, transform: `rotate(-9deg) scaleX(${enter(0)})`,
          transformOrigin: 'left center'}} />
        <div style={{position: 'absolute', width: width * 0.52, height: width * 0.52,
          border: `3px solid ${colors.accent}77`, borderRadius: '50%',
          right: -width * 0.23, bottom: height * 0.06, transform: motion}} />
      </>}
      {showText && <div style={{position: 'absolute',
        left: width * 0.075, right: width * 0.075,
        top: collage ? height * 0.11 : height * 0.27,
        zIndex: 2, textAlign: collage ? 'center' : 'left'}}>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.04em 0.18em',
          justifyContent: collage ? 'center' : 'flex-start', alignItems: 'baseline',
          fontSize: collage ? typeSize * 0.72 : typeSize,
          fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.99,
          textShadow: collage && image ? `0 2px 12px ${colors.back}` : 'none'}}>
          {words.map((word, index) => <span key={`${index}-${word}`} style={{
            display: 'inline-block', color: index === Math.max(0, words.length - 1) ? colors.accent : colors.ink,
            opacity: enter(index),
            transform: `translateY(${(1 - enter(index)) * 24}px)`,
          }}>{word}</span>)}
        </div>
        {scene.subtitle && <div style={{fontSize: Math.max(21, width * 0.045),
          fontWeight: 600, lineHeight: 1.2, marginTop: height * 0.045,
          opacity: enter(words.length + 1)}}>{scene.subtitle}</div>}
      </div>}
      <div style={{position: 'absolute', left: width * 0.08, bottom: height * 0.067,
        width: width * 0.3, height: 5, background: colors.accent,
        transform: `scaleX(${enter(1)})`, transformOrigin: 'left center'}} />
    </AbsoluteFill>
  );
};

const SceneVisual: React.FC<{
  scene: StudioScene;
  projectName: string;
  palette: keyof typeof paletteColors;
  sceneNumber: number;
  totalScenes: number;
  showText: boolean;
  style: StyleName;
}> = ({scene, projectName, palette, sceneNumber, totalScenes, showText, style}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const isVertical = height > width;
  const colors = style === 'tech' ?
    {background: '#071222', base: '#123350', accent: '#21E6F3', second: '#78A2FF', text: '#F1FCFF'} :
    style === 'energetic' ?
    {background: '#201027', base: '#482044', accent: '#FFDE49', second: '#FF5C9A', text: '#FFFFFF'} :
    style === 'playful' ?
    {background: '#162C48', base: '#2E5776', accent: '#FFCD55', second: '#80F3D3', text: '#FFFDF5'} :
    paletteColors[palette] ?? paletteColors.aurora;
  const inset = isVertical ? 55 : 86;
  const duration = Math.max(1, Math.round(scene.duration * useVideoConfig().fps));
  const alpha = progress(frame, 0, 12) *
    (1 - progress(frame, duration - 11, 11));
  const slide = (1 - progress(frame, 2, 20)) * 48;
  const headline = scene.title;
  const titleSize = Math.min(isVertical ? 82 : 85,
    Math.max(isVertical ? 42 : 44, width * 0.97 / (Math.max(headline.length, 6) * 0.49)));
  const graphicTop = isVertical ? height * 0.42 : height * 0.15;
  const graphicLeft = isVertical ? width * 0.16 : width * 0.55;

  return (
    <AbsoluteFill style={{
      overflow: 'hidden', background: colors.background, color: colors.text,
      fontFamily: 'Arial, Helvetica, sans-serif',
    }}>
      <AbsoluteFill style={{
        backgroundImage: `radial-gradient(ellipse at 72% 50%, ${colors.base}, ${colors.background} 72%)`,
      }} />
      <AbsoluteFill style={{
        opacity: 0.11,
        backgroundImage: 'linear-gradient(#8B9AB2 1px,transparent 1px),linear-gradient(90deg,#8B9AB2 1px,transparent 1px)',
        backgroundSize: '66px 66px',
        backgroundPosition: `${frame * 0.11}px ${frame * 0.14}px`,
      }} />
      {scene.imageAsset && (
        <Img src={staticFile(scene.imageAsset)} style={{
          position: 'absolute',
          top: isVertical ? height * 0.45 : height * 0.14,
          left: isVertical ? width * 0.12 : width * 0.55,
          width: isVertical ? width * 0.76 : width * 0.37,
          height: isVertical ? height * 0.38 : height * 0.70,
          objectFit: 'cover', borderRadius: 28, opacity: 0.78,
          border: `2px solid ${colors.second}66`,
          objectPosition: `${scene.focusX ?? 50}% ${scene.focusY ?? 50}%`,
          transform: sceneMotion(frame, duration, scene.visualActionPlan?.camera ?? scene.motion, style,
            scene.motionStrength, sceneNumber, scene.visualActionPlan?.shotScale),
        }} />
      )}
      {(!scene.imageAsset || scene.layout === 'orbit') && (
        <div style={{
          position: 'absolute', top: graphicTop, left: graphicLeft,
          opacity: 0.85, transform: sceneMotion(frame, duration, scene.visualActionPlan?.camera ?? scene.motion,
            style, scene.motionStrength, sceneNumber, scene.visualActionPlan?.shotScale),
        }}>
          <OrbitArt frame={frame} accent={colors.accent}
            second={colors.second} width={width} />
        </div>
      )}

      {scene.layout === 'data' && (
        <div style={{
          position: 'absolute',
          left: isVertical ? inset : width * 0.52,
          top: isVertical ? height * 0.65 : height * 0.25,
          display: 'flex', alignItems: 'end', gap: 20,
        }}>
          {[0.43, 0.76, 0.52, 0.93].map((bar, i) => (
            <div key={i} style={{
              height: height * 0.23 * bar * progress(frame, 15 + i * 6, 24),
              width: isVertical ? 66 : 73, background: i % 2 ? colors.accent : colors.second,
              borderRadius: 12,
            }} />
          ))}
        </div>
      )}

      {showText && <div style={{
        position: 'absolute', left: inset, top: isVertical ? 67 : 45,
        fontSize: isVertical ? 18 : 20, fontWeight: 800,
        color: colors.accent, letterSpacing: 4,
      }}>{projectName.toUpperCase()} / {String(sceneNumber).padStart(2, '0')}</div>}

      {showText && <div style={{
        position: 'absolute',
        left: inset, right: inset,
        top: isVertical ? (scene.layout === 'editorial' ? height * 0.32 : height * 0.17) : height * 0.25,
        maxWidth: isVertical ? width - inset * 2 : width * 0.5,
        opacity: alpha,
        transform: `translateY(${slide}px)`,
      }}>
        <div style={{
          width: 80, height: 6, background: colors.accent,
          borderRadius: 99, marginBottom: 32,
        }} />
        <div style={{
          fontWeight: 900, fontSize: titleSize, letterSpacing: -1.8,
          lineHeight: 1.04, overflowWrap: 'break-word',
          textShadow: '0 4px 13px rgba(0,0,0,.16)',
        }}>{headline}</div>
        <div style={{
          color: '#C7D1E4', fontSize: isVertical ? 28 : 25,
          lineHeight: 1.42, marginTop: 28, maxWidth: isVertical ? 580 : 540,
        }}>{scene.subtitle}</div>
      </div>}

      {scene.cues.map((cue, i) => (
        <EventVisual key={cue.id} cue={cue} index={i}
          accent={colors.accent} second={colors.second} />
      ))}
      {showText && <div style={{
        position: 'absolute', left: inset, right: inset, bottom: isVertical ? 66 : 40,
        display: 'flex', alignItems: 'center', gap: 15,
        color: colors.text, fontSize: 17, letterSpacing: 2,
      }}>
        <span>{String(sceneNumber).padStart(2, '0')}</span>
        <div style={{flex: 1, height: 2, background: '#FFFFFF33'}}>
          <div style={{
            width: `${((frame + 1) / duration) * 100}%`,
            height: '100%', background: colors.accent,
          }} />
        </div>
        <span>{String(totalScenes).padStart(2, '0')}</span>
      </div>}
    </AbsoluteFill>
  );
};

const NarrativeScene: React.FC<{
  scene: StudioScene;
  style: Exclude<StyleName, 'modern'>;
  showText: boolean;
  sceneNumber: number;
}> = ({scene, style, showText, sceneNumber}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const duration = Math.max(1, Math.round(scene.duration * useVideoConfig().fps));
  const isWatercolor = style === 'watercolor';
  const isHorror = style === 'horror';
  const isMinimal = style === 'minimal';
  const background = isWatercolor ? '#F3EBD9' : isMinimal ? '#EEE9DF' :
    isHorror ? '#080E18' : style === 'cinematic' ? '#11151A' : '#101D28';
  const sceneTransform = sceneMotion(frame, duration, scene.visualActionPlan?.camera ?? scene.motion, style,
    scene.motionStrength, sceneNumber, scene.visualActionPlan?.shotScale);
  const vignette = isHorror
    ? 'radial-gradient(ellipse at 48% 43%, transparent 18%, rgba(3,8,16,0.82) 100%)'
    : isMinimal || isWatercolor ? 'none' :
      'linear-gradient(180deg, transparent 74%, rgba(12,22,30,0.42))';
  const captionSize = width > height ? 40 : 43;
  return (
    <AbsoluteFill style={{overflow: 'hidden', background,
      color: isWatercolor || isMinimal ? '#453F35' : '#FFFFFF'}}>
      {scene.imageAsset ? (
        <Img src={staticFile(scene.imageAsset)} style={{
          position: 'absolute',
          width: isWatercolor || isMinimal ? '94%' : '100%',
          height: isWatercolor || isMinimal ? '94%' : '100%',
          left: isWatercolor || isMinimal ? '3%' : 0,
          top: isWatercolor || isMinimal ? '3%' : 0,
          objectFit: 'cover',
          objectPosition: `${scene.focusX ?? 50}% ${scene.focusY ?? 50}%`,
          borderRadius: isWatercolor || isMinimal ? 12 : 0,
          transform: sceneTransform,
          filter: isWatercolor ? 'saturate(0.93) contrast(0.96)' :
            isHorror ? 'saturate(0.74) contrast(1.13)' :
            isMinimal ? 'saturate(0.8)' : 'saturate(0.9)',
        }} />
      ) : (
        <AbsoluteFill style={{
          background: isWatercolor || isMinimal ?
            'radial-gradient(circle at 50% 55%, #FBF6E9, #EBDFC4)' :
            style === 'cinematic' ? 'radial-gradient(circle at 48% 36%, #53616A, #11151A 72%)' :
            'radial-gradient(circle at 48% 36%, #27394B, #080E18 72%)',
        }}>
          <div style={{position: 'absolute', width: width * 0.46, height: width * 0.46,
            borderRadius: '50%', border: `2px solid ${isWatercolor || isMinimal ? '#9A7D514F' : '#FFFFFF27'}`,
            left: width * 0.27, top: height * 0.33,
            transform: sceneTransform}} />
        </AbsoluteFill>
      )}
      {!isWatercolor && <AbsoluteFill style={{background: vignette, opacity: isHorror ? 1 : 0.6}} />}
      {isHorror && <AbsoluteFill style={{
        background: 'linear-gradient(180deg, #0A19382B, transparent 55%, #04081155)',
        opacity: 0.72 + 0.08 * Math.sin(frame / 33),
      }} />}
      {style === 'cinematic' && width > height && <>
        <div style={{position: 'absolute', height: height * 0.045, background: '#06080B',
          top: 0, left: 0, right: 0}} />
        <div style={{position: 'absolute', height: height * 0.045, background: '#06080B',
          bottom: 0, left: 0, right: 0}} />
      </>}
      {showText && (scene.title || scene.subtitle) && (
        <div style={{
          position: 'absolute', bottom: height * 0.12, left: width * 0.08, right: width * 0.08,
          padding: 18, background: isWatercolor || isMinimal ? '#F9F2E9D9' : '#050B16A9',
          borderRadius: 12, fontFamily: 'Arial, sans-serif',
          opacity: progress(frame, 0, 12) * (1 - progress(frame, duration - 12, 12)),
        }}>
          <div style={{fontSize: captionSize, fontWeight: 800, lineHeight: 1.15}}>{scene.title}</div>
          {scene.subtitle && <div style={{fontSize: captionSize * 0.55, marginTop: 9}}>{scene.subtitle}</div>}
        </div>
      )}
    </AbsoluteFill>
  );
};

/* Legacy authored renderer removed; AuthoredScene is the single renderer.
const LegacyAuthoredScene_UNUSED: React.FC<{scene: StudioScene; showText: boolean}> = ({scene: showScene, showText}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const scene = showScene;
  const authored = scene.authored;
  if (!authored?.layers?.length) return null;
  const seconds = frame / fps;
  const enterProgress = (layer: any) => {
    const at = Number(layer.enter?.at ?? 0);
    return interpolate(seconds, [at, at + 0.35], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  };
  return <AbsoluteFill style={{background: `linear-gradient(${Number(authored.background?.angle ?? 180)}deg, ${authored.background?.color ?? '#061526'}, ${authored.background?.color2 ?? '#102f48'})`}}>
    {authored.layers.map((layer: any, index: number) => {
      if (layer.type === 'caption' || !showText && layer.type === 'text') return null;
      const p = enterProgress(layer);
      const x = Number(layer.x ?? 50), y = Number(layer.y ?? 50), w = Number(layer.width ?? 10), h = Number(layer.height ?? 10);
      const rotate = Number(layer.rotate ?? layer.angle ?? 0);
      const shape = layer.shape ?? 'rect';
      const base = {position: 'absolute' as const, left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, opacity: Number(layer.opacity ?? 1) * p, transform: `translate(-50%, -50%) rotate(${rotate}deg)`, zIndex: Math.round(Number(layer.depth ?? .5) * 100), overflow: 'hidden' as const};
      if (layer.type === 'text') return <div key={layer.id ?? index} style={{...base, color: layer.color ?? '#F5D58B', fontSize: `${Math.max(14, width * Number(layer.size ?? 4) / 22)}px`, fontWeight: 900, textAlign: 'center', textShadow: '0 2px 8px #000'}}>{layer.text}</div>;
      const gradient = `linear-gradient(${Number(layer.angle ?? 135)}deg, ${layer.fill ?? '#fff'}, ${layer.fill2 ?? layer.fill ?? '#fff'})`;
      return <div key={layer.id ?? index} style={{...base, borderRadius: shape === 'circle' || shape === 'ellipse' ? '50%' : `${Number(layer.radius ?? 1) * 8}px`, background: gradient, border: layer.stroke ? `${Number(layer.strokeWidth ?? .5)}px solid ${layer.stroke}` : undefined}}/>;
    })}
  </AbsoluteFill>;
};
*/

const SceneLayers: React.FC<{scene: StudioScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <>{scene.layers?.map((layer) => layer.asset ? <Img key={layer.id}
    src={staticFile(layer.asset)} style={{position: 'absolute', left: `${layer.x ?? 50}%`,
      top: `${layer.y ?? 50}%`, width: '100%', height: '100%', objectFit: 'cover',
      opacity: layer.opacity ?? 1, transform: `translate(-50%,-50%) scale(${layer.scale ?? 1}) translate(${((layer.depth ?? 0) * (frame / Math.max(1, Math.round(scene.duration * fps))))}px,0)`, zIndex: 1}}/> : null)}</>;
};

export const StudioVideo: React.FC<StudioProps> = ({project}) => {
  let position = 0;
  let audioPosition = 0;
  const showText = project.showText ?? (project.style ?? 'modern') === 'modern';
  return (
    <AbsoluteFill>
      {project.scenes.map((scene, index) => {
        const start = position;
        const sceneFrames = Math.max(1, Math.round(scene.duration * (project.fps === 30 ? 30 : FPS)));
        const style = resolveSceneStyle(project, scene);
        const exit = project.scenes[index + 1]?.transition;
        position += sceneFrames;
        return (
          <Sequence key={scene.id} from={start} durationInFrames={sceneFrames}>
            {scene.videoAsset ? (
              <AbsoluteFill style={{overflow: 'hidden', background: '#080B11'}}>
                <OffthreadVideo src={staticFile(scene.videoAsset)} muted
                  style={{width: '100%', height: '100%', objectFit: 'cover'}}/>
              </AbsoluteFill>
            ) : project.visualEngine !== 'classic' && scene.imageAsset &&
              !(scene.layout === 'data' && (scene.motionGraphics?.length ?? 0) > 0 && showText) ? (
              <MediaFirstScene scene={scene} project={project} style={style}
                sceneNumber={index + 1} showText={showText}/>
            ) : (scene.motionGraphics?.length ?? 0) > 0 && showText ? (
              <SmartGraphicScene scene={scene} style={style} projectName={project.name}/>
            ) : project.visualEngine === 'canvas' && !scene.imageAsset &&
              chooseConcept(scene, project).kind === 'venice' ? (
              <Canvas3DScene scene={scene} project={project} showText={showText}/>
            ) : scene.authored?.layers?.length ? (
              <ComplexAuthoredScene scene={scene} project={project} style={style} showText={showText}/>
            ) : project.visualEngine !== 'classic' && !scene.imageAsset ? (
              <AdaptiveScene scene={scene} project={project} style={style}
                sceneNumber={index + 1} showText={showText}/>
            ) : scene.layout === 'kinetic' || scene.layout === 'collage' ? (
              <GraphicTemplate scene={scene} style={style} showText={showText}
                sceneNumber={index + 1}/>
            ) : style === 'modern' || style === 'tech' || style === 'energetic' || style === 'playful' ? (
              <SceneVisual scene={scene} projectName={project.name}
                palette={project.palette} sceneNumber={index + 1}
                totalScenes={project.scenes.length} showText={showText} style={style}/>
            ) : (
              <NarrativeScene scene={scene} style={style} showText={showText}
                sceneNumber={index + 1}/>
            )}
            {showText && scene.captions?.length ? <CaptionTrack scene={scene}/> : null}
            {scene.layers?.length ? <SceneLayers scene={scene}/> : null}
            <SceneBoundary entry={scene.transition} exit={exit} frames={sceneFrames}/>
          </Sequence>
        );
      })}
      {project.narrationMode === 'dialogues'
        ? (project.voiceClips ?? []).map((clip) => {
          const from = audioPosition;
          const frames = Math.max(1, Math.round(clip.duration * (project.fps === 30 ? 30 : FPS)));
          audioPosition += frames;
          return clip.asset ? (
            <Sequence key={clip.id} from={from} durationInFrames={frames}>
              <Audio src={staticFile(clip.asset)} volume={1} />
            </Sequence>
          ) : null;
        })
        : project.audioAsset && <Audio src={staticFile(project.audioAsset)} volume={1} />}
      {project.musicAsset && <Audio src={staticFile(project.musicAsset)} volume={project.musicVolume ?? 0.18} />}
      {project.scenes.flatMap((scene) => (scene.audioCues ?? []).map((cue) => ({...cue, sceneId: scene.id}))).map((cue) => cue.asset ? <Audio key={cue.id} src={staticFile(cue.asset)} volume={cue.volume ?? 0.45} /> : null)}
    </AbsoluteFill>
  );
};

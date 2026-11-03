import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FPS, type GraphicIcon, type MotionGraphic, type StudioScene, type StyleName} from './studio-schema';

const themes: Record<StyleName, {back: string; light: string; accent: string; second: string; third: string}> = {
  modern: {back: '#071322', light: '#F5FAFF', accent: '#39DFAE', second: '#6D96F5', third: '#F5BE65'},
  tech: {back: '#06182A', light: '#F5FBFF', accent: '#29DDE3', second: '#678DFC', third: '#E3C27D'},
  horror: {back: '#151017', light: '#FFFFFF', accent: '#F05D69', second: '#7E6CB3', third: '#E5B76E'},
  watercolor: {back: '#F0E5D2', light: '#2D3838', accent: '#409C87', second: '#838CD7', third: '#D6A35E'},
  documentary: {back: '#ECE9E2', light: '#252E32', accent: '#B94E48', second: '#547C9E', third: '#E3A55A'},
  cinematic: {back: '#17181E', light: '#F8F7F3', accent: '#D7B473', second: '#718EAC', third: '#D67B62'},
  minimal: {back: '#F3F1EC', light: '#252C2D', accent: '#2FA98B', second: '#7687AD', third: '#D19C53'},
  energetic: {back: '#181322', light: '#FFFFFF', accent: '#FFE15F', second: '#FF6D9A', third: '#6FE6D2'},
  playful: {back: '#183E53', light: '#FFFFFF', accent: '#FFCB5A', second: '#6DF0CF', third: '#EE87BD'},
};
const easing = Easing.out(Easing.cubic);
const enter = (frame: number, graphic: MotionGraphic) => interpolate(frame,
  [graphic.at * FPS, (graphic.at + graphic.duration) * FPS], [0, 1],
  {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});
const formatValue = (value: number, unit: MotionGraphic['unit']) => {
  const formatted = Math.round(value).toLocaleString('en-US');
  return unit === 'currency' ? `$${formatted}` : unit === 'percent' ? `${formatted}%` : formatted;
};

const IconArt: React.FC<{icon: GraphicIcon; color: string; size: number}> = ({icon, color, size}) => {
  const common = {stroke: color, strokeWidth: 3.5, fill: 'none',
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  const drawings: Record<GraphicIcon, React.ReactNode> = {
    wallet: <><rect x="8" y="16" width="48" height="34" rx="8"/><path d="M8 22V14a6 6 0 016-6h35"/><path d="M36 28h20v13H36a6 6 0 010-13Z"/><circle cx="43" cy="34" r="2"/></>,
    home: <><path d="m7 30 25-22 25 22"/><path d="M14 27v27h36V27"/><path d="M26 54V37h12v17"/></>,
    food: <><path d="M16 7v18m-7-18v18m14-18v18M9 25c0 9 14 9 14 0v30M43 55V9c-8 7-10 17-10 29h10"/></>,
    transport: <><rect x="10" y="11" width="44" height="39" rx="8"/><path d="M10 30h44M17 43h10m10 0h10M20 50v7m24-7v7"/><circle cx="21" cy="20" r="2"/><circle cx="43" cy="20" r="2"/></>,
    shopping: <><path d="M14 24h36l-4 31H18l-4-31ZM24 24v-8a8 8 0 0116 0v8"/><path d="M25 40h14"/></>,
    savings: <><path d="M17 27c5-12 25-15 35-3 8 10 4 23-9 27H24C11 48 7 35 17 27Z"/><path d="M25 21c-4-8-11-9-15-7m22 19v13m-5-8h10"/><circle cx="46" cy="29" r="2"/></>,
    growth: <><path d="M8 53h48M14 45V32m14 13V24m14 21V17m12-4V8"/><path d="m10 25 15-11 12 6 17-14"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 64 64" {...common}>{drawings[icon]}</svg>;
};

export const SmartGraphicScene: React.FC<{scene: StudioScene; style: StyleName;
  projectName: string}> = ({scene, style, projectName}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const vertical = height > width;
  const colors = themes[style];
  const graphics = scene.motionGraphics ?? [];
  const main = graphics.filter((graphic) => graphic.kind !== 'icon');
  const icons = graphics.filter((graphic) => graphic.kind === 'icon');
  const donut = main.find((graphic) => graphic.kind === 'donut');
  const bars = main.filter((graphic) => graphic.kind === 'bar');
  const counter = main.find((graphic) => graphic.kind === 'counter');
  const primary = main[0] ?? icons[0];
  const widthInset = vertical ? width * 0.083 : width * 0.065;
  const titleSize = vertical ? 53 : 44;
  const image = scene.imageAsset ? staticFile(scene.imageAsset) : null;

  return <AbsoluteFill style={{background: colors.back, color: colors.light,
    overflow: 'hidden', fontFamily: 'Arial, Helvetica, sans-serif'}}>
    <AbsoluteFill style={{backgroundImage:
      `radial-gradient(ellipse at 76% 54%, ${colors.accent}1B, transparent 58%), linear-gradient(130deg, ${colors.back}, ${colors.back})`}}/>
    <AbsoluteFill style={{opacity: 0.09, backgroundImage:
      `linear-gradient(${colors.light} 1px, transparent 1px), linear-gradient(90deg, ${colors.light} 1px, transparent 1px)`,
    backgroundSize: `${Math.round(width * 0.09)}px ${Math.round(width * 0.09)}px`}}/>
    {image && <Img src={image} style={{position: 'absolute', inset: 0, width: '100%', height: '100%',
      objectFit: 'cover', opacity: 0.10, filter: 'grayscale(1) blur(3px)'}}/>}
    <div style={{position: 'absolute', top: height * 0.075, left: widthInset,
      color: colors.accent, fontSize: vertical ? 20 : 18, fontWeight: 800,
      letterSpacing: 3.2}}>{projectName.toUpperCase().slice(0, 38)}</div>
    <div style={{position: 'absolute', left: widthInset, right: widthInset,
      top: vertical ? height * 0.20 : height * 0.18}}>
      <div style={{height: 8, width: 90, background: colors.accent, borderRadius: 10, marginBottom: 33}}/>
      <div style={{fontSize: titleSize, lineHeight: 1.08, fontWeight: 900, letterSpacing: -1,
        maxWidth: vertical ? width * 0.78 : width * 0.46}}>
        {(primary?.label || scene.title).slice(0, 55)}
      </div>
    </div>

    {counter && !donut && <div style={{position: 'absolute', left: vertical ? widthInset : width * 0.54,
      right: widthInset, top: vertical ? height * 0.415 : height * 0.43}}>
      <div style={{fontSize: vertical ? 126 : 90, lineHeight: 1.03, fontWeight: 900,
        letterSpacing: -5, color: colors.accent,
        opacity: Math.max(0.04, enter(frame, counter)),
        transform: `translateY(${(1 - enter(frame, counter)) * 35}px)`}}>
        {formatValue(counter.value * enter(frame, counter), counter.unit)}
      </div>
      <div style={{fontSize: vertical ? 23 : 20, color: colors.light, opacity: 0.75,
        marginTop: 24, maxWidth: vertical ? width * 0.77 : width * 0.48}}>
        {scene.title.slice(0, 95)}
      </div>
    </div>}

    {!donut && bars.length > 0 && <div style={{position: 'absolute',
      left: vertical ? widthInset : width * 0.54,
      right: widthInset,
      top: vertical ? height * 0.425 : height * 0.42,
      display: 'flex', flexDirection: 'column', gap: vertical ? 55 : 33}}>
      {bars.map((bar, index) => {
        const animated = enter(frame, bar);
        const maximum = bar.unit === 'percent' ? 100 : Math.max(1, bar.maxValue ?? 100);
        const ratio = Math.max(0, Math.min(1, bar.value / maximum));
        return <div key={bar.id} style={{minWidth: 0}}>
          <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            marginBottom: 17, gap: 25}}>
            <div style={{fontSize: vertical ? (bars.length > 1 ? 33 : 43) : 35,
              fontWeight: 800, opacity: animated}}>{bars.length === 1 && bar.unit === 'currency'
                ? `${Math.round(ratio * 100)}%` : bar.label}</div>
            <div style={{fontSize: vertical ? (bars.length > 1 ? 44 : 81) : 67,
              fontWeight: 900, color: index % 2 ? colors.second : colors.accent}}>
              {formatValue(bar.value * animated, bar.unit)}
            </div>
          </div>
          <div style={{height: vertical ? 35 : 28, borderRadius: 30,
            background: `${colors.light}2B`, overflow: 'hidden'}}>
            <div style={{height: '100%', width: `${ratio * animated * 100}%`,
              borderRadius: 30, background: index % 2 ? colors.second : colors.accent}}/>
          </div>
          {bar.unit === 'currency' && <div style={{fontSize: 23, marginTop: 14,
            color: colors.light, opacity: 0.72}}>
            Del presupuesto total
          </div>}
        </div>;
      })}
    </div>}

    {donut && (() => {
      const size = vertical ? 480 : 410;
      const r = 145;
      const circumference = 2 * Math.PI * r;
      const parts = (donut.segments ?? []).filter((part) => part.value > 0).slice(0, 5);
      const total = Math.max(1, parts.reduce((sum, part) => sum + part.value, 0));
      const reveal = enter(frame, donut);
      let offset = 0;
      const strokes = [colors.accent, colors.second, colors.third, '#A97CD8', '#F3738C'];
      return <div style={{position: 'absolute', top: vertical ? height * 0.365 : height * 0.20,
        left: vertical ? (width - size) / 2 : width * 0.52,
        display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <svg viewBox="0 0 400 400" width={size} height={size}>
          <circle cx="200" cy="200" r={r} fill="none" stroke={`${colors.light}24`} strokeWidth="52"/>
          {parts.map((part, index) => {
            const length = circumference * part.value / total;
            const beginning = offset;
            offset += length;
            return <circle key={`${part.label}-${index}`} cx="200" cy="200" r={r}
              fill="none" stroke={strokes[index]} strokeWidth="52"
              strokeDasharray={`${length * reveal} ${circumference}`}
              strokeDashoffset={-beginning} transform="rotate(-90 200 200)"/>;
          })}
          <text x="200" y="202" fill={colors.light} textAnchor="middle"
            dominantBaseline="central" fontSize="62" fontWeight="900">{Math.round(total)}%</text>
        </svg>
        <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: '14px 22px', maxWidth: vertical ? width * 0.85 : width * 0.46}}>
          {parts.map((part, index) => <div key={part.label + index} style={{display: 'flex',
            alignItems: 'center', fontSize: vertical ? 21 : 19, gap: 9,
            opacity: reveal}}>
            <span style={{width: 13, height: 13, borderRadius: '50%', background: strokes[index]}}/>
            {part.label} {part.value}%
          </div>)}
        </div>
      </div>;
    })()}

    {icons.length > 0 && <div style={{position: 'absolute', left: widthInset,
      right: widthInset, bottom: vertical ? height * 0.13 : height * 0.12,
      display: 'flex', justifyContent: 'center', gap: vertical ? 24 : 32}}>
      {icons.map((icon) => {
        const visibility = enter(frame, icon);
        return <div key={icon.id} style={{display: 'flex', alignItems: 'center',
          flexDirection: 'column', gap: 14, opacity: visibility,
          transform: `translateY(${(1 - visibility) * 28}px)`,
          width: vertical ? width * 0.24 : width * 0.15}}>
          <div style={{width: vertical ? 116 : 92, height: vertical ? 116 : 92,
            borderRadius: 25, display: 'grid', placeItems: 'center',
            background: `${colors.accent}1C`, border: `2px solid ${colors.accent}72`}}>
            <IconArt icon={icon.icon ?? 'wallet'} color={colors.accent}
              size={vertical ? 66 : 53}/>
          </div>
          <div style={{fontSize: vertical ? 21 : 18, fontWeight: 750,
            textAlign: 'center'}}>{icon.label}</div>
        </div>;
      })}
    </div>}

    <div style={{position: 'absolute', bottom: vertical ? 56 : 35,
      left: widthInset, right: widthInset, display: 'flex', alignItems: 'center',
      gap: 18, fontSize: 17, color: colors.light, opacity: 0.6}}>
      <span>MOTION STUDIO</span><div style={{flex: 1, height: 2,
        background: `${colors.light}30`}}><div style={{width: `${Math.min(100, 100 * frame /
        Math.max(1, scene.duration * FPS - 1))}%`, height: '100%', background: colors.accent}}/></div>
    </div>
  </AbsoluteFill>;
};

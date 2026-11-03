import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {content} from './content';

// Pure frame-based animation: preview and export always show the same frames.
const ink = '#080B17';
const cream = '#F7F8FB';
const muted = '#A4AFCA';
const mint = '#79FFE1';
const violet = '#9888FF';
const orange = '#FFC18E';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = (frame: number, start: number, duration: number) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
const windowOpacity = (frame: number, enter: number, exit: number) =>
  ease(frame, enter, 12) * (1 - ease(frame, exit - 12, 12));
const rise = (frame: number, start: number, amount = 54) =>
  (1 - ease(frame, start, 19)) * amount;

const tiny = {
  letterSpacing: 4,
  fontSize: 17,
  fontWeight: 700,
  color: muted,
} as const;

const Display: React.FC<{
  children: React.ReactNode;
  color?: string;
  size?: number;
}> = ({children, color = cream, size = 92}) => (
  <div style={{
    fontSize: size, fontWeight: 900, lineHeight: 0.99, color,
    letterSpacing: -4, fontFamily: 'Arial, Helvetica, sans-serif',
  }}>
    {children}
  </div>
);

const Orbital: React.FC<{
  frame: number;
  size: number;
  color?: string;
}> = ({frame, size, color = mint}) => {
  const rotation = frame * 0.85;
  const reverse = -frame * 0.53;
  const pulse = 0.96 + 0.035 * Math.sin(frame / 11);
  const gradientId = color === mint ? 'orbital-mint' : 'orbital-violet';
  return (
    <svg viewBox="0 0 600 600" width={size} height={size}
      style={{overflow: 'visible', transform: `scale(${pulse})`}}>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="1" y2="0">
          <stop offset="0" stopColor={violet} />
          <stop offset="1" stopColor={color} />
        </linearGradient>
      </defs>
      <circle cx="300" cy="300" r="238" stroke="#A3ACD0"
        strokeWidth="1.5" strokeOpacity="0.2" fill="none" />
      <circle cx="300" cy="300" r="176" stroke="#A3ACD0"
        strokeWidth="1.5" strokeOpacity="0.25" fill="none" />
      <g transform={`rotate(${rotation} 300 300)`}>
        <circle cx="300" cy="300" r="238" stroke={`url(#${gradientId})`}
          strokeWidth="7" strokeDasharray="330 1165" strokeLinecap="round" fill="none" />
        <circle cx="300" cy="62" r="10" fill={color} />
      </g>
      <g transform={`rotate(${reverse} 300 300)`}>
        <circle cx="300" cy="300" r="176" stroke={violet} strokeWidth="5"
          strokeDasharray="175 935" strokeLinecap="round" fill="none" />
        <circle cx="124" cy="300" r="7" fill={orange} />
      </g>
      <g transform={`rotate(${frame * 0.38} 300 300)`}>
        <rect x="223" y="223" width="154" height="154" rx="32"
          fill="#121A2B" stroke={`url(#${gradientId})`} strokeWidth="4"
          transform="rotate(45 300 300)" />
      </g>
      <circle cx="300" cy="300" r="63" fill={color} opacity="0.13" />
      <path d="M262 306 L289 333 L341 274" stroke={color} strokeWidth="14"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
};

const Background: React.FC<{frame: number}> = ({frame}) => (
  <AbsoluteFill style={{
    backgroundColor: ink,
    backgroundImage:
      'radial-gradient(ellipse at 60% 44%, #17203F 0%, #0C1020 44%, #080B17 77%)',
  }}>
    <AbsoluteFill style={{
      opacity: 0.18,
      backgroundImage:
        'linear-gradient(#465174 1px, transparent 1px),linear-gradient(90deg,#465174 1px,transparent 1px)',
      backgroundSize: '72px 72px',
      backgroundPosition: `${(frame * 0.12) % 72}px ${(frame * 0.17) % 72}px`,
      maskImage: 'linear-gradient(to bottom, transparent, black 25%, black 80%, transparent)',
    }} />
    <div style={{
      position: 'absolute', top: 500, left: -250, width: 850, height: 850,
      border: '1px solid rgba(151, 166, 225, 0.12)',
      borderRadius: '50%', transform: `scale(${1 + frame / 1800})`,
    }} />
    <div style={{
      position: 'absolute', top: 625, left: -125, width: 600, height: 600,
      border: '1px solid rgba(151, 166, 225, 0.09)', borderRadius: '50%',
    }} />
  </AbsoluteFill>
);

const Intro: React.FC<{frame: number}> = ({frame}) => (
  <AbsoluteFill style={{opacity: windowOpacity(frame, 0, 96)}}>
    <div style={{
      position: 'absolute', top: 272, left: 65,
      opacity: ease(frame, 8, 17),
      transform: `translateY(${rise(frame, 8)}px)`,
    }}>
      <div style={{...tiny, color: mint, marginBottom: 30}}>{content.introKicker}</div>
      <Display size={115}>{content.introTitle1}</Display>
      <Display size={94} color={mint}>{content.introTitle2}</Display>
    </div>
    <div style={{
      position: 'absolute', top: 550, left: 66, width: 540,
      height: 2, background: '#58637D', opacity: ease(frame, 28, 16),
    }}>
      <div style={{width: `${ease(frame, 30, 42) * 100}%`, background: mint, height: 3}} />
    </div>
    <div style={{
      position: 'absolute', top: 604, left: 66, right: 76,
      fontSize: 29, color: muted, lineHeight: 1.4,
      opacity: ease(frame, 36, 17),
      transform: `translateY(${rise(frame, 36, 25)}px)`,
    }}>
      {content.introSubtitle} <span style={{color: cream}}>{content.introEmphasis}</span>
    </div>
    <div style={{
      position: 'absolute', bottom: 212, left: 20,
      opacity: ease(frame, 20, 36),
    }}>
      <Orbital frame={frame} size={620} />
    </div>
    <div style={{
      position: 'absolute', bottom: 128, right: 64, ...tiny,
      fontSize: 13, color: orange, opacity: ease(frame, 48, 14),
    }}>
      {content.introFooter}
    </div>
  </AbsoluteFill>
);

const Feature: React.FC<{
  frame: number;
  start: number;
  left: number;
  title: string;
  subtitle: string;
  accent: string;
  number: string;
}> = ({frame, start, left, title, subtitle, accent, number}) => (
  <div style={{
    position: 'absolute', left, top: 780, width: 270, height: 235,
    border: '1px solid #4B5576', borderRadius: 27,
    background: 'rgba(19, 25, 45, 0.93)', padding: 28,
    opacity: ease(frame, start, 13),
    transform: `translateY(${rise(frame, start, 40)}px) rotate(${left < 200 ? -2 : 2}deg)`,
    boxShadow: '0px 15px 35px rgba(0,0,0,0.16)',
  }}>
    <div style={{fontSize: 16, letterSpacing: 2.2, color: accent}}>{number} / 02</div>
    <div style={{fontSize: 33, fontWeight: 800, marginTop: 64, color: cream}}>{title}</div>
    <div style={{fontSize: 17, color: muted, marginTop: 8}}>{subtitle}</div>
  </div>
);

const Precision: React.FC<{frame: number}> = ({frame}) => (
  <AbsoluteFill style={{opacity: windowOpacity(frame, 82, 200)}}>
    <div style={{
      position: 'absolute', top: 258, left: 62,
      opacity: ease(frame, 86, 17),
      transform: `translateY(${rise(frame, 86)}px)`,
    }}>
      <div style={{...tiny, color: orange, marginBottom: 29}}>{content.middleKicker}</div>
      <Display size={77}>{content.middleTitle1}</Display>
      <Display size={77} color={violet}>{content.middleTitle2}</Display>
    </div>
    <div style={{position: 'absolute', left: 80, top: 405, opacity: ease(frame, 91, 24)}}>
      <Orbital frame={frame + 57} size={560} color={violet} />
    </div>
    <Feature frame={frame} start={111} left={65} title={content.feature1}
      subtitle={content.feature1Caption} accent={mint} number="01" />
    <Feature frame={frame} start={125} left={379} title={content.feature2}
      subtitle={content.feature2Caption} accent={orange} number="02" />
    <div style={{
      position: 'absolute', bottom: 134, left: 67, right: 66,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      opacity: ease(frame, 145, 22),
    }}>
      <span style={{fontSize: 18, color: muted, letterSpacing: 2}}>{content.middleFooter}</span>
      <span style={{fontSize: 26, color: mint}}>↗</span>
    </div>
  </AbsoluteFill>
);

const Finale: React.FC<{frame: number}> = ({frame}) => {
  const grow = ease(frame, 206, 65);
  return (
    <AbsoluteFill style={{opacity: ease(frame, 188, 18)}}>
      <div style={{
        position: 'absolute', width: 690, height: 690, left: 15, top: 220,
        border: `2px solid ${violet}`, opacity: 0.17 + 0.14 * grow,
        borderRadius: '50%',
        transform: `scale(${0.6 + 0.75 * grow}) rotate(${frame * 0.18}deg)`,
      }} />
      <div style={{
        position: 'absolute', top: 420, left: 64,
        transform: `translateY(${rise(frame, 192)}px)`,
      }}>
        <div style={{...tiny, color: mint, marginBottom: 24}}>{content.finaleKicker}</div>
        <Display size={112}>{content.finaleTitle1}</Display>
        <Display size={109}>{content.finaleTitle2}</Display>
        <Display size={112} color={mint}>{content.finaleTitle3}</Display>
      </div>
      <div style={{
        position: 'absolute', left: 68, right: 68, top: 850, height: 3,
        background: '#354163', opacity: ease(frame, 219, 10),
      }}>
        <div style={{
          height: '100%', width: `${grow * 100}%`,
          background: `linear-gradient(90deg,${violet},${mint})`,
        }} />
      </div>
      <div style={{
        position: 'absolute', left: 68, top: 894, fontSize: 27, color: muted,
        opacity: ease(frame, 227, 20),
      }}>
        {content.finaleSubtitle}
      </div>
      <div style={{
        position: 'absolute', left: 68, bottom: 155,
        border: `1px solid ${mint}`, borderRadius: 99,
        padding: '16px 23px', opacity: ease(frame, 240, 14),
      }}>
        <span style={{...tiny, color: mint}}>{content.finaleBadge}</span>
      </div>
    </AbsoluteFill>
  );
};

export const ProfessionalShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{
      fontFamily: 'Arial, Helvetica, sans-serif',
      overflow: 'hidden', backgroundColor: ink,
    }}>
      <Background frame={frame} />
      <Intro frame={frame} />
      <Precision frame={frame} />
      <Finale frame={frame} />
      <div style={{
        position: 'absolute', top: 59, left: 64, right: 66,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{
          width: 57, height: 57, border: `2px solid ${mint}`,
          borderRadius: 16, display: 'grid', placeItems: 'center',
          fontSize: 27, fontWeight: 900, color: mint,
        }}>M</div>
        <div style={{...tiny, fontSize: 14}}>{content.brand}</div>
      </div>
      <div style={{
        position: 'absolute', bottom: 52, left: 64, right: 64,
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <span style={{...tiny, fontSize: 14, color: cream}}>
          00:{String(Math.floor(frame / 24)).padStart(2, '0')}
        </span>
        <div style={{height: 2, background: '#445075', flex: 1}}>
          <div style={{
            width: `${((frame + 1) / 288) * 100}%`,
            height: '100%', backgroundColor: mint,
          }} />
        </div>
        <span style={{...tiny, fontSize: 14, color: cream}}>00:12</span>
      </div>
    </AbsoluteFill>
  );
};

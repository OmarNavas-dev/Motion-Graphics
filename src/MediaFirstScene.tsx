import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {type StudioProject, type StudioScene, type StyleName} from './studio-schema';
import {identities} from './semantic-director.mjs';
import {directMediaScene} from './media-director.mjs';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = (frame: number, from: number, length: number) => interpolate(frame,
  [from, from + Math.max(1, length)], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});

// Convierte la imagen del usuario en la protagonista. No presupone transparencia
// ni recorta agresivamente una ilustración cuadrada en un video vertical.
export const MediaFirstScene: React.FC<{scene: StudioScene; project: StudioProject;
  style: StyleName; sceneNumber: number; showText: boolean}> =
  ({scene, project, style, sceneNumber, showText}) => {
    const frame = useCurrentFrame();
    const {width, height} = useVideoConfig();
    const portrait = height > width;
    const duration = Math.max(1, Math.round(scene.duration * useVideoConfig().fps));
    const t = Math.max(0, Math.min(1, frame / Math.max(1, duration - 1)));
    const direction = directMediaScene(scene, {...project, style});
    const theme = identities[style] ?? identities.modern;
    const focus = `${scene.focusX ?? 50}% ${scene.focusY ?? 50}%`;
    const strength = Math.max(0, Math.min(1, (scene.motionStrength ?? 45) / 100));
    const preset = scene.visualActionPlan?.camera || (scene.motion === 'auto' || !scene.motion ?
      (['horror', 'cinematic', 'documentary'].includes(style) ? 'push' :
        sceneNumber % 2 === 0 ? 'pan-left' : 'pan-right') : scene.motion);
    const shotScale = scene.visualActionPlan?.shotScale === 'close' ? 1.08 :
      scene.visualActionPlan?.shotScale === 'wide' ? .94 : 1;
    const travel = strength * (portrait ? 32 : 42);
    const moveX = preset === 'pan-right' ? (t - 0.5) * travel :
      preset === 'pan-left' ? (0.5 - t) * travel :
        preset === 'drift' ? Math.sin(t * Math.PI) * travel * .4 : 0;
    const moveY = preset === 'rise' ? (0.5 - t) * travel :
      preset === 'drift' ? Math.sin(t * Math.PI * 2) * travel * .14 : 0;
    const zoom = preset === 'static' || strength === 0 ? shotScale :
      preset === 'pull' ? shotScale * (1.04 + (1 - t) * .10 * strength) :
        shotScale * (1.04 + t * .10 * strength);
    const camera = `translate3d(${moveX.toFixed(2)}px, ${moveY.toFixed(2)}px, 0) scale(${zoom.toFixed(4)})`;
    const image = staticFile(scene.imageAsset);
    const darker = ['horror', 'cinematic', 'tech', 'energetic'].includes(style);
    const mediaEnter = ease(frame, 0, 16);
    const titleEnter = ease(frame, 11, 13) * (1 - ease(frame, duration - 9, 9));
    const accent = theme.accent;
    const concept = direction.concept;
    const showHeadline = showText && direction.headline.length > 0;
    const hasStatistic = showText && (scene.motionGraphics?.length ?? 0) > 0;
    const overlayBottom = hasStatistic ? height * .27 : height * .12;
    const showcase = direction.fit === 'contain';

    return <AbsoluteFill style={{background: theme.background, overflow: 'hidden',
      color: theme.ink, fontFamily: 'Arial, Helvetica, sans-serif'}}>
      {/* El segundo plano rellena los bordes cuando la ilustración es cuadrada. */}
      <AbsoluteFill style={{overflow:'hidden'}}>
        <Img src={image} style={{position:'absolute',width:'120%',height:'120%',left:'-10%',top:'-10%',
          objectFit:'cover',objectPosition:focus,
          filter:`blur(${portrait ? 34 : 26}px) saturate(${darker ? .85 : 1.16}) brightness(${darker ? .5 : .81})`,
          opacity:.86}}/>
        <AbsoluteFill style={{background: `linear-gradient(180deg, ${theme.background}93 0%, transparent 23%, transparent 61%, ${theme.background}B8 100%)`}}/>
      </AbsoluteFill>
      {/* Imagen real: ocupa el escenario, sin cuadro de diapositiva. */}
      <AbsoluteFill style={{overflow: 'hidden',
        padding: showcase ? (portrait ? '8% 0 11%' : '0 4%') : 0}}>
        <Img src={image} style={{width:'100%',height:'100%',objectFit:direction.fit,
          objectPosition:focus,transform:camera,opacity:mediaEnter,
          filter:darker ? 'saturate(.94) contrast(1.04)' : 'saturate(1.03)'}}/>
      </AbsoluteFill>
      <AbsoluteFill style={{background:darker ?
        'linear-gradient(180deg,rgba(0,0,0,.27),transparent 31%,transparent 65%,rgba(0,0,0,.52))' :
        'linear-gradient(180deg,rgba(0,0,0,.19),transparent 28%,transparent 67%,rgba(0,0,0,.38))',
        pointerEvents:'none'}}/>
      {concept.kind === 'immune' && <ImmuneMotion frame={frame} duration={duration}
        width={width} height={height} accent={accent} detail={concept.detail}/>}
      {concept.kind === 'finance' && !hasStatistic && <FinanceMotion frame={frame}
        width={width} height={height} accent={accent}/>}
      {concept.kind === 'horror' && <div style={{position:'absolute',inset:0,
        background:'radial-gradient(ellipse at 49% 44%,transparent 32%,rgba(3,3,8,.42) 100%)',
        opacity:.55 + Math.sin(frame / 33) * .04}}/>}
      {hasStatistic && <div style={{position:'absolute',right:width*.07,top:height*.09,
        minWidth:width*.35,maxWidth:width*.6,padding:'16px 23px',borderRadius:16,
        background:'#0C102BCC',border:`2px solid ${accent}99`,color:'#FFFFFF',
        boxShadow:'0 12px 25px #0005',opacity:ease(frame,12,12)}}>
        <div style={{fontSize:Math.max(17,width*.026),letterSpacing:1.3,fontWeight:800}}>
          {scene.motionGraphics?.[0].label}</div>
        <div style={{fontWeight:900,fontSize:Math.round(width*.083),letterSpacing:-1.2}}>
          {Math.round((scene.motionGraphics?.[0].value ?? 0)*ease(frame,16,22)).toLocaleString('es')}
          {scene.motionGraphics?.[0].unit === 'percent' ? '%' : ''}</div>
      </div>}
      {showHeadline && <div style={{position:'absolute',left:width*.075,right:width*.075,
        bottom:overlayBottom,opacity:titleEnter,transform:`translateY(${(1-titleEnter)*18}px)`,
        background:darker?'#11131AB8':'#0C2036B5',borderRadius:portrait?20:15,
        padding:portrait?'20px 25px':'14px 25px',borderLeft:`7px solid ${accent}`,
        boxShadow:'0 14px 40px #0006'}}>
        <div style={{color:'#FFFFFF',fontSize:Math.round(portrait?Math.min(51,width*.068):Math.min(42,height*.057)),
          lineHeight:1.12,letterSpacing:-.9,fontWeight:900,
          textTransform:'uppercase',overflowWrap:'break-word'}}>{direction.headline}</div>
      </div>}
    </AbsoluteFill>;
  };

const ImmuneMotion:React.FC<{frame:number;duration:number;width:number;height:number;
  accent:string;detail:string}> = ({frame,duration,width,height,accent,detail}) => {
  const arrive=ease(frame,12,Math.min(22,Math.round(duration*.4)));
  const portion=Math.max(0,Math.min(1,(frame-8)/Math.max(20,duration-8)));
  const wash=detail==='wash';
  const skin=detail==='skin';
  // Pequeños indicadores contextuales; no sustituyen a los personajes del usuario.
  return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
    style={{position:'absolute',inset:0,pointerEvents:'none',opacity:.8*arrive}}>
    {skin ? <>
      <path d={`M${width*.12} ${height*.72}Q${width*.5} ${height*.69} ${width*.88} ${height*.72}`}
        stroke={accent} strokeWidth="6" strokeLinecap="round" fill="none" opacity=".78"
        strokeDasharray={`${arrive*width*.85} ${width}`}/>
      {[0,1,2].map((n)=>{
        const move=Math.sin(portion*Math.PI)*(13+n*3);
        const cx=width*(.25+n*.25), cy=height*(.65-.02*n)-move;
        return <g key={n} transform={`translate(${cx} ${cy})`}>
          <circle r="11" fill={n%2?accent:'#FFBE72'} stroke="#FFFFFF" strokeWidth="3"/>
          {Array.from({length:6},(_,i)=>{
            const a=i*Math.PI/3;return <line key={i} x1={14*Math.cos(a)} y1={14*Math.sin(a)}
              x2={19*Math.cos(a)} y2={19*Math.sin(a)} stroke="#FFFFFF" strokeWidth="3"/>;})}
        </g>;
      })}
    </> : wash ? <>
      {Array.from({length:9},(_,i)=>{
        const radius=5+(i%3)*5;const x=width*(.1+(i%5)*.18);
        const y=height*(.84-(i%4)*.1)-portion*height*.11;
        return <circle key={i} cx={x} cy={y} r={radius}
          fill="#FFFFFF12" stroke="#F0FFFFCC" strokeWidth="2"/>;
      })}
    </> : <>
      <circle cx={width*.79} cy={height*.64} r={width*.11*arrive}
        fill="none" stroke={accent} strokeWidth="5" opacity=".62"/>
      <path d={`M${width*.79} ${height*.58}l${width*.06} ${height*.03} -${width*.02} ${height*.12}q-${width*.045} ${height*.036}-${width*.09} 0l-${width*.02}-${height*.12}Z`}
        fill={`${accent}55`} stroke={accent} strokeWidth="3"/>
    </>}
  </svg>;
};

const FinanceMotion:React.FC<{frame:number;width:number;height:number;accent:string}> =
  ({frame,width,height,accent}) => <svg width={width} height={height}
    style={{position:'absolute',inset:0,pointerEvents:'none'}}>
    {[.25,.47,.73].map((bar,i)=><rect key={i} x={width*(.62+i*.105)}
      y={height*.84-height*.11*bar*ease(frame,10+i*5,20)}
      width={width*.075} height={height*.11*bar*ease(frame,10+i*5,20)}
      rx="7" fill={accent} opacity=".8"/>)}
  </svg>;

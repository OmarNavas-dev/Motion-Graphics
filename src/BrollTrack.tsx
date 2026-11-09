import {AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {BrollClip, StudioProps} from './studio-schema';

const clamp = {extrapolateLeft:'clamp', extrapolateRight:'clamp'} as const;

const BrollShot: React.FC<{clip:BrollClip;frames:number}> = ({clip,frames}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const entrance = Math.min(8,Math.floor(frames/4));
  const fadeIn = entrance ? interpolate(frame,[0,entrance],[0,1],clamp) : 1;
  const fadeOut = entrance ? interpolate(frame,[frames-entrance-1,frames-1],[1,0],clamp) : 1;
  const opacity = Math.max(0,Math.min(fadeIn,fadeOut));
  const p = frame / Math.max(1,frames-1);
  const motion = clip.motion === 'rise' ? `translateY(${(1-p)*16}px)` :
    clip.motion === 'zoom' ? `scale(${0.92+p*0.08})` :
    clip.motion === 'slide-left' ? `translateX(${(1-p)*24}px)` : 'none';
  return <AbsoluteFill style={{opacity,pointerEvents:'none',overflow:'hidden'}}>
    {clip.kind === 'cutaway' && clip.background && <AbsoluteFill style={{background:clip.background}}/>}
    {clip.objects.map(obj => {
      const layout = {position:'absolute' as const,left:`${obj.x}%`,top:`${obj.y}%`,width:`${obj.width}%`,
        height:`${obj.height}%`,transform:motion};
      if (obj.type === 'image') return <Img key={obj.id} src={staticFile(obj.asset!)}
        style={{...layout,objectFit:'cover'}}/>;
      if (obj.type === 'shape') return <div key={obj.id}
        style={{...layout,background:obj.color,borderRadius:obj.shape === 'circle' ? '50%' : 14}}/>;
      return <div key={obj.id} style={{...layout,color:obj.color,fontSize:(obj.fontSize ?? 42)*(width/720),
        fontFamily:'Arial, sans-serif',fontWeight:800,lineHeight:1.1,overflow:'hidden',display:'flex',alignItems:'center',
        whiteSpace:'pre-wrap',overflowWrap:'anywhere',textShadow:'0 2px 5px #0007'}}>{obj.text}</div>;
    })}
  </AbsoluteFill>;
};

export const BrollTrack:React.FC<StudioProps> = ({project}) => {
  const {fps} = useVideoConfig();
  return <AbsoluteFill style={{pointerEvents:'none',background:'transparent'}}>
    {(project.broll ?? []).map(clip => {
      const from = Math.ceil(clip.globalAt*fps-1e-8);
      const frames = Math.max(1,Math.ceil((clip.globalAt+clip.duration)*fps-1e-8)-from);
      return <Sequence key={clip.id} from={from} durationInFrames={frames} premountFor={fps}>
        <BrollShot clip={clip} frames={frames}/>
      </Sequence>;
    })}
  </AbsoluteFill>;
};

// Standalone composition deliberately has no opaque scene background or audio.
export const TransparentBroll:React.FC<StudioProps> = ({project}) => <BrollTrack project={project}/>;

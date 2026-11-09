import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile} from 'remotion';
import type {StudioProject} from './studio-schema';

// Real three-source comparison. The P4 demo only draws explicitly labelled
// illustrative panels; a production showdown must provide three local MP4s.
export const SpecializedWorkflowMedia:React.FC<{project:StudioProject}> = ({project}) => {
  if(project.workflow?.id!=='model-showdown'||project.workflow.demo ||
    project.workflow.media.length!==3)return null;
  const vertical=project.format==='vertical';
  return <AbsoluteFill style={{pointerEvents:'none'}}>
    {project.workflow.media.map((asset,i)=>{
      const style:React.CSSProperties=vertical?{
        position:'absolute',left:'7%',width:'86%',top:`${26+i*24}%`,height:'16%',
      }:{position:'absolute',left:`${3+i*33}%`,top:'34%',width:'28%',height:'43%'};
      return <div key={asset+i} style={{...style,background:'#0A101C',overflow:'hidden',
        border:'1px solid #60718A',borderRadius:8}}>
        <OffthreadVideo src={staticFile(asset)} muted
          style={{width:'100%',height:'100%',objectFit:'cover'}}/>
        <div style={{position:'absolute',inset:'0 auto auto 0',padding:'5px 12px',
          font:'600 15px Arial',background:'#0B0B0FD9',color:'#FFFFFF'}}>
          {`FUENTE ${i+1}`}
        </div>
      </div>;
    })}
  </AbsoluteFill>;
};

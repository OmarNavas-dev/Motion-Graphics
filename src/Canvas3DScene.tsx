import {useLayoutEffect, useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {chooseConcept} from './semantic-director.mjs';
import {drawVeniceFrame} from './canvas-3d-engine.mjs';
import {createVisualActionPlan} from './visual-action-planner.mjs';
import type {StudioProject, StudioScene} from './studio-schema';

export const Canvas3DScene: React.FC<{
  scene: StudioScene;
  project: StudioProject;
  showText: boolean;
}> = ({scene, project, showText}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const concept = chooseConcept(scene, project);
  const detail = concept.kind === 'venice' ? concept.detail : 'city';
  const plan = scene.visualActionPlan ?? createVisualActionPlan(scene, project);
  const totalFrames = Math.max(1, Math.round(scene.duration * fps));
  const progress = Math.min(1, Math.max(0, frame / Math.max(1, totalFrames - 1)));

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', {alpha: false});
    if (!canvas || !context) return;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    context.imageSmoothingEnabled = true;
    drawVeniceFrame(context, width, height, frame, detail, showText, plan, progress);
  }, [detail, frame, height, plan, progress, showText, width]);

  return <canvas ref={canvasRef} aria-label="Escena 3D de Venecia dibujada en Canvas"
    style={{position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%'}}/>;
};

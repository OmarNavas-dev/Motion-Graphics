/* eslint-disable @remotion/warn-native-media-tag -- Editor-only srcDoc player; never rendered in a composition. */
import {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {buildPreviewHtml} from '../preview-player.mjs';
import {getDimensions, type StudioProject} from './studio-schema';

export type PreviewHandle = {getCurrentFrame: () => number; seekTo: (frame: number) => void};

export const FaithfulPreview = forwardRef<PreviewHandle, {project: StudioProject}>(function FaithfulPreview({project}, ref) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const seconds = useRef(0);
  const ready = useRef(false);
  const currentHtml = useRef('');
  const [gsap, setGsap] = useState('');
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const fps = project.fps ?? 24;
  const dimensions = getDimensions(project.format, project.resolution);
  const seek = (time: number) => {
    seconds.current = Math.max(0, time);
    iframe.current?.contentWindow?.postMessage({type: 'ms-preview-seek', seconds: seconds.current}, '*');
  };
  useImperativeHandle(ref, () => ({getCurrentFrame: () => Math.round(seconds.current * fps),
    seekTo: (frame) => seek(frame / fps)}), [fps]);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/hyperframes/gsap.min.js', {signal: controller.signal}).then(response => {
      if (!response.ok) throw new Error('No se pudo cargar el reproductor.');
      return response.text();
    }).then(setGsap).catch(e => {if (!controller.signal.aborted) setError(e.message);});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!gsap) return;
    // Rebuild from current edits, without saving over the user's project or rendering an MP4.
    const timer = setTimeout(() => {
      try {
        const next = buildPreviewHtml(project, gsap);
        if (next !== currentHtml.current) {
          ready.current = false;
          currentHtml.current = next;
          setHtml(next);
        }
        setError('');
      }
      catch (e) {setError((e as Error).message);}
    }, 250);
    return () => clearTimeout(timer);
  }, [project, gsap]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (!ready.current || event.source !== iframe.current?.contentWindow || event.data?.type !== 'ms-preview-state') return;
      if (Number.isFinite(event.data.seconds)) seconds.current = event.data.seconds;
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  if (error) return <div role="alert">No se pudo mostrar la vista previa: {error}</div>;
  if (!html) return <p role="status">Preparando vista previa…</p>;
  return <div style={{position: 'relative', width: '100%', paddingBottom: 56,
    aspectRatio: `${dimensions.width} / ${dimensions.height}`, boxSizing: 'content-box'}}>
    <iframe ref={iframe} title="Vista previa del video" srcDoc={html}
      onLoad={() => {seek(seconds.current); ready.current = true;}}
      style={{position: 'absolute', inset: 0, display: 'block', border: 0, width: '100%', height: '100%'}}/>
  </div>;
});

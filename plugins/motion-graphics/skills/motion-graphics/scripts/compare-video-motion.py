#!/usr/bin/env python3
"""Compare sample-by-sample motion energy of two videos. Not an aesthetic grade.

Decodes downscaled grayscale frames through local ffmpeg, no remote services.
Highlights static spans, change peaks, and timing mismatch, without claiming
to measure object anatomy, semantic correctness or creative quality.
"""
import argparse
import json
import math
import shutil
import subprocess


def samples(video, fps=6, width=90, height=160, max_seconds=90):
    if not shutil.which('ffmpeg'):
        raise RuntimeError('ffmpeg no está instalado')
    framesize = width * height
    proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', video, '-t', str(max_seconds),
                             '-vf', f'fps={fps},scale={width}:{height}:flags=bilinear,format=gray',
                             '-f', 'rawvideo', '-'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    frames = []
    try:
        while True:
            chunk = proc.stdout.read(framesize)
            if not chunk:
                break
            if len(chunk) != framesize:
                raise RuntimeError('Fotograma incompleto')
            frames.append(chunk)
    finally:
        proc.stdout.close()
        error = proc.stderr.read().decode('utf-8', errors='replace')
        code = proc.wait()
    if code:
        raise RuntimeError(error or f'ffmpeg terminó con código {code}')
    if len(frames) < 2:
        raise RuntimeError('No hay suficientes fotogramas')
    return frames


def motion_energy(frames):
    return [sum(abs(a - b) for a, b in zip(frames[i], frames[i-1])) /
            (255 * len(frames[i])) for i in range(1, len(frames))]


def summarize(energy, fps=6):
    maximum = max(energy) if energy else 0
    threshold = max(.003, maximum * .08)
    still = []
    start = None
    for i, value in enumerate(energy):
        if value < threshold and start is None:
            start = i
        if (value >= threshold or i == len(energy)-1) and start is not None:
            stop = i if value >= threshold else i + 1
            if stop-start >= fps:
                still.append({'start': round(start/fps, 2), 'end': round(stop/fps, 2)})
            start = None
    peaks = sorted(range(len(energy)), key=lambda i: energy[i], reverse=True)[:10]
    return {'seconds': round((len(energy)+1)/fps, 2),
            'mean_change': round(sum(energy)/len(energy), 5),
            'peak_changes_seconds': sorted(round((i+1)/fps, 2) for i in peaks),
            'static_spans': still}


def compare_energy(reference, candidate):
    # Normalized progress gives a useful indication even if videos differ in length.
    bins = min(120, len(reference), len(candidate))
    if bins < 2:
        return {'motion_similarity': None}
    def interp(seq, at):
        pos = at*(len(seq)-1)
        i = min(len(seq)-2, int(pos))
        return seq[i]+(seq[i+1]-seq[i])*(pos-i)
    a = [interp(reference,i/(bins-1)) for i in range(bins)]
    b = [interp(candidate,i/(bins-1)) for i in range(bins)]
    mean_a=sum(a)/bins; mean_b=sum(b)/bins
    va=sum((x-mean_a)**2 for x in a)
    vb=sum((y-mean_b)**2 for y in b)
    if va<1e-12 or vb<1e-12:
        score=0.0
    else:
        score=sum((x-mean_a)*(y-mean_b) for x,y in zip(a,b))/math.sqrt(va*vb)
    return {'motion_change_correlation': round(score, 3),
            'explanation': 'Correlación del cambio global de píxeles; NO evalúa personajes, similitud de estilos ni narrativa.'}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('candidate')
    p.add_argument('--reference')
    p.add_argument('--fps', type=int, default=6)
    args=p.parse_args()
    if not 1<=args.fps<=30:
        p.error('fps debe estar entre 1 y 30')
    cand=motion_energy(samples(args.candidate,args.fps))
    report={'candidate':summarize(cand,args.fps)}
    if args.reference:
        ref=motion_energy(samples(args.reference,args.fps))
        report['reference']=summarize(ref,args.fps)
        report['comparison']=compare_energy(ref,cand)
    report['limits']='Es un diagnóstico de cambio de píxeles; revisar la película visual y narrativamente.'
    print(json.dumps(report,indent=2,ensure_ascii=False))


if __name__=='__main__':
    main()

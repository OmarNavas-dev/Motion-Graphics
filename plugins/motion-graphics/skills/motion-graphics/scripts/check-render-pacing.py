#!/usr/bin/env python3
"""Conservative pixel diagnostics for an exported video; FFmpeg, no pip deps.

Not a perceptual quality certificate. Stationary explanatory holds are legal.
Use --loop only for intentionally seamless pieces.
"""
import argparse
import json
import statistics
import subprocess
from pathlib import Path


def probe(video):
    cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', video]
    return float(json.loads(subprocess.check_output(cmd))['format']['duration'])


def grayscale(video, fps=10, width=120, height=120):
    cmd = ['ffmpeg', '-v', 'error', '-i', video, '-vf',
           f'fps={fps},scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2',
           '-f', 'rawvideo', '-pix_fmt', 'gray', '-']
    data = subprocess.check_output(cmd)
    size = width * height
    return [data[i:i + size] for i in range(0, len(data) - size + 1, size)]


def difference(a, b):
    if len(a) != len(b):
        raise ValueError('Los fotogramas tienen tamaños distintos')
    return sum(abs(x - y) for x, y in zip(a, b)) / len(a)


def pacing(video, fps=10, max_gap=1.0, loop=False):
    duration = probe(video)
    frames = grayscale(video, fps)
    if len(frames) < 2:
        raise ValueError('Video demasiado corto o sin fotogramas decodificables')
    changes = [difference(frames[i - 1], frames[i]) for i in range(1, len(frames))]
    # A conservative absolute grayscale threshold, not a hard art rule.
    moving = [i / fps for i, x in enumerate(changes, 1) if x >= 1.0]
    points = [0.0] + moving + [duration]
    gaps = [[round(points[i], 2), round(points[i + 1], 2)]
            for i in range(len(points) - 1) if points[i + 1] - points[i] > max_gap]
    seam = difference(frames[-1], frames[0]) if loop else None
    typical = statistics.median(changes)
    return {'duration': round(duration, 3), 'sample_fps': fps,
            'long_still_intervals': gaps, 'max_frame_diff': round(max(changes), 4),
            'median_frame_diff': round(typical, 4),
            'loop_seam_diff': round(seam, 4) if seam is not None else None,
            'loop_seam_suspicious': bool(loop and seam > max(2.5 * typical, 0.6)),
            'note': 'Los holds largos pueden ser intencionales; revisar visualmente.'}


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--max-gap', type=float, default=1.0)
    ap.add_argument('--loop', action='store_true')
    ap.add_argument('--out')
    args = ap.parse_args()
    report = pacing(args.video, max_gap=args.max_gap, loop=args.loop)
    if args.out:
        Path(args.out).write_text(json.dumps(report, indent=2), encoding='utf8')
    print(json.dumps(report, ensure_ascii=False, indent=2))

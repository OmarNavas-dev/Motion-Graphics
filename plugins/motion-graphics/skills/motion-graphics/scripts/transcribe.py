"""Local word timestamps. No video rendering, upload or dependency installation."""
import argparse
import json
import pathlib
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio")
    parser.add_argument("output")
    parser.add_argument("--model", required=True, help="Path to an existing faster-whisper model")
    parser.add_argument("--language", default="es")
    args = parser.parse_args()
    if not pathlib.Path(args.audio).is_file():
        parser.error("Audio does not exist")
    if not pathlib.Path(args.model).is_dir():
        parser.error("Provide an existing local model directory; no automatic downloads")
    if pathlib.Path(args.output).exists():
        parser.error("Output already exists; choose a new working file")
    import numpy as np
    from faster_whisper import WhisperModel
    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", args.audio
    ]))
    duration = float(probe["format"]["duration"])
    decoded = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", args.audio, "-ac", "1", "-ar", "16000", "-f", "f32le", "pipe:1"
    ])
    model = WhisperModel(args.model, device="cpu", compute_type="int8", cpu_threads=4,
                         num_workers=1, local_files_only=True)
    segments, info = model.transcribe(np.frombuffer(decoded, dtype=np.float32).copy(),
        language=args.language, beam_size=5, word_timestamps=True, vad_filter=True,
        condition_on_previous_text=False)
    words = []
    for segment in segments:
        print(f"{segment.start:.2f}-{segment.end:.2f} {segment.text}", flush=True)
        words.extend({"text": w.word.strip(), "start": round(w.start, 3),
                      "end": round(w.end, 3)} for w in segment.words or [])
    if not words:
        raise RuntimeError("No words recognized; cannot synchronize captions")
    pathlib.Path(args.output).write_text(json.dumps({"duration": duration,
        "language": info.language, "words": words}, ensure_ascii=False, indent=2), encoding="utf8")


if __name__ == "__main__":
    main()


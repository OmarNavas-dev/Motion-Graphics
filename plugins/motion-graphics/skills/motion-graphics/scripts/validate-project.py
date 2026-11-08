"""Validate Motion Studio custom-scene projects with Python's standard library.

This checks structure and code restrictions, not JavaScript syntax or visual quality.
Use the companion Node validator for JavaScript parsing when Node is available.
"""
import argparse
import json
import re
import sys
from pathlib import Path


def validate(raw, duration=None):
    errors = []
    if not isinstance(raw, dict):
        return {"ok": False, "errors": ["El proyecto debe ser un objeto."]}
    p = raw.get("project", raw)
    if not isinstance(p, dict):
        return {"ok": False, "errors": ["project debe ser un objeto."]}
    scenes = p.get("scenes")
    if not isinstance(scenes, list) or not 1 <= len(scenes) <= 80:
        return {"ok": False, "errors": ["Debe haber entre 1 y 80 escenas."]}
    def require(ok, message):
        if not ok:
            errors.append(message)
    def num(v):
        return type(v) in (int, float) and 0 <= v < float("inf")
    require(p.get("format") in ("vertical", "horizontal"), "Formato invalido.")
    require(p.get("fps", 24) in (24, 30), "FPS invalidos.")
    for field, limit in (("name", 42), ("script", 45000), ("creativeBrief", 2000)):
        require(isinstance(p.get(field, ""), str) and len(p.get(field, "")) <= limit, f"{field} invalido o demasiado largo.")
    asset_re = r"user-assets/[0-9a-f-]{36}\.(mp3|wav|m4a)"
    for field in ("audioAsset", "musicAsset"):
        require(not p.get(field) or isinstance(p[field], str) and re.fullmatch(asset_re, p[field]), f"{field}: ruta invalida.")
    ids = set()
    total = 0
    frames = 0
    fps = 30 if p.get("fps") == 30 else 24
    blocked = r"\b(fetch|XMLHttpRequest|WebSocket|EventSource|importScripts|eval|localStorage|sessionStorage|indexedDB|requestAnimationFrame|setTimeout|setInterval|require|process|globalThis|postMessage|navigator|location)\b|\bnew\s+Function\b|\bimport\s*[(\s{*]|\bMath\.random\b|\bDate\.now\b|\bnew\s+Date\b|\bperformance\.now\b|document\.(cookie|write)|window\.(open|location|parent|top)"
    for i, s in enumerate(scenes, 1):
        if not isinstance(s, dict):
            errors.append(f"Escena {i}: objeto invalido.")
            continue
        sid = s.get("id", "")
        valid_id = isinstance(sid, str) and re.fullmatch(r"[A-Za-z0-9_-]{1,45}", sid)
        require(valid_id and sid not in ids, f"Escena {i}: id invalido o repetido.")
        if valid_id:
            ids.add(sid)
        d = s.get("duration")
        valid_d = num(d) and .5 <= d <= 60
        require(valid_d, f"Escena {i}: duracion fuera de .5-60 segundos.")
        if valid_d:
            require(abs(round(d, 3) - d) < .000001, f"Escena {i}: usar milésimas de segundo.")
            total += d
            frames += int(d * fps + .5)
        require(isinstance(s.get("scriptExcerpt", ""), str) and len(s.get("scriptExcerpt", "")) <= 800, f"Escena {i}: fragmento demasiado largo.")
        require(not s.get("captions"), f"Escena {i}: titulos duplicados fuera de customScene.")
        c = s.get("customScene")
        if not isinstance(c, dict) or not isinstance(c.get("html"), str) or not c["html"].strip():
            errors.append(f"Escena {i}: falta customScene.html completo.")
            continue
        for key, limit in (("html", 150000), ("css", 50000), ("script", 100000)):
            require(isinstance(c.get(key, ""), str) and len(c.get(key, "")) <= limit, f"Escena {i}: {key} excede limite o tiene tipo invalido.")
        html = c["html"]
        require(not re.search(r"clip-title|clip-key|spoken-caption", html), f"Escena {i}: titulos estaticos o generador anterior; usar add-captions.mjs.")
        if p.get("showText", True) and s.get("captionMode") != "none" and s.get("scriptExcerpt", "").strip():
            require("dvj-caption" in html and "dvj-word" in html, f"Escena {i}: falta subtitulado progresivo generado desde tiempos reales.")
        css = c.get("css", "") if isinstance(c.get("css", ""), str) else ""
        script = c.get("script", "") if isinstance(c.get("script", ""), str) else ""
        require(not re.search(r"<\s*(script|iframe|object|embed|link|meta|base|form)\b|\son[a-z]+\s*=|javascript:|data:text/html", html, re.I), f"Escena {i}: HTML no permitido.")
        remote = re.sub(r"https?://www\.w3\.org/[0-9A-Za-z/._-]*", "", html + css)
        require(not re.search(r"(?:src|href)\s*=\s*[\"']?\s*(?:https?:)?//|url\(\s*[\"']?\s*(?:https?:)?//|@import", remote, re.I), f"Escena {i}: recursos remotos.")
        require(not re.search(blocked, script), f"Escena {i}: script no determinista o API no permitida.")
    require(total <= 900, "El proyecto supera 15 minutos.")
    require(len(json.dumps(raw, ensure_ascii=False).encode("utf8")) <= 1048576 + len(scenes) * 98304, "Proyecto demasiado grande.")
    if duration is not None:
        require(num(duration) and duration > 0, "Duracion de audio invalida.")
        require(abs(total - duration) <= 1 / fps + .001, "Las escenas no suman la duracion del audio.")
        require(abs(frames / fps - duration) <= 1 / fps + .001, "La duracion cuantizada difiere del audio mas de un fotograma.")
    warnings = ["Este chequeo estructural no certifica el estilo ni los tiempos. Ejecutar tambien node scripts/validate-project.mjs proyecto.json --words palabras.json; compara HTML/CSS/animacion con el generador."]
    if not p.get("audioAsset"):
        warnings.append("Seleccionar el audio original en Motion Studio despues de importar el JSON.")
    return {"ok": not errors, "scenes": len(scenes), "duration": round(total, 3), "errors": errors, "warnings": warnings}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project")
    parser.add_argument("--duration", type=float)
    args = parser.parse_args()
    try:
        result = validate(json.loads(Path(args.project).read_text(encoding="utf-8-sig")), args.duration)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(0 if result["ok"] else 1)
    except (ValueError, OSError, TypeError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)


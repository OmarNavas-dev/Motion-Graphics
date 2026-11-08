#!/usr/bin/env python3
"""Revision visual sin Motion Studio: renderiza fotogramas de un proyecto.json.

Uso:
  python preview-frames.py proyecto.json --gsap RUTA/gsap.min.js --out carpeta_nueva
        [--scenes id1,id2] [--times 0.5,2,4]   (tiempos LOCALES de cada escena)
        [--per-scene 4] [--browser EJECUTABLE] [--width 360]

Que hace:
  * Monta cada customScene como lo hace Motion Studio (__SCENE__, S, T0, D, tl, gsap).
  * Captura PNG por escena y una hoja de contactos (sheet.png) por escena y global.
  * Informa errores de consola, selectores GSAP inexistentes y escenas cuya timeline
    natural dura mas que D (animaciones que el motor recortaria).
Limites: NO certifica calidad artistica, audio ni que Motion Studio lo muestre igual
(la exportacion HyperFrames es la referencia final). Requiere python3 + playwright
(o --browser con un Chrome/Edge/Chromium instalado). No descarga nada.
"""
import argparse, json, pathlib, sys

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('project'); ap.add_argument('--gsap', required=True)
    ap.add_argument('--out', required=True); ap.add_argument('--scenes')
    ap.add_argument('--times'); ap.add_argument('--per-scene', type=int, default=4)
    ap.add_argument('--browser'); ap.add_argument('--width', type=int, default=360,
                    help='ancho de cada miniatura en la hoja de contactos')
    a = ap.parse_args()
    out = pathlib.Path(a.out)
    if out.exists(): sys.exit('La carpeta de salida ya existe; elegir otra.')
    out.mkdir(parents=True)
    raw = json.loads(pathlib.Path(a.project).read_text(encoding='utf-8-sig'))
    p = raw.get('project', raw)
    W, H = (720, 1280) if p.get('format', 'vertical') == 'vertical' else (1280, 720)
    if p.get('resolution') == '1080p': pass  # el lienzo logico sigue siendo 720 x 1280
    gsap_js = pathlib.Path(a.gsap).read_text(encoding='utf-8')
    wanted = set(a.scenes.split(',')) if a.scenes else None
    times_arg = [float(x) for x in a.times.split(',')] if a.times else None
    from playwright.sync_api import sync_playwright
    report = {'scenes': [], 'errors': [], 'warnings': []}
    frames_by_scene = {}
    with sync_playwright() as pw:
        kw = {'executable_path': a.browser} if a.browser else {}
        browser = pw.chromium.launch(**kw)
        for sc in p['scenes']:
            if wanted and sc['id'] not in wanted: continue
            c = sc.get('customScene') or {}
            if not c.get('html'):
                report['warnings'].append(f"{sc['id']}: sin customScene, no se captura."); continue
            D = float(sc['duration'])
            sel = f'.scene[data-scene="{sc["id"]}"]'
            css = (c.get('css') or '').replace('__SCENE__', sel)
            page = browser.new_page(viewport={'width': W, 'height': H})
            msgs = []
            page.on('console', lambda m, msgs=msgs: msgs.append((m.type, m.text)) if m.type in ('warning', 'error') else None)
            page.on('pageerror', lambda e, msgs=msgs: msgs.append(('error', str(e))))
            html = ('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000}'
                    f'.scene{{position:relative;width:{W}px;height:{H}px;overflow:hidden}}{css}</style></head><body>'
                    f'<div class="scene" data-scene="{sc["id"]}">{c["html"]}</div></body></html>')
            page.set_content(html)
            page.add_script_tag(content=gsap_js)
            script = c.get('script') or ''
            page.evaluate("""([S,D,code])=>{const tl=gsap.timeline({paused:true});const T0=0;
              try{(new Function('tl','S','T0','D','gsap',code))(tl,S,T0,D,gsap);}catch(e){console.error('script: '+e.message);}
              window.__tl=tl;}""", [sel, D, script])
            nat = page.evaluate('window.__tl.duration()')
            if nat > D + 0.05:
                report['warnings'].append(f"{sc['id']}: la timeline natural dura {nat:.2f}s y la escena {D:.2f}s (el motor recortaria {nat-D:.2f}s).")
            ts = times_arg or [D * f for f in ([.12, .38, .64, .92] if a.per_scene == 4 else [(i + .5) / a.per_scene for i in range(a.per_scene)])]
            ts = [min(max(t, 0), D - 1/60) for t in ts]
            paths = []
            for t in ts:
                page.evaluate('t=>{window.__tl.time(t,false)}', t)
                page.wait_for_timeout(30)
                f = out / f"{sc['id']}_{t:05.2f}s.png"
                page.locator(sel).screenshot(path=str(f)); paths.append((t, f))
            frames_by_scene[sc['id']] = paths
            for kind, text in msgs:
                (report['errors'] if kind == 'error' or 'not found' in text.lower() else report['warnings']).append(f"{sc['id']}: {text}")
            report['scenes'].append({'id': sc['id'], 'duration': D, 'naturalTimeline': round(nat, 3), 'frames': [str(f.name) for _, f in paths]})
            page.close()
        browser.close()
    try:
        from PIL import Image, ImageDraw
        rows = []
        for sid, paths in frames_by_scene.items():
            ims = []
            for t, f in paths:
                im = Image.open(f).convert('RGB'); r = a.width / im.width
                im = im.resize((a.width, int(im.height * r)))
                ImageDraw.Draw(im).text((8, im.height - 16), f'{sid} {t:.2f}s', fill=(255, 255, 255))
                ims.append(im)
            sheet = Image.new('RGB', (a.width * len(ims), ims[0].height))
            for i, im in enumerate(ims): sheet.paste(im, (i * a.width, 0))
            sheet.save(out / f'sheet_{sid}.png'); rows.append(sheet)
        if rows:
            g = Image.new('RGB', (max(r.width for r in rows), sum(r.height for r in rows)))
            y = 0
            for r in rows: g.paste(r, (0, y)); y += r.height
            g.save(out / 'sheet.png')
    except ImportError:
        report['warnings'].append('Pillow no disponible: no se genero la hoja de contactos.')
    report['ok'] = not report['errors']
    (out / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
    print(json.dumps({'ok': report['ok'], 'errors': report['errors'], 'warnings': report['warnings'], 'out': str(out)}, indent=2, ensure_ascii=False))
    sys.exit(0 if report['ok'] else 1)

main()


#!/usr/bin/env python3
"""Build paired comparisons from explicit timestamps, never assign an art grade.
Manifest: {pairs:[{time,reference:'/absolute/ref.png',render:'/absolute/out.png'}]}
Usage: compare-frames.py pairs.json --out new-folder
"""
import argparse,json,pathlib,math
from PIL import Image,ImageDraw,ImageChops,ImageStat

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('manifest');ap.add_argument('--out',required=True);a=ap.parse_args()
    src=pathlib.Path(a.manifest).resolve();pairs=json.loads(src.read_text(encoding='utf-8'))['pairs'];out=pathlib.Path(a.out)
    if out.exists() or not pairs:raise ValueError('Se requieren pares y carpeta nueva')
    out.mkdir(parents=True);rows=[]
    for i,p in enumerate(pairs):
        if not math.isfinite(p['time']) or p['time']<0:raise ValueError('Tiempo inválido')
        paths=[pathlib.Path(p[k]) for k in ('reference','render')];paths=[p if p.is_absolute() else src.parent/p for p in paths]
        ref,render=[Image.open(p).convert('RGB') for p in paths]
        ratioDifference=abs(ref.width/ref.height-render.width/render.height)
        render=render.resize(ref.size);diff=ImageChops.difference(ref,render);mae=sum(ImageStat.Stat(diff).mean)/3/255
        sheet=Image.new('RGB',(ref.width*3,ref.height+40),'#172337');d=ImageDraw.Draw(sheet)
        for j,(im,label) in enumerate(zip((ref,render,diff),('Referencia','Resultado','Diferencia de píxeles'))):sheet.paste(im,(j*ref.width,40));d.text((j*ref.width+8,10),label,fill='white')
        name=f'{i:03d}.png';sheet.save(out/name)
        rows.append({'time':p['time'],'file':name,'normalizedPixelMAE':mae,'aspectRatioDifference':ratioDifference,'review':{'silhouette':'pending','material':'pending','composition':'pending','motion':'requires temporal samples','narration':'requires audio'}})
    (out/'comparison.json').write_text(json.dumps({'pairs':rows,'qualityApproved':False,'note':'Los píxeles no certifican estilo ni calidad. Comparar dibujos, trayectoria y ritmo; justificar diferencias intencionales.'},ensure_ascii=False,indent=2),encoding='utf-8');print(out/'comparison.json')

if __name__=='__main__':main()

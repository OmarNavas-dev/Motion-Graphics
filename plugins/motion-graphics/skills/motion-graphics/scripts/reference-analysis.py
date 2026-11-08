#!/usr/bin/env python3
"""Extract timestamped visual evidence. Does not infer original software/author.
Usage: reference-analysis.py video.mp4 --out new-folder [--interval 4]
       [--detail 10:13:4] (start:end:samples-per-second) [--max-frames 120]
"""
import argparse, hashlib, json, math, pathlib, subprocess

def sample_times(duration, interval, detail=None, limit=120):
    if not math.isfinite(duration) or duration <= 0 or not math.isfinite(interval) or interval <= 0 or limit < 1:
        raise ValueError('Duración, intervalo o límite inválidos')
    count=math.ceil(duration/interval)
    if count>limit: raise ValueError('Aumentar --interval o --max-frames')
    times={min(duration-.001, i*interval) for i in range(count)}
    if detail:
        a,b,fps=map(float,detail.split(':'))
        if not all(map(math.isfinite,(a,b,fps))) or a<0 or b<=a or b>duration or fps<=0:
            raise ValueError('Detalle fuera de duración o frecuencia inválida')
        n=math.ceil((b-a)*fps)
        if n>limit: raise ValueError('Detalle supera el límite de capturas')
        times.update(min(duration-.001,a+i/fps) for i in range(n))
    if len(times)>limit: raise ValueError('La unión de muestras supera --max-frames')
    return sorted(round(max(0,t),6) for t in times)

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('video');ap.add_argument('--out',required=True);ap.add_argument('--interval',type=float,default=4);ap.add_argument('--detail');ap.add_argument('--max-frames',type=int,default=120)
    a=ap.parse_args();p=pathlib.Path(a.video).resolve();out=pathlib.Path(a.out)
    if out.exists(): raise ValueError('Elegir carpeta de salida nueva')
    data=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_type,width,height,r_frame_rate','-of','json',str(p)]))
    duration=float(data['format']['duration']);times=sample_times(duration,a.interval,a.detail,a.max_frames);out.mkdir(parents=True)
    frames=[]
    for i,t in enumerate(times):
        name=f'{i:03d}-{t:.3f}s.png'
        subprocess.run(['ffmpeg','-loglevel','error','-ss',str(t),'-i',str(p),'-frames:v','1','-vf','scale=360:-2','-y',str(out/name)],check=True)
        frames.append({'time':t,'file':name})
    from PIL import Image,ImageDraw
    ims=[Image.open(out/f['file']).convert('RGB') for f in frames];w,h=ims[0].size
    sheet=Image.new('RGB',(w*4,(h+30)*math.ceil(len(ims)/4)),'#111827');draw=ImageDraw.Draw(sheet)
    for i,(im,f) in enumerate(zip(ims,frames)):
        x,y=(i%4)*w,(i//4)*(h+30);sheet.paste(im,(x,y));draw.text((x+8,y+h+7),f"{f['time']:.3f} s",fill='white')
    sheet.save(out/'contact-sheet.jpg')
    sha=hashlib.sha256()
    with p.open('rb') as fp:
        for block in iter(lambda:fp.read(1024*1024),b''):sha.update(block)
    report={'sourceName':p.name,'sourceHash':sha.hexdigest(),'metadata':data,'duration':duration,'frames':frames,'interpretation':{'observed':[],'inferred':[],'unknown':['software de autoría','capas originales','origen de recursos']},'shots':[],'note':'Completar interpretación tras abrir imágenes. Muestreo visual no equivale a reproducción continua ni escucha.'}
    (out/'reference.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(out/'reference.json')

if __name__=='__main__':main()

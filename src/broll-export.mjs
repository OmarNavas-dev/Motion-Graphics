import {spawn} from 'node:child_process';
import {stat, rename, rm} from 'node:fs/promises';

const run = async (program, args) => new Promise((resolve, reject) => {
  const child = spawn(program, args, {windowsHide:true});
  let stdout='', stderr='';
  child.stdout.on('data', chunk => {stdout=(stdout+chunk).slice(-16000);});
  child.stderr.on('data', chunk => {stderr=(stderr+chunk).slice(-16000);});
  child.on('error', reject);
  child.on('close', code => code === 0 ? resolve({stdout,stderr}) :
    reject(Error(`${program} (${code}): ${stderr.slice(-1400)}`)));
});

export async function inspectAlphaMov(file) {
  const {stdout} = await run('ffprobe', ['-v','error','-select_streams','v:0',
    '-show_entries','stream=codec_name,pix_fmt,width,height,nb_frames','-of','json',file]);
  const stream = JSON.parse(stdout).streams?.[0];
  if (!stream || stream.codec_name !== 'prores' || !/^yuva/.test(stream.pix_fmt || ''))
    throw Error('P2: MOV sin canal alfa ProRes 4444 verificable.');
  const size = await stat(file);
  if (!size.isFile() || size.size < 1000) throw Error('P2: MOV transparente vacío.');
  // The alphaextract filter fails if the video cannot actually be decoded with alpha.
  await run('ffmpeg',['-v','error','-i',file,'-frames:v','1','-vf','alphaextract',
    '-f','null','-']);
  return {codec:stream.codec_name,pixelFormat:stream.pix_fmt,width:stream.width,height:stream.height,
    frames:Number(stream.nb_frames)||null,bytes:size.size,alphaDecoded:true};
}

export async function compositeBrollAlpha(mp4,overlayMov) {
  const temp=mp4.replace(/\.mp4$/i,'.broll-temp.mp4');
  if(temp===mp4)throw Error('P2: la composición final necesita un MP4.');
  try {
    await inspectAlphaMov(overlayMov);
    await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',mp4,'-i',overlayMov,
      '-filter_complex','[0:v:0][1:v:0]overlay=x=0:y=0:format=auto:eof_action=pass:shortest=0[v]',
      '-map','[v]','-map','0:a?','-c:v','libx264','-crf','18','-preset','medium',
      '-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart','-shortest',temp]);
    if((await stat(temp)).size < 1000)throw Error('P2: composición final vacía.');
    await rename(temp,mp4);
  } finally {await rm(temp,{force:true}).catch(()=>{});}
}

import {inflateSync} from 'node:zlib';

// Browser screenshots can differ by one 8-bit channel value after compositor
// rasterization. Decode pixels rather than equating PNG byte hashes with state.
export function decodeScreenshotPNG(input){
 const b=Buffer.from(input);if(!b.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))throw Error('PNG invalido.');
 let width,height,channels,parts=[];
 for(let i=8;i+12<=b.length;){const n=b.readUInt32BE(i),type=b.toString('ascii',i+4,i+8);if(i+n+12>b.length)throw Error('PNG truncado.');const data=b.subarray(i+8,i+8+n);if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);channels=data[9]===2?3:data[9]===6?4:0;if(data[8]!==8||!channels||data[12]!==0||width<=0||height<=0||width*height>16000000)throw Error('Formato PNG de captura no compatible.');}if(type==='IDAT')parts.push(data);i+=n+12;if(type==='IEND')break;}
 if(!width||!parts.length)throw Error('PNG sin cabecera o pixeles.');
 const stride=width*channels,raw=inflateSync(Buffer.concat(parts),{maxOutputLength:(stride+1)*height});if(raw.length!==(stride+1)*height)throw Error('Datos PNG incompletos.');
 const pixels=Buffer.alloc(stride*height),paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];if(filter>4)throw Error('Filtro PNG invalido.');for(let x=0;x<stride;x++){const index=y*stride+x,a=x>=channels?pixels[index-channels]:0,up=y?pixels[index-stride]:0,corner=y&&x>=channels?pixels[index-stride-channels]:0;const predictor=filter===0?0:filter===1?a:filter===2?up:filter===3?Math.floor((a+up)/2):paeth(a,up,corner);pixels[index]=(raw[y*(stride+1)+1+x]+predictor)&255;}}
 return {width,height,channels,pixels};
}
export function compareScreenshotPixels(a,b,{channelTolerance=1}={}){
 if(!Number.isInteger(channelTolerance)||channelTolerance<0||channelTolerance>1)throw Error('La tolerancia admite solo 0 o 1 nivel de color.');
 const x=decodeScreenshotPNG(a),y=decodeScreenshotPNG(b);if(x.width!==y.width||x.height!==y.height||x.channels!==y.channels)return {passed:false,reason:'dimensions differ',channelTolerance};
 let maxChannelDifference=0,changedChannels=0;
 for(let i=0;i<x.pixels.length;i++){const d=Math.abs(x.pixels[i]-y.pixels[i]);if(d)changedChannels++;maxChannelDifference=Math.max(maxChannelDifference,d);}
 return {passed:maxChannelDifference<=channelTolerance,exactPixels:maxChannelDifference===0,maxChannelDifference,changedChannels,channelTolerance};
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import {compareScreenshotPixels,decodeScreenshotPNG} from '../scripts/compare-png.mjs';
function png(red){
 const chunk=(name,data)=>{const out=Buffer.alloc(12+data.length);out.writeUInt32BE(data.length);out.write(name,4);data.copy(out,8);return out;};
 const header=Buffer.alloc(13);header.writeUInt32BE(1);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([0,red,100,100,255]))),chunk('IEND',Buffer.alloc(0))]);
}
test('comparacion distingue redondeo de 1 nivel y un cambio real de color',()=>{
 assert.equal(compareScreenshotPixels(png(100),png(101)).passed,true);
 assert.equal(compareScreenshotPixels(png(100),png(102)).passed,false);
 assert.equal(compareScreenshotPixels(png(100),png(101),{channelTolerance:0}).passed,false);
 assert.throws(()=>compareScreenshotPixels(png(0),png(0),{channelTolerance:2}),/solo/);
 assert.throws(()=>decodeScreenshotPNG(Buffer.from('invalid')),/PNG/);
});

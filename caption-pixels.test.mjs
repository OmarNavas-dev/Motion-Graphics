import {test} from 'node:test';
import assert from 'node:assert/strict';
import {captionGlyphCoverage} from './scripts/caption-pixels.mjs';
const make=(ink,shift=0)=>{const b=Buffer.alloc(32*20,30);for(let y=4;y<16;y++)for(let x=5;x<8;x++)b[y*32+x+shift]=ink;return b;};
test('un glifo desplazado un píxel por rasterización conserva la evidencia',()=>assert.equal(captionGlyphCoverage(make(255),make(230,1),32,20).passed,true));
test('una palabra gris durante una transición sigue siendo comprobable',()=>assert.equal(captionGlyphCoverage(make(200),make(185),32,20).passed,true));
test('un fotograma sin la palabra no pasa, tampoco con texto de referencia atenuado',()=>{
 for(const ink of [255,200,100])assert.equal(captionGlyphCoverage(make(ink),Buffer.alloc(640,30),32,20).passed,false);
});
test('otra palabra más grande no pasa por cubrir los píxeles de la palabra esperada',()=>{
 const bigger=make(230);for(let y=4;y<16;y++)for(let x=18;x<21;x++)bigger[y*32+x]=230;
 assert.equal(captionGlyphCoverage(make(255),bigger,32,20).passed,false);
});

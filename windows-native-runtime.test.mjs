import {test} from 'node:test';
import assert from 'node:assert/strict';
import {truncatedCertificate,prepareWindowsNativeRuntime} from './scripts/windows-native-runtime.mjs';

test('detecta certificado PE truncado sin confundir un binario sin firma',()=>{
 const bytes=Buffer.alloc(512);bytes.write('MZ');bytes.writeUInt32LE(64,60);bytes.writeUInt16LE(0x20b,88);
 const entry=88+112+32;
 assert.equal(truncatedCertificate(bytes),false);
 bytes.writeUInt32LE(480,entry);bytes.writeUInt32LE(64,entry+4);
 assert.equal(truncatedCertificate(bytes),true);
 bytes.writeUInt32LE(32,entry+4);assert.equal(truncatedCertificate(bytes),false);
 assert.equal(truncatedCertificate(Buffer.alloc(10)),false);
});
test('no modifica la selección de binarios fuera de Windows',()=>{
 assert.equal(prepareWindowsNativeRuntime({platform:'linux'}),null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewTimes} from '../scripts/beat-contact-sheet.mjs';

test('captura entrada y momento asentado de cada beat, sin desbordar duración',()=>{
 const times=reviewTimes({duration:5,beats:[{at:0},{at:4.9}]});
 assert.deepEqual(times,[0,.3,4.9,4.999]);
});

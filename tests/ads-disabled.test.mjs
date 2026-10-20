import test from 'node:test';
import assert from 'node:assert/strict';
import {DisabledAdsPort} from '../src/ads-port.mjs';
test('06 ads: disabled provider cannot become enabled by assignment',()=>{const p=new DisabledAdsPort();assert.equal(p.enabled,false);assert.equal(p.isAvailable(),false);assert.throws(()=>p.enabled=true);});
test('06 ads: requests never start networking or grant rewards',async()=>{const p=new DisabledAdsPort();let called=0;const old=globalThis.fetch;globalThis.fetch=()=>{called++;throw Error('unexpected network');};try{for(let i=0;i<10;i++)assert.deepEqual(await p.request(),{status:'disabled',rewarded:false});assert.equal(called,0);}finally{globalThis.fetch=old;}});

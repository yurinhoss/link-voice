import {test} from 'node:test';import assert from 'node:assert/strict';import {requestMicrophone} from '../src/microphone.js';
test('missing microphone allows receive-only participation instead of failing join',async()=>{
 const result=await requestMicrophone({getUserMedia:async()=>{throw Object.assign(new Error('Requested device not found'),{name:'NotFoundError'});}});
 assert.equal(result.stream,null);assert.match(result.notice,/Nenhum microfone/);assert.match(result.notice,/ouvir e compartilhar/);assert.doesNotMatch(result.notice,/Requested/);
});
test('denied or busy microphone gives localized receive-only guidance',async()=>{
 for(const name of ['NotAllowedError','NotReadableError','DevicesNotFoundError','SecurityError']){const r=await requestMicrophone({getUserMedia:async()=>{throw Object.assign(new Error('native message'),{name});}});assert.equal(r.stream,null);assert.match(r.notice,/ouvir e compartilhar/);}
});
test('microphone can be acquired after initially being unavailable',async()=>{
 let connected=false;const stream={id:'test-stream'},devices={getUserMedia:async()=>{if(!connected)throw Object.assign(new Error(),{name:'NotFoundError'});return stream;}};
 assert.equal((await requestMicrophone(devices)).stream,null);connected=true;assert.equal((await requestMicrophone(devices)).stream,stream);
});
test('unknown device errors still fail explicitly',async()=>{await assert.rejects(()=>requestMicrophone({getUserMedia:async()=>{throw new Error('Unexpected failure');}}),/Unexpected failure/);});

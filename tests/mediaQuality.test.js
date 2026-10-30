import {test} from 'node:test';import assert from 'node:assert/strict';
import {tunePeer,shareQuality} from '../src/mediaQuality.js';
import {requestScreenShare} from '../src/screenShare.js';
import {requestMicrophone,microphoneOptions} from '../src/microphone.js';
test('HD modes constrain capture and sender without changing negotiated encoding identities',async()=>{
 for(const id of ['720p','1080p','1080p60']){
  let options;await requestScreenShare({getDisplayMedia:async o=>{options=o;}},id);const q=shareQuality(id);
  assert.equal(options.video.width.max,q.width);assert.equal(options.video.frameRate.max,q.fps);
  const saved={};const sender=name=>({getParameters:()=>({transactionId:name,encodings:[{rid:'original'}]}),setParameters:async p=>{saved[name]=p;}});
  await tunePeer({audio:sender('voice'),screenAudio:sender('sound'),video:sender('video'),camera:sender('camera')},id);
  assert.equal(saved.video.encodings[0].maxBitrate,q.bitrate);assert.equal(saved.video.encodings[0].maxFramerate,q.fps);assert.equal(saved.video.encodings[0].rid,'original');assert.equal(saved.video.transactionId,'video');
  assert.equal(saved.voice.encodings[0].maxBitrate,128000);assert.equal(saved.sound.encodings[0].maxBitrate,192000);
 }
 assert.equal(shareQuality('invalid').height,1080);
});
test('unsupported or not-yet-negotiated sender tuning does not interrupt calls',async()=>{
 assert.deepEqual(await tunePeer({audio:{getParameters:()=>({encodings:[]})},video:{getParameters:()=>{throw Error('not ready');},setParameters:async()=>{}}}),[false,false,false,false]);
});
test('microphone requests 48 kHz voice with echo and noise control as preferences',async()=>{
 let options;await requestMicrophone({getUserMedia:async o=>{options=o;return {};}});
 assert.equal(options.audio.sampleRate.ideal,48000);assert.equal(options.audio.echoCancellation,true);assert.equal(options.audio.noiseSuppression,true);assert.equal(options.audio.channelCount.ideal,1);
});

test('original audio disables browser voice processing and restores it in noise reduction mode',async()=>{
 const original=microphoneOptions('original'),clean=microphoneOptions('clean');
 for(const key of ['echoCancellation','noiseSuppression','autoGainControl']){assert.equal(original[key],false);assert.equal(clean[key],true);}
 assert.equal(original.channelCount.ideal,2);let options;await requestMicrophone({getUserMedia:async o=>{options=o;return {}; }},'original');assert.deepEqual(options.audio,original);
});

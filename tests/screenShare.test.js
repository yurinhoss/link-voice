import {test} from 'node:test';import assert from 'node:assert/strict';import {requestScreenShare,replaceScreenTracks,remoteAudioTracks} from '../src/screenShare.js';
const sender=()=>({track:undefined,async replaceTrack(track){this.track=track;}});
const peer=()=>({video:sender(),screenAudio:sender(),audio:sender()});
test('screen capture requests tab/system sound without forcing unsupported audio sources',async()=>{
 let options;const stream={};assert.equal(await requestScreenShare({getDisplayMedia:async o=>{options=o;return stream;}}),stream);assert.equal(options.audio,true);assert.equal(options.systemAudio,'include');assert.equal(options.selfBrowserSurface,'exclude');assert.equal(options.video.frameRate,15);
});
test('shared audio is sent independently of the microphone, including to newly joined peers',async()=>{
 const video={id:'display-video'},audio={id:'tab-audio'},mic={id:'microphone',enabled:false},stream={getVideoTracks:()=>[video],getAudioTracks:()=>[audio]};
 for(const p of [peer(),peer()]){p.audio.track=mic;await replaceScreenTracks(p,stream);assert.equal(p.video.track,video);assert.equal(p.screenAudio.track,audio);assert.equal(p.audio.track,mic);assert.equal(p.audio.track.enabled,false);await replaceScreenTracks(p,null);assert.equal(p.video.track,null);assert.equal(p.screenAudio.track,null);assert.equal(p.audio.track,mic);}
});
test('video-only capture clears old shared audio and remains usable',async()=>{const p=peer();p.screenAudio.track={id:'old'};const video={id:'screen'};await replaceScreenTracks(p,{getVideoTracks:()=>[video],getAudioTracks:()=>[]});assert.equal(p.video.track,video);assert.equal(p.screenAudio.track,null);});
test('playback includes both voice and shared audio as independent tracks',()=>{const voice={id:'voice',readyState:'live'},tab={id:'tab',readyState:'live'},ended={id:'ended',readyState:'ended'};assert.deepEqual(remoteAudioTracks({getAudioTracks:()=>[voice,tab,ended]}),[voice,tab]);});

import {test} from 'node:test';import assert from 'node:assert/strict';import {requestScreenShare,replaceScreenTracks,remoteAudioTracks,isScreenTrack,remoteTrackRole,senderRoles} from '../src/screenShare.js';
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

test('receiver separates shared sound and video from conversation audio',()=>{
 const microphone={},shared={};
 assert.equal(isScreenTrack({track:{kind:'audio'},transceiver:microphone},shared),false);
 assert.equal(isScreenTrack({track:{kind:'audio'},transceiver:shared},shared),true);
 assert.equal(isScreenTrack({track:{kind:'video'},transceiver:{}},shared),true);
});

test('remote MID mapping keeps screen sound out of voice after rollback or reordered transceivers',()=>{
 const roles={'7':'screen','2':'voice','9':'camera'};
 assert.equal(remoteTrackRole({track:{kind:'audio'},transceiver:{mid:'7'}},roles),'screen');
 assert.equal(remoteTrackRole({track:{kind:'audio'},transceiver:{mid:'2'}},roles),'voice');
 assert.equal(remoteTrackRole({track:{kind:'video'},transceiver:{mid:'9'}},roles),'camera');
 assert.equal(remoteTrackRole({track:{kind:'audio'},transceiver:{mid:'unknown'}},roles),'screen');
});
test('older clients use remote SDP order and unknown audio never plays as conversation',()=>{
 const sdp='v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=mid:0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=mid:1\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=mid:2\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=mid:3\r\n';
 for(const [mid,role] of [['0','voice'],['1','screen'],['2','camera'],['3','screen']])assert.equal(remoteTrackRole({transceiver:{mid}}, {},sdp),role);
});
test('sender publishes roles for actual negotiated MIDs rather than assumed index',()=>{
 const p={audio:{},camera:{},screenAudio:{}};
 const pc={getTransceivers:()=>[{mid:'8',sender:p.screenAudio},{mid:'4',sender:p.audio},{mid:'6',sender:p.camera}]};
 assert.deepEqual(senderRoles(pc,p),{'8':'screen','4':'voice','6':'camera'});
});

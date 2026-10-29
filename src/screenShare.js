export function requestScreenShare(mediaDevices) {
  if (!mediaDevices?.getDisplayMedia) throw new Error('Use Chrome ou Edge no computador para compartilhar a tela.');
  return mediaDevices.getDisplayMedia({
    video: {frameRate: 15},
    audio: true,
    systemAudio: 'include',
    selfBrowserSurface: 'exclude',
    surfaceSwitching: 'include',
  });
}

// Keep display sound on a separate sender, so muting the microphone never mutes the shared tab.
export async function replaceScreenTracks(peer, stream) {
  await Promise.all([
    peer.video.replaceTrack(stream?.getVideoTracks()[0] || null),
    peer.screenAudio.replaceTrack(stream?.getAudioTracks()[0] || null),
  ]);
}

export function remoteAudioTracks(stream) {
  return stream.getAudioTracks().filter(track => track.readyState !== 'ended');
}

export function isScreenTrack(event,screenAudioTransceiver) {
  return event.track.kind==='video'||event.transceiver===screenAudioTransceiver;
}

// MID belongs to the remote SDP; local transceiver object identity can change
// after simultaneous offers and rollback. Unidentified audio is never voice.
export function remoteTrackRole(event, roles, sdp='') {
  const mid=event.transceiver.mid;
  if(Object.hasOwn(roles,mid))return roles[mid];
  let audio=0,video=0;
  for(const section of sdp.split(/(?=^m=)/m)) {
    if(!section.startsWith('m='))continue;
    const kind=section.slice(2).split(' ')[0];
    const role=kind==='audio'?(audio++===0?'voice':'screen'):kind==='video'?(video++===0?'screen':'camera'):null;
    if(section.match(/^a=mid:(.+)$/m)?.[1]?.trim()===mid)return role;
  }
  return 'screen';
}
export function senderRoles(pc, peer) {
  return Object.fromEntries(pc.getTransceivers().filter(t=>t.mid!==null).map(t=>[
    t.mid,t.sender===peer.audio?'voice':t.sender===peer.camera?'camera':'screen'
  ]));
}

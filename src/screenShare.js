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

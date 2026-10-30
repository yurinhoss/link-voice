export const SHARE_QUALITIES={
 '720p':{label:'HD · 720p / 30 FPS',width:1280,height:720,fps:30,bitrate:4000000,hint:'detail'},
 '1080p':{label:'Full HD · 1080p / 30 FPS',width:1920,height:1080,fps:30,bitrate:8000000,hint:'detail'},
 '1080p60':{label:'Full HD fluido · 1080p / 60 FPS',width:1920,height:1080,fps:60,bitrate:12000000,hint:'motion'},
};
export const shareQuality=id=>SHARE_QUALITIES[id]||SHARE_QUALITIES['1080p'];
async function tune(sender,options){
 if(!sender?.getParameters||!sender?.setParameters)return false;
 try{const p=sender.getParameters();if(!p.encodings?.length)return false;for(const encoding of p.encodings)Object.assign(encoding,options);await sender.setParameters(p);return true;}catch{return false;}
}
export async function tunePeer(peer,quality='1080p'){
 const q=shareQuality(quality);
 return Promise.all([tune(peer.audio,{maxBitrate:128000}),tune(peer.screenAudio,{maxBitrate:192000}),tune(peer.video,{maxBitrate:q.bitrate,maxFramerate:q.fps,scaleResolutionDownBy:1}),tune(peer.camera,{maxBitrate:4000000,maxFramerate:30})]);
}

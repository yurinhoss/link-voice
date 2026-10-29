const APP_URL='https://link-voice-production.up.railway.app/';
function trustedApp(url){try{const parsed=new URL(url);return parsed.origin===new URL(APP_URL).origin&&parsed.protocol==='https:'&&!parsed.username&&!parsed.password;}catch{return false;}}
function externalUrl(url){try{const parsed=new URL(url);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password;}catch{return false;}}
function permitted(url,permission){return trustedApp(url)&&['media','display-capture','fullscreen','speaker-selection','clipboard-sanitized-write'].includes(permission);}
function captureSelection(sources,selection,audioRequested,platform=process.platform){if(!selection||typeof selection.id!=='string')return null;const source=sources.find(item=>item.id===selection.id);if(!source)return null;return {video:source,...(audioRequested&&selection.audio===true&&platform==='win32'?{audio:'loopback'}:{})};}
module.exports={APP_URL,trustedApp,externalUrl,permitted,captureSelection};

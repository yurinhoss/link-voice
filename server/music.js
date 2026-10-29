import {randomUUID} from 'node:crypto';
export function youtubeId(input){
 if(typeof input!=='string'||input.length>2048)return null;
 try{const u=new URL(input.trim());if(!['https:','http:'].includes(u.protocol))return null;const host=u.hostname.toLowerCase();let id;if(host==='youtu.be')id=u.pathname.slice(1).split('/')[0];else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','www.youtube-nocookie.com'].includes(host))id=u.pathname==='/watch'?u.searchParams.get('v'):['embed','shorts','live'].includes(u.pathname.split('/')[1])?u.pathname.split('/')[2]:null;return /^[A-Za-z0-9_-]{11}$/.test(id||'')?id:null;}catch{return null;}
}
export const musicPosition=(state,now=Date.now())=>Math.max(0,state.position+(state.playing?(now-state.updatedAt)/1000:0));
export function updateMusic(state,command,now=Date.now()){
 if(!command||typeof command!=='object')throw Error('Comando de música inválido.');
 const next={...state,queue:[...state.queue],position:musicPosition(state,now),updatedAt:now,revision:state.revision+1};
 switch(command.action){
 case 'add':{const videoId=youtubeId(command.url);if(!videoId)throw Error('Cole o link de um vídeo do YouTube.');if(next.queue.length>=50)throw Error('A fila comporta até 50 músicas.');next.queue.push({id:randomUUID(),videoId,title:typeof command.title==='string'?command.title.trim().slice(0,100):''});if(next.queue.length===1){next.position=0;next.playing=true;}break;}
 case 'play':if(next.queue.length)next.playing=true;break;
 case 'pause':next.playing=false;break;
 case 'ended':if(command.itemId!==next.queue[0]?.id)return state;
 // fall through
 case 'next':next.queue.shift();next.position=0;next.playing=!!next.queue.length&&state.playing;break;
 case 'remove':{const i=next.queue.findIndex(x=>x.id===command.itemId);if(i<0)return state;next.queue.splice(i,1);if(i===0)next.position=0;if(!next.queue.length)next.playing=false;break;}
 case 'seek':if(!Number.isFinite(command.position)||command.position<0||command.position>86400)throw Error('Posição inválida.');next.position=command.position;break;
 default:throw Error('Comando de música inválido.');
 }
 if(!next.queue.length){next.playing=false;next.position=0;}
 return next;
}
export function registerMusic({db,io,membership}){
 const cache=new Map();
 function read(roomId){if(cache.has(roomId))return cache.get(roomId);let saved;try{saved=JSON.parse(db.prepare('SELECT state FROM room_music WHERE room_id=?').get(roomId)?.state||'null');}catch{}const state=saved?{...saved,playing:false,updatedAt:Date.now()}:{queue:[],playing:false,position:0,updatedAt:Date.now(),revision:0};cache.set(roomId,state);return state;}
 function save(roomId,state){cache.set(roomId,state);db.prepare('INSERT INTO room_music(room_id,state) VALUES(?,?) ON CONFLICT(room_id) DO UPDATE SET state=excluded.state').run(roomId,JSON.stringify(state));}
 const snapshot=roomId=>({...read(roomId),serverTime:Date.now()});
 function pauseIfEmpty(key,roomId){if(!roomId||[...io.sockets.sockets.values()].some(s=>s.data.key===key))return;const state=read(roomId);if(state.playing)save(roomId,updateMusic(state,{action:'pause'}));}
 function attach(s,allowed){s.on('music-command',(command,reply)=>{const ack=typeof reply==='function'?reply:()=>{};if(!allowed()||!s.data.key||!membership(s.data.user.id,s.data.tenant))return ack({error:'Entre na sala para controlar a música.'});if(!db.prepare('SELECT id FROM rooms WHERE id=? AND tenant_id=?').get(s.data.room,s.data.tenant))return ack({error:'Esta sala não está disponível.'});const now=Date.now();if(now-(s.data.lastMusic||0)<200)return ack({error:'Aguarde um instante antes do próximo comando.'});s.data.lastMusic=now;try{const state=read(s.data.room);const next=updateMusic(state,command);if(next!==state){save(s.data.room,next);io.to(s.data.key).emit('music-state',snapshot(s.data.room));}ack({ok:true});}catch(e){ack({error:e.message});}});}
 return {snapshot,pauseIfEmpty,attach};
}

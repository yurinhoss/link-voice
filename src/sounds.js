export const SOUNDS=[{id:'cricket',emoji:'🦗',name:'Grilo'},{id:'applause',emoji:'👏',name:'Aplausos'},{id:'rimshot',emoji:'🥁',name:'Ba dum tss'},{id:'horn',emoji:'📣',name:'Buzina'},{id:'magic',emoji:'✨',name:'Magia'}];
export function createSoundboard(Context=globalThis.AudioContext||globalThis.webkitAudioContext,AudioElement=globalThis.Audio){
 let ctx,master,nodes=[],fileAudio=null,fileSource=null,fileTimer;
 const stop=()=>{clearTimeout(fileTimer);if(fileAudio){fileAudio.pause();fileAudio.removeAttribute('src');fileAudio.load();fileAudio=null;}fileSource?.disconnect();fileSource=null;for(const node of nodes){try{node.stop();}catch{}try{node.disconnect();}catch{}}nodes=[];};
 function unlock(){if(!Context)return;try{if(!ctx){ctx=new Context();master=ctx.createGain();master.connect(ctx.destination);}ctx.resume().catch(()=>{});}catch{}}
 function volume(value){if(master)master.gain.value=Math.max(0,Math.min(100,Number(value)||0))/100;}
 function play(id,level=60){if(!SOUNDS.some(s=>s.id===id))return;unlock();if(!ctx)return;stop();volume(level);const now=ctx.currentTime;
 function tone(freq,start,duration,gain=.15,type='sine',end=freq){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,now+start);o.frequency.exponentialRampToValueAtTime(end,now+start+duration);g.gain.setValueAtTime(0,now+start);g.gain.linearRampToValueAtTime(gain,now+start+.008);g.gain.exponentialRampToValueAtTime(.0001,now+start+duration);o.connect(g);g.connect(master);o.start(now+start);o.stop(now+start+duration+.01);nodes.push(o);o.onended=()=>{o.disconnect();g.disconnect();};}
 function noise(start,duration,gain=.15){const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,1.5);const source=ctx.createBufferSource(),g=ctx.createGain();source.buffer=b;g.gain.value=gain;source.connect(g);g.connect(master);source.start(now+start);nodes.push(source);source.onended=()=>{source.disconnect();g.disconnect();};}
 if(id==='cricket')for(let group=0;group<4;group++)for(let chirp=0;chirp<3;chirp++)tone(4300,group*.42+chirp*.065,.045,.12,'sine',4700);
 if(id==='applause')for(let i=0;i<30;i++)noise(i*.055,.12,.12);
 if(id==='rimshot'){tone(150,0,.14,.45,'sine',55);noise(.18,.1,.35);tone(180,.18,.1,.15);noise(.4,.65,.22);}
 if(id==='horn'){tone(240,0,.8,.16,'sawtooth');tone(305,0,.8,.12,'sawtooth');}
 if(id==='magic')[523,659,784,1047,1319].forEach((f,i)=>tone(f,i*.09,.45,.17,'sine'));
 }
 function playFile(url,level=60,onError=()=>{}){unlock();if(!ctx)return;stop();volume(level);const audio=new AudioElement();fileAudio=audio;fileSource=ctx.createMediaElementSource(audio);fileSource.connect(master);audio.src=url;audio.ontimeupdate=()=>{if(fileAudio===audio&&audio.currentTime>=30)stop();};audio.onended=()=>{if(fileAudio===audio)stop();};audio.onerror=()=>{if(fileAudio===audio){stop();onError();}};audio.play().catch(()=>{if(fileAudio===audio){stop();onError();}});fileTimer=setTimeout(()=>{if(fileAudio===audio)stop();},30000);}
 return {unlock,play,playFile,volume,stop,close(){stop();ctx?.close().catch(()=>{});ctx=null;}};
}

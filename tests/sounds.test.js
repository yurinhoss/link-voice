import {test} from 'node:test';import assert from 'node:assert/strict';import {SOUNDS,createSoundboard} from '../src/sounds.js';
test('all sound effects schedule finite audio; local volume, stop and teardown control playback',()=>{
 let ctx;const parameter=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 class Context{constructor(){ctx=this;this.currentTime=0;this.sampleRate=8000;this.destination={};this.sources=[];this.gains=[];}resume(){return Promise.resolve();}close(){this.closed=true;return Promise.resolve();}createGain(){const g={gain:parameter(),connect(){},disconnect(){}};this.gains.push(g);return g;}createOscillator(){const n={frequency:parameter(),connect(){},disconnect(){},start(){},stop(){this.stopped=true;}};this.sources.push(n);return n;}createBuffer(c,n){return {getChannelData:()=>new Float32Array(n)};}createBufferSource(){const n={connect(){},disconnect(){},start(){},stop(){this.stopped=true;}};this.sources.push(n);return n;}}
 const board=createSoundboard(Context);board.play('invalid');assert.equal(ctx,undefined);
 for(const sound of SOUNDS){board.play(sound.id,35);assert.equal(ctx.gains[0].gain.value,.35);assert.ok(ctx.sources.length);}
 board.volume(0);assert.equal(ctx.gains[0].gain.value,0);board.volume(500);assert.equal(ctx.gains[0].gain.value,1);board.stop();assert.ok(ctx.sources.every(n=>n.stopped));board.close();assert.equal(ctx.closed,true);
});
test('video file playback uses audio only, shares the effects volume, stops on leave and caps at 30 seconds',async()=>{
 let audio,ctx;class AudioElement{constructor(){audio=this;}play(){this.played=true;return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){this.src='';}load(){}}
 class Context{constructor(){ctx=this;this.destination={};}resume(){return Promise.resolve();}close(){return Promise.resolve();}createGain(){this.master={gain:{value:1},connect(){}};return this.master;}createMediaElementSource(element){assert.equal(element,audio);return {connect:node=>assert.equal(node,this.master),disconnect(){}};}}
 const board=createSoundboard(Context,AudioElement);board.playFile('/api/tenants/one/assets/two',45);assert.equal(audio.src,'/api/tenants/one/assets/two');assert.equal(audio.played,true);assert.equal(ctx.master.gain.value,.45);board.volume(0);assert.equal(ctx.master.gain.value,0);audio.currentTime=30;audio.ontimeupdate();assert.equal(audio.paused,true);assert.equal(audio.src,'');board.playFile('/another',80);board.stop();assert.equal(audio.paused,true);board.close();
});

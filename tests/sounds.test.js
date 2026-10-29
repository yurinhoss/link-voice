import {test} from 'node:test';import assert from 'node:assert/strict';import {SOUNDS,createSoundboard} from '../src/sounds.js';
test('all sound effects schedule finite audio; local volume, stop and teardown control playback',()=>{
 let ctx;const parameter=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 class Context{constructor(){ctx=this;this.currentTime=0;this.sampleRate=8000;this.destination={};this.sources=[];this.gains=[];}resume(){return Promise.resolve();}close(){this.closed=true;return Promise.resolve();}createGain(){const g={gain:parameter(),connect(){},disconnect(){}};this.gains.push(g);return g;}createOscillator(){const n={frequency:parameter(),connect(){},disconnect(){},start(){},stop(){this.stopped=true;}};this.sources.push(n);return n;}createBuffer(c,n){return {getChannelData:()=>new Float32Array(n)};}createBufferSource(){const n={connect(){},disconnect(){},start(){},stop(){this.stopped=true;}};this.sources.push(n);return n;}}
 const board=createSoundboard(Context);board.play('invalid');assert.equal(ctx,undefined);
 for(const sound of SOUNDS){board.play(sound.id,35);assert.equal(ctx.gains[0].gain.value,.35);assert.ok(ctx.sources.length);}
 board.volume(0);assert.equal(ctx.gains[0].gain.value,0);board.volume(500);assert.equal(ctx.gains[0].gain.value,1);board.stop();assert.ok(ctx.sources.every(n=>n.stopped));board.close();assert.equal(ctx.closed,true);
});

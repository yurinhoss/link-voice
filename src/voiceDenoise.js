import {RnnoiseWorkletNode,loadRnnoise} from '@sapphi-red/web-noise-suppressor';
import workletUrl from '@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url';
import wasmUrl from '@sapphi-red/web-noise-suppressor/rnnoise.wasm?url';
import simdUrl from '@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url';
let binary;
export async function denoiseVoice(raw){
 const ctx=new AudioContext({sampleRate:48000});let source,node;
 try{if(!ctx.audioWorklet)throw Error('AudioWorklet indisponível');await ctx.resume();binary??=loadRnnoise({url:wasmUrl,simdUrl}).catch(e=>{binary=null;throw e;});const [wasm]=await Promise.all([binary,ctx.audioWorklet.addModule(workletUrl)]);source=ctx.createMediaStreamSource(raw);node=new RnnoiseWorkletNode(ctx,{wasmBinary:wasm,maxChannels:1});const destination=ctx.createMediaStreamDestination();source.connect(node);node.connect(destination);let released=false;destination.stream.release=()=>{if(released)return;released=true;source.disconnect();node.disconnect();node.destroy();raw.getTracks().forEach(t=>t.stop());ctx.close().catch(()=>{});};return destination.stream;
 }catch{source?.disconnect();node?.destroy();raw.getTracks().forEach(t=>t.stop());ctx.close().catch(()=>{});throw Error('Não foi possível ativar a supressão de ruído. Use Chrome/Edge atualizado ou escolha Áudio original.');}
}

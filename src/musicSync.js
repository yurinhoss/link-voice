export function playbackPosition(state,now=Date.now()){
 if(!state)return 0;
 const serverNow=(state.serverTime??state.updatedAt)+(now-(state.receivedAt??now));
 return Math.max(0,state.position+(state.playing?(serverNow-state.updatedAt)/1000:0));
}
let loading;
export function loadYouTube(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{loading=null;reject(new Error('O YouTube não respondeu. Verifique a conexão ou tente novamente.'));},20000);const previous=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);previous?.();resolve(window.YT);};let script=document.querySelector('script[data-link-youtube]');if(!script){script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.dataset.linkYoutube='true';document.head.appendChild(script);}script.onerror=()=>{clearTimeout(timeout);script.remove();loading=null;reject(new Error('Não foi possível carregar o YouTube.'));};});
 return loading;
}

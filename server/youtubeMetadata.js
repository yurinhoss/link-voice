const cache=new Map();
export function youtubeMetadata(videoId){
 if(!/^[A-Za-z0-9_-]{11}$/.test(videoId))return Promise.resolve(null);
 if(cache.has(videoId))return cache.get(videoId);
 const task=(async()=>{try{const url=new URL('https://www.youtube.com/oembed');url.searchParams.set('url','https://www.youtube.com/watch?v='+videoId);url.searchParams.set('format','json');const res=await fetch(url,{signal:AbortSignal.timeout(5000),redirect:'error'});if(!res.ok)return null;const data=await res.json();return typeof data.title==='string'?data.title.trim().slice(0,200):null;}catch{return null;}})();
 cache.set(videoId,task);if(cache.size>500)cache.delete(cache.keys().next().value);return task;
}

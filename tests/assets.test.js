import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {io} from 'socket.io-client';import {createApp} from '../server/index.js';

test('saved video sounds and image reactions persist, support ranges and stay inside their space',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'link-assets-'));let svc;const sockets=[];
 async function start(){svc=await createApp({dataDir:dir,origin:'http://localhost',production:false});await new Promise(r=>svc.http.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+svc.http.address().port;}
 let base=await start();
 async function req(p,{body,cookie,method=body?'POST':'GET',raw=false,headers={}}={}){return fetch(base+'/api'+p,{method,headers:{origin:'http://localhost',...(cookie?{cookie}:{}),...(body?{'Content-Type':raw?'application/octet-stream':'application/json'}:{}),...headers},body:body?(raw?body:JSON.stringify(body)):undefined});}
 async function user(name){const res=await req('/auth/register',{body:{name,email:name+'@test.local',password:'12345'}});return {cookie:res.headers.get('set-cookie').split(';')[0],...(await res.json()).user};}
 async function socket(cookie,tid,room){const s=io(base,{transports:['websocket'],extraHeaders:{origin:'http://localhost',cookie},reconnection:false});sockets.push(s);await new Promise((resolve,reject)=>{s.once('connect',resolve);s.once('connect_error',reject);});await new Promise((resolve,reject)=>s.timeout(2000).emit('join',{tenantId:tid,roomId:room},(e,d)=>e||d.error?reject(e||new Error(d.error)):resolve()));return s;}
 const event=(s,type)=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error(type+' timed out')),2000);s.once(type,e=>{clearTimeout(timeout);resolve(e);});});
 try{
 const alice=await user('Alice'),bob=await user('Bob'),eve=await user('Eve');const tid=(await (await req('/tenants',{cookie:alice.cookie,body:{name:'Media space'}})).json()).id;const route='/tenants/'+tid+'/assets';
 const invite=await (await req('/tenants/'+tid+'/invites',{cookie:alice.cookie,body:{}})).json();await req('/invites/accept',{cookie:bob.cookie,body:{token:invite.token}});
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jw1sAAAAASUVORK5CYII=','base64');
 const mp4=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom000000000000000000000000')]);
 assert.equal((await req(route+'?kind=image',{cookie:alice.cookie,body:Buffer.from('<svg>not an image</svg>'),raw:true})).status,400);
 assert.equal((await req(route+'?kind=image',{cookie:alice.cookie,body:mp4,raw:true})).status,400);
 assert.equal((await req(route+'?kind=image',{cookie:eve.cookie,body:png,raw:true})).status,403);
 const large=await req(route+'?kind=image&name=Large',{cookie:alice.cookie,body:Buffer.concat([png,Buffer.alloc(3*1024*1024)]),raw:true});assert.equal(large.status,201);const largeAsset=(await large.json()).asset;assert.equal((await req(route+'/'+largeAsset.id,{cookie:alice.cookie,method:'DELETE'})).status,200);
 assert.equal((await req(route+'?kind=sound',{cookie:alice.cookie,body:Buffer.concat([mp4,Buffer.alloc(16*1024*1024)]),raw:true})).status,413);
 const image=await (await req(route+'?kind=image&name=Sticker',{cookie:alice.cookie,body:png,raw:true})).json();assert.ok(image.asset.id);
 const sound=await (await req(route+'?kind=sound&name=Video',{cookie:alice.cookie,body:mp4,raw:true})).json();assert.ok(sound.asset.id);
 assert.equal((await req(route+'/'+sound.asset.id)).status,401);assert.equal((await req(route+'/'+sound.asset.id,{cookie:eve.cookie})).status,403);
 const range=await req(route+'/'+sound.asset.id,{cookie:bob.cookie,headers:{range:'bytes=4-11'}});assert.equal(range.status,206);assert.equal(await range.text(),'ftypisom');assert.equal((await req(route+'/'+sound.asset.id,{cookie:alice.cookie,headers:{range:'bytes=999-'}})).status,416);
 assert.equal((await req(route+'/'+image.asset.id,{cookie:bob.cookie,method:'DELETE'})).status,403);
 const detail=await (await req('/tenants/'+tid,{cookie:alice.cookie})).json();const a=await socket(alice.cookie,tid,detail.rooms[0].id),b=await socket(bob.cookie,tid,detail.rooms[0].id);
 const heard=event(b,'sound');a.emit('sound',sound.asset.id);assert.equal((await heard).url,sound.asset.url);
 const seen=event(b,'reaction');a.emit('reaction',image.asset.id);const reaction=await seen;assert.equal(reaction.image,image.asset.url);assert.equal(reaction.emoji,null);
 sockets.forEach(s=>s.disconnect());await svc.close();base=await start();
 const saved=await (await req(route,{cookie:alice.cookie})).json();assert.equal(saved.assets.length,2);assert.deepEqual(Buffer.from(await (await req(route+'/'+image.asset.id,{cookie:bob.cookie})).arrayBuffer()),png);
 assert.equal((await req(route+'/'+image.asset.id,{cookie:alice.cookie,method:'DELETE'})).status,200);assert.equal((await req(route+'/'+image.asset.id,{cookie:alice.cookie})).status,404);
 }finally{sockets.forEach(s=>s.disconnect());await svc?.close();await rm(dir,{recursive:true,force:true});}
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {io} from 'socket.io-client';
import {createApp} from '../server/index.js';

test('room management, persistent text channels, message pagination and tenant permissions',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'link-channels-'));
  let svc=await createApp({dataDir:dir,origin:'http://localhost',production:false});
  await new Promise(r=>svc.http.listen(0,'127.0.0.1',r));
  let base='http://127.0.0.1:'+svc.http.address().port;
  let socket;
  async function req(path,body,cookie,method=body?'POST':'GET'){
    const response=await fetch(base+'/api'+path,{method,headers:{origin:'http://localhost',...(cookie?{cookie}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  try {
    const owner=await req('/auth/register',{name:'Owner',email:'owner@example.test',password:'12345'});
    const member=await req('/auth/register',{name:'Member',email:'member@example.test',password:'12345'});
    const outsider=await req('/auth/register',{name:'Outsider',email:'outsider@example.test',password:'12345'});
    const space=await req('/tenants',{name:'Workspace'},owner.cookie),other=await req('/tenants',{name:'Other'},outsider.cookie);
    const root='/tenants/'+space.data.id,otherRoot='/tenants/'+other.data.id;
    const invite=await req(root+'/invites',{},owner.cookie);
    await req('/invites/accept',{token:invite.data.token},member.cookie);
    const detail=await req(root,null,owner.cookie),rid=detail.data.rooms[0].id;
    assert.deepEqual(detail.data.channels,[]);
    assert.equal((await req(root+'/rooms/'+rid,{name:'Changed'},member.cookie,'PATCH')).status,403);
    assert.equal((await req(root+'/rooms/'+rid,{name:'Changed'},outsider.cookie,'PATCH')).status,403);
    assert.equal((await req(otherRoot+'/rooms/'+rid,{name:'Changed'},outsider.cookie,'PATCH')).status,404);
    assert.equal((await req(root+'/rooms/'+rid,{name:' '},owner.cookie,'PATCH')).status,400);
    assert.equal((await req(root+'/rooms/'+rid,{name:'Reuniões'},owner.cookie,'PATCH')).status,200);
    assert.equal((await req(root,null,member.cookie)).data.rooms.find(r=>r.id===rid).name,'Reuniões');
    socket=io(base,{transports:['websocket'],extraHeaders:{origin:'http://localhost',cookie:owner.cookie},reconnection:false});
    await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);});
    const joined=await new Promise((resolve,reject)=>socket.timeout(2000).emit('join',{tenantId:space.data.id,roomId:rid},(err,d)=>err?reject(err):resolve(d)));
    assert.equal(joined.ok,true);
    assert.equal((await req(root+'/rooms/'+rid,null,owner.cookie,'DELETE')).status,409);
    socket.disconnect();socket=null;
    await new Promise(r=>setTimeout(r,50));
    assert.equal((await req(root+'/rooms/'+rid,null,owner.cookie,'DELETE')).status,200);
    assert.equal((await req(root,null,owner.cookie)).data.rooms.some(r=>r.id===rid),false);
    assert.equal((await req(root+'/channels',{name:'geral'},member.cookie)).status,403);
    assert.equal((await req(root+'/channels',{name:'geral'})).status,401);
    const channel=await req(root+'/channels',{name:'geral'},owner.cookie);assert.equal(channel.status,201);
    const cid=channel.data.id,path=root+'/channels/'+cid;
    assert.equal((await req(root+'/channels',{name:'GERAL'},owner.cookie)).status,409);
    assert.equal((await req(path+'/messages',null,outsider.cookie)).status,403);
    assert.equal((await req(otherRoot+'/channels/'+cid+'/messages',null,outsider.cookie)).status,404);
    assert.equal((await req(path+'/messages',{body:'hack'},outsider.cookie)).status,403);
    assert.equal((await req(path+'/messages',{body:' '},member.cookie)).status,400);
    assert.equal((await req(path+'/messages',{body:'x'.repeat(2001)},member.cookie)).status,400);
    const sent=await req(path+'/messages',{body:'Olá equipe <script>alert(1)</script>'},member.cookie);
    assert.equal(sent.status,201);assert.equal(sent.data.message.userId,member.data.user.id);
    assert.equal((await req(path+'/messages',null,owner.cookie)).data.messages[0].body,'Olá equipe <script>alert(1)</script>');
    assert.equal((await req(path+'/messages?after='+sent.data.message.id,null,owner.cookie)).data.messages.length,0);
    assert.equal((await req(path+'/messages?before=invalid',null,owner.cookie)).status,400);
    assert.equal((await req(path,{name:'equipe'},member.cookie,'PATCH')).status,403);
    assert.equal((await req(path,null,member.cookie,'DELETE')).status,403);
    assert.equal((await req(path,{name:'equipe'},owner.cookie,'PATCH')).status,200);
    // Seed an older backlog directly so pagination is tested independently of send rate limits.
    const insert=svc.db.prepare('INSERT INTO messages(channel_id,user_id,body,created) VALUES(?,?,?,?)');
    for(let i=0;i<55;i++)insert.run(cid,owner.data.user.id,'Histórico '+i,Date.now());
    const page=await req(path+'/messages',null,owner.cookie);assert.equal(page.data.messages.length,50);assert.equal(page.data.hasMore,true);
    const older=await req(path+'/messages?before='+page.data.messages[0].id,null,member.cookie);assert.equal(older.data.messages.length,6);assert.equal(older.data.hasMore,false);
    assert.ok(older.data.messages.at(-1).id<page.data.messages[0].id);
    await svc.close();svc=await createApp({dataDir:dir,origin:'http://localhost',production:false});await new Promise(r=>svc.http.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+svc.http.address().port;
    assert.equal((await req(root,null,owner.cookie)).data.channels[0].name,'equipe');
    assert.equal((await req(path+'/messages',null,member.cookie)).data.messages.length,50);
    await req(root+'/members/'+member.data.user.id,null,owner.cookie,'DELETE');
    assert.equal((await req(path+'/messages',null,member.cookie)).status,403);
    assert.equal((await req(path+'/messages',{body:'removed'},member.cookie)).status,403);
    assert.equal((await req(path,null,owner.cookie,'DELETE')).status,200);
    assert.equal((await req(path+'/messages',null,owner.cookie)).status,404);
    assert.equal(svc.db.prepare('SELECT count(*) AS n FROM messages WHERE channel_id=?').get(cid).n,0);
  } finally {socket?.disconnect();await svc.close();await rm(dir,{recursive:true,force:true});}
});

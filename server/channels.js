import {messageFiles} from './chatFiles.js';
import {randomUUID} from 'node:crypto';
import {rateLimit} from 'express-rate-limit';

export function registerChannels({app,db,auth,tenantAuth,owner,io,validText,fail}) {
  const root='/api/tenants/:tid';
  const room=req=>db.prepare('SELECT id,name FROM rooms WHERE id=? AND tenant_id=?').get(req.params.rid,req.params.tid);
  const channel=req=>db.prepare('SELECT id,name,kind FROM text_channels WHERE id=? AND tenant_id=?').get(req.params.cid,req.params.tid);
  const messageRow=id=>db.prepare('SELECT m.id,m.user_id AS userId,u.name,p.avatar,m.body,m.created FROM messages m JOIN users u ON u.id=m.user_id LEFT JOIN user_profiles p ON p.user_id=u.id WHERE m.id=?').get(id);
  const decorate=(m,tid,cid)=>({...m,attachments:messageFiles(db,tid,cid,m.id)});
  const key=(tid,cid)=>'text:'+tid+':'+cid;
  function broadcast(tid,cid,event,data){const room=key(tid,cid);for(const id of io.sockets.adapter.rooms.get(room)||[]){const s=io.sockets.sockets.get(id);if(!s)continue;if(db.prepare('SELECT 1 FROM members WHERE tenant_id=? AND user_id=?').get(tid,s.data.user.id))s.emit(event,data);else{s.leave(room);s.emit('text-removed');}}}
  io.on('connection',s=>{s.on('text-subscribe',(data,reply)=>{const ack=typeof reply==='function'?reply:()=>{};if(!data||typeof data.tenantId!=='string'||typeof data.channelId!=='string')return ack({error:'Canal inválido.'});if(!db.prepare('SELECT 1 FROM members m JOIN text_channels c ON c.tenant_id=m.tenant_id WHERE m.user_id=? AND m.tenant_id=? AND c.id=?').get(s.data.user.id,data.tenantId,data.channelId))return ack({error:'Você não tem acesso a este canal.'});if(s.data.textKey)s.leave(s.data.textKey);s.data.textKey=key(data.tenantId,data.channelId);s.join(s.data.textKey);ack({ok:true});});});
  const messageLimit=rateLimit({windowMs:15000,limit:12,keyGenerator:req=>req.user.id,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Muitas mensagens. Aguarde alguns segundos.'}});

  app.patch(root+'/rooms/:rid',auth,tenantAuth,owner,(req,res)=>{
    if(!room(req))return fail(res,404,'Sala não encontrada.');
    if(!validText(req.body?.name,2,40))return fail(res,400,'Use um nome de 2 a 40 caracteres.');
    const name=req.body.name.trim();
    db.prepare('UPDATE rooms SET name=? WHERE id=? AND tenant_id=?').run(name,req.params.rid,req.params.tid);
    res.json({id:req.params.rid,name});
  });
  app.delete(root+'/rooms/:rid',auth,tenantAuth,owner,(req,res)=>{
    if(!room(req))return fail(res,404,'Sala não encontrada.');
    if([...io.sockets.sockets.values()].some(s=>s.data.tenant===req.params.tid&&s.data.room===req.params.rid))return fail(res,409,'A sala está em uso. Todos precisam sair da chamada antes de excluí-la.');
    db.prepare('DELETE FROM rooms WHERE id=? AND tenant_id=?').run(req.params.rid,req.params.tid);
    res.json({ok:true});
  });
  app.post(root+'/channels',auth,tenantAuth,owner,(req,res)=>{
    if(!validText(req.body?.name,2,40))return fail(res,400,'Use um nome de 2 a 40 caracteres.');
    const name=req.body.name.trim();
    if(db.prepare('SELECT count(*) AS n FROM text_channels WHERE tenant_id=? AND kind=\'text\'').get(req.params.tid).n>=20)return fail(res,400,'Limite de 20 canais de texto por espaço.');
    if(db.prepare('SELECT id FROM text_channels WHERE tenant_id=? AND name=? COLLATE NOCASE').get(req.params.tid,name))return fail(res,409,'Já existe um canal com esse nome.');
    const id=randomUUID();
    db.prepare('INSERT INTO text_channels(id,tenant_id,name,created) VALUES(?,?,?,?)').run(id,req.params.tid,name,Date.now());
    res.status(201).json({id,name});
  });
  app.patch(root+'/channels/:cid',auth,tenantAuth,owner,(req,res)=>{
    if(!channel(req))return fail(res,404,'Canal não encontrado.');
    if(channel(req).kind==='frequent')return fail(res,400,'Esta aba é fixa no espaço.');
    if(!validText(req.body?.name,2,40))return fail(res,400,'Use um nome de 2 a 40 caracteres.');
    const name=req.body.name.trim();
    if(db.prepare('SELECT id FROM text_channels WHERE tenant_id=? AND name=? COLLATE NOCASE AND id<>?').get(req.params.tid,name,req.params.cid))return fail(res,409,'Já existe um canal com esse nome.');
    db.prepare('UPDATE text_channels SET name=? WHERE id=? AND tenant_id=?').run(name,req.params.cid,req.params.tid);
    res.json({id:req.params.cid,name});
  });
  app.delete(root+'/channels/:cid',auth,tenantAuth,owner,(req,res)=>{
    if(!channel(req))return fail(res,404,'Canal não encontrado.');
    if(channel(req).kind==='frequent')return fail(res,400,'Esta aba é fixa no espaço.');
    db.prepare('DELETE FROM text_channels WHERE id=? AND tenant_id=?').run(req.params.cid,req.params.tid);
    res.json({ok:true});
  });
  app.get(root+'/channels/:cid/messages',auth,tenantAuth,(req,res)=>{
    if(!channel(req))return fail(res,404,'Canal não encontrado.');
    const {before,after}=req.query;
    const validCursor=x=>typeof x==='string'&&/^\d+$/.test(x)&&Number.isSafeInteger(Number(x))&&Number(x)>=0;
    if((before!==undefined&&!validCursor(before))||(after!==undefined&&!validCursor(after))||(before!==undefined&&after!==undefined))return fail(res,400,'Página de mensagens inválida.');
    const select='SELECT m.id,m.user_id AS userId,u.name,p.avatar,m.body,m.created FROM messages m JOIN users u ON u.id=m.user_id LEFT JOIN user_profiles p ON p.user_id=u.id WHERE m.channel_id=?';
    if(after!==undefined){
      const rows=db.prepare(select+' AND m.id>? ORDER BY m.id ASC LIMIT 101').all(req.params.cid,Number(after));
      return res.json({messages:rows.slice(0,100).map(m=>decorate(m,req.params.tid,req.params.cid)),hasMore:rows.length>100});
    }
    const rows=before!==undefined?db.prepare(select+' AND m.id<? ORDER BY m.id DESC LIMIT 51').all(req.params.cid,Number(before)):db.prepare(select+' ORDER BY m.id DESC LIMIT 51').all(req.params.cid);
    res.json({messages:rows.slice(0,50).reverse().map(m=>decorate(m,req.params.tid,req.params.cid)),hasMore:rows.length>50});
  });
  app.post(root+'/channels/:cid/messages',auth,tenantAuth,messageLimit,(req,res)=>{
    if(!channel(req))return fail(res,404,'Canal não encontrado.');
    const body=req.body?.body??'',ids=req.body?.attachments??[];
    if(typeof body!=='string'||body.trim().length>2000||!Array.isArray(ids)||ids.length>5||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length||(!body.trim()&&!ids.length))return fail(res,400,'Envie uma mensagem de até 2.000 caracteres e até 5 arquivos.');
    db.exec('BEGIN');let message;
    try{for(const id of ids)if(!db.prepare('SELECT id FROM chat_files WHERE id=? AND channel_id=? AND user_id=? AND message_id IS NULL').get(id,req.params.cid,req.user.id))throw Error('attachment');
      const result=db.prepare('INSERT INTO messages(channel_id,user_id,body,created) VALUES(?,?,?,?)').run(req.params.cid,req.user.id,body.trim(),Date.now());const id=Number(result.lastInsertRowid);for(const fid of ids)db.prepare('UPDATE chat_files SET message_id=? WHERE id=?').run(id,fid);message=decorate(messageRow(id),req.params.tid,req.params.cid);db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');if(e.message==='attachment')return fail(res,400,'Um dos anexos não está disponível neste canal. Envie-o novamente.');throw e;}
    broadcast(req.params.tid,req.params.cid,'text-message',message);res.status(201).json({message});
  });
  app.delete(root+'/channels/:cid/messages/:mid',auth,tenantAuth,(req,res)=>{if(!channel(req))return fail(res,404,'Canal não encontrado.');const message=db.prepare('SELECT id,user_id FROM messages WHERE id=? AND channel_id=?').get(req.params.mid,req.params.cid);if(!message)return fail(res,404,'Mensagem não encontrada.');if(message.user_id!==req.user.id&&req.role!=='owner')return fail(res,403,'Você só pode excluir suas próprias mensagens.');db.prepare('DELETE FROM messages WHERE id=?').run(message.id);broadcast(req.params.tid,req.params.cid,'text-deleted',{id:message.id});res.json({ok:true});});

}

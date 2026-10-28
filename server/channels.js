import {randomUUID} from 'node:crypto';
import {rateLimit} from 'express-rate-limit';

export function registerChannels({app,db,auth,tenantAuth,owner,io,validText,fail}) {
  const root='/api/tenants/:tid';
  const room=req=>db.prepare('SELECT id,name FROM rooms WHERE id=? AND tenant_id=?').get(req.params.rid,req.params.tid);
  const channel=req=>db.prepare('SELECT id,name FROM text_channels WHERE id=? AND tenant_id=?').get(req.params.cid,req.params.tid);
  const messageRow=id=>db.prepare('SELECT m.id,m.user_id AS userId,u.name,p.avatar,m.body,m.created FROM messages m JOIN users u ON u.id=m.user_id LEFT JOIN user_profiles p ON p.user_id=u.id WHERE m.id=?').get(id);
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
    if(db.prepare('SELECT count(*) AS n FROM text_channels WHERE tenant_id=?').get(req.params.tid).n>=20)return fail(res,400,'Limite de 20 canais de texto por espaço.');
    if(db.prepare('SELECT id FROM text_channels WHERE tenant_id=? AND name=? COLLATE NOCASE').get(req.params.tid,name))return fail(res,409,'Já existe um canal com esse nome.');
    const id=randomUUID();
    db.prepare('INSERT INTO text_channels(id,tenant_id,name,created) VALUES(?,?,?,?)').run(id,req.params.tid,name,Date.now());
    res.status(201).json({id,name});
  });
  app.patch(root+'/channels/:cid',auth,tenantAuth,owner,(req,res)=>{
    if(!channel(req))return fail(res,404,'Canal não encontrado.');
    if(!validText(req.body?.name,2,40))return fail(res,400,'Use um nome de 2 a 40 caracteres.');
    const name=req.body.name.trim();
    if(db.prepare('SELECT id FROM text_channels WHERE tenant_id=? AND name=? COLLATE NOCASE AND id<>?').get(req.params.tid,name,req.params.cid))return fail(res,409,'Já existe um canal com esse nome.');
    db.prepare('UPDATE text_channels SET name=? WHERE id=? AND tenant_id=?').run(name,req.params.cid,req.params.tid);
    res.json({id:req.params.cid,name});
  });
  app.delete(root+'/channels/:cid',auth,tenantAuth,owner,(req,res)=>{
    if(!channel(req))return fail(res,404,'Canal não encontrado.');
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
      return res.json({messages:rows.slice(0,100),hasMore:rows.length>100});
    }
    const rows=before!==undefined?db.prepare(select+' AND m.id<? ORDER BY m.id DESC LIMIT 51').all(req.params.cid,Number(before)):db.prepare(select+' ORDER BY m.id DESC LIMIT 51').all(req.params.cid);
    res.json({messages:rows.slice(0,50).reverse(),hasMore:rows.length>50});
  });
  app.post(root+'/channels/:cid/messages',auth,tenantAuth,messageLimit,(req,res)=>{
    if(!channel(req))return fail(res,404,'Canal não encontrado.');
    if(!validText(req.body?.body,1,2000))return fail(res,400,'Escreva uma mensagem de até 2.000 caracteres.');
    const result=db.prepare('INSERT INTO messages(channel_id,user_id,body,created) VALUES(?,?,?,?)').run(req.params.cid,req.user.id,req.body.body.trim(),Date.now());
    res.status(201).json({message:messageRow(Number(result.lastInsertRowid))});
  });
}

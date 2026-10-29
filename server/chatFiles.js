import express from 'express';import {randomUUID} from 'node:crypto';
export const chatFileUrl=(tid,cid,id)=>`/api/tenants/${tid}/channels/${cid}/files/${id}`;
export function chatMime(data,name){
 if(data.length>=8&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(data[0]===255&&data[1]===216&&data[2]===255)return 'image/jpeg';
 if(['GIF87a','GIF89a'].includes(data.toString('ascii',0,6)))return 'image/gif';
 if(data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP')return 'image/webp';
 if(data.toString('ascii',4,8)==='ftyp')return /\.(m4a|m4b)$/i.test(name)?'audio/mp4':'video/mp4';
 if(data.subarray(0,4).equals(Buffer.from([26,69,223,163])))return /\.(weba|opus)$/i.test(name)?'audio/webm':'video/webm';
 if(data.toString('ascii',0,3)==='ID3'||(data[0]===255&&(data[1]&224)===224))return 'audio/mpeg';
 if(data.toString('ascii',0,4)==='OggS')return 'audio/ogg';
 if(data.toString('ascii',0,4)==='fLaC')return 'audio/flac';
 if(data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WAVE')return 'audio/wav';
 return 'application/octet-stream';
}
export function messageFiles(db,tid,cid,messageId){return db.prepare('SELECT id,name,mime,size FROM chat_files WHERE message_id=? ORDER BY created,id').all(messageId).map(f=>({...f,url:chatFileUrl(tid,cid,f.id)}));}
export function registerChatFiles({app,db,auth,tenantAuth,fail}){
 const base='/api/tenants/:tid/channels/:cid/files';const exists=req=>db.prepare('SELECT id FROM text_channels WHERE id=? AND tenant_id=?').get(req.params.cid,req.params.tid);
 app.post(base,auth,tenantAuth,(req,res,next)=>exists(req)?next():fail(res,404,'Canal não encontrado.'),express.raw({type:()=>true,limit:'50mb'}),(req,res)=>{
  if(!Buffer.isBuffer(req.body)||!req.body.length)return fail(res,400,'Escolha um arquivo para enviar.');
  const name=typeof req.query.name==='string'?Array.from(req.query.name.replace(/[\x00-\x1f\x7f/\\]/g,'_').trim()).slice(0,180).join(''):'';if(!name)return fail(res,400,'O arquivo precisa ter um nome.');
  db.prepare('DELETE FROM chat_files WHERE message_id IS NULL AND created<?').run(Date.now()-86400000);
  if(db.prepare('SELECT count(*) AS n FROM chat_files WHERE channel_id=? AND user_id=? AND message_id IS NULL').get(req.params.cid,req.user.id).n>=10)return fail(res,400,'Há muitos arquivos pendentes. Remova anexos não enviados e tente novamente.');
  const used=db.prepare('SELECT coalesce(sum(f.size),0) AS n FROM chat_files f JOIN text_channels c ON c.id=f.channel_id WHERE c.tenant_id=?').get(req.params.tid).n;
  if(used+req.body.length>1024*1024*1024)return fail(res,400,'Este espaço atingiu o limite de 1 GB de anexos.');
  const id=randomUUID(),mime=chatMime(req.body,name);db.prepare('INSERT INTO chat_files(id,channel_id,user_id,message_id,name,mime,size,data,created) VALUES(?,?,?,NULL,?,?,?,?,?)').run(id,req.params.cid,req.user.id,name,mime,req.body.length,req.body,Date.now());
  res.status(201).json({file:{id,name,mime,size:req.body.length,url:chatFileUrl(req.params.tid,req.params.cid,id)}});
 });
 app.get(base+'/:fid',auth,tenantAuth,(req,res)=>{
  if(!exists(req))return fail(res,404,'Canal não encontrado.');const row=db.prepare('SELECT * FROM chat_files WHERE id=? AND channel_id=?').get(req.params.fid,req.params.cid);
  if(!row||(row.message_id===null&&row.user_id!==req.user.id))return fail(res,404,'Arquivo não encontrado.');
  const inline=/^(image|video|audio)\//.test(row.mime)&&req.query.download!=='1';const filename=encodeURIComponent(row.name).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16));
  res.set({'Content-Type':row.mime,'Content-Disposition':`${inline?'inline':'attachment'}; filename="arquivo"; filename*=UTF-8''${filename}`,'Accept-Ranges':'bytes','Cache-Control':'private, no-store'});
  const data=Buffer.from(row.data);if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);let start=m&&m[1]?Number(m[1]):0,end=m&&m[2]?Number(m[2]):row.size-1;if(m&&!m[1]&&m[2]){start=Math.max(0,row.size-Number(m[2]));end=row.size-1;}end=Math.min(end,row.size-1);if(!m||(!m[1]&&!m[2])||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=row.size||end<start)return res.status(416).set('Content-Range','bytes */'+row.size).end();return res.status(206).set('Content-Range',`bytes ${start}-${end}/${row.size}`).send(data.subarray(start,end+1));}res.send(data);
 });
 app.delete(base+'/:fid',auth,tenantAuth,(req,res)=>{if(!exists(req))return fail(res,404,'Canal não encontrado.');const row=db.prepare('SELECT user_id,message_id FROM chat_files WHERE id=? AND channel_id=?').get(req.params.fid,req.params.cid);if(!row||row.user_id!==req.user.id)return fail(res,404,'Arquivo não encontrado.');if(row.message_id!==null)return fail(res,409,'O arquivo já faz parte de uma mensagem. Exclua a mensagem para removê-lo.');db.prepare('DELETE FROM chat_files WHERE id=?').run(req.params.fid);res.json({ok:true});});
}

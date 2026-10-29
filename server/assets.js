import express from 'express';
import {randomUUID} from 'node:crypto';
export const assetUrl=(tid,id)=>'/api/tenants/'+tid+'/assets/'+id;
export function detectAsset(data){
 if(!Buffer.isBuffer(data)||data.length<12)return null;
 if(data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {kind:'image',mime:'image/png'};
 if(data[0]===255&&data[1]===216&&data[2]===255)return {kind:'image',mime:'image/jpeg'};
 if(['GIF87a','GIF89a'].includes(data.toString('ascii',0,6)))return {kind:'image',mime:'image/gif'};
 if(data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP')return {kind:'image',mime:'image/webp'};
 if(data.toString('ascii',4,8)==='ftyp')return {kind:'sound',mime:'video/mp4'};
 if(data.subarray(0,4).equals(Buffer.from([26,69,223,163])))return {kind:'sound',mime:'video/webm'};
 return null;
}
export function registerAssets({app,db,auth,tenantAuth,fail}){
 const base='/api/tenants/:tid/assets';
 const metadata=row=>({...row,url:assetUrl(row.tenant_id,row.id)});
 app.get(base,auth,tenantAuth,(req,res)=>res.json({assets:db.prepare('SELECT id,tenant_id,user_id,kind,name,mime,created FROM media_assets WHERE tenant_id=? ORDER BY created DESC').all(req.params.tid).map(metadata)}));
 app.post(base,auth,tenantAuth,express.raw({type:()=>true,limit:'20mb'}),(req,res)=>{
  const detected=detectAsset(req.body),kind=req.query.kind;
  if(!detected||detected.kind!==kind)return fail(res,400,'Envie um vídeo MP4/WebM ou uma imagem PNG, JPG, WebP ou GIF válida.');
  if(req.body.length>(kind==='image'?20:15)*1024*1024)return fail(res,413,kind==='image'?'A imagem deve ter até 20 MB.':'O vídeo deve ter até 15 MB.');
  if(db.prepare('SELECT count(*) AS n FROM media_assets WHERE tenant_id=? AND user_id=?').get(req.params.tid,req.user.id).n>=40)return fail(res,400,'Limite de 40 arquivos por pessoa neste espaço. Exclua um arquivo para enviar outro.');
  if(db.prepare('SELECT coalesce(sum(length(data)),0) AS n FROM media_assets WHERE tenant_id=?').get(req.params.tid).n+req.body.length>150*1024*1024)return fail(res,400,'O espaço atingiu o limite de 150 MB de arquivos.');
  const id=randomUUID(),name=typeof req.query.name==='string'?req.query.name.trim().slice(0,50):'';
  db.prepare('INSERT INTO media_assets VALUES(?,?,?,?,?,?,?,?,?)').run(id,req.params.tid,req.user.id,kind,name||'Sem nome',detected.mime,req.body,req.body.length,Date.now());
  res.status(201).json({asset:metadata(db.prepare('SELECT id,tenant_id,user_id,kind,name,mime,created FROM media_assets WHERE id=?').get(id))});
 });
 app.get(base+'/:aid',auth,tenantAuth,(req,res)=>{
  const row=db.prepare('SELECT mime,data,size FROM media_assets WHERE id=? AND tenant_id=?').get(req.params.aid,req.params.tid);if(!row)return fail(res,404,'Arquivo não encontrado.');
  const data=Buffer.from(row.data);res.set({'Content-Type':row.mime,'Accept-Ranges':'bytes','Cache-Control':'private, no-store'});
  if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);let start=m&&m[1]?Number(m[1]):0,end=m&&m[2]?Number(m[2]):row.size-1;if(m&&!m[1]&&m[2]){start=Math.max(0,row.size-Number(m[2]));end=row.size-1;}end=Math.min(end,row.size-1);if(!m||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=row.size||end<start)return res.status(416).set('Content-Range','bytes */'+row.size).end();return res.status(206).set('Content-Range',`bytes ${start}-${end}/${row.size}`).send(data.subarray(start,end+1));}
  res.send(data);
 });
 app.delete(base+'/:aid',auth,tenantAuth,(req,res)=>{const row=db.prepare('SELECT user_id FROM media_assets WHERE id=? AND tenant_id=?').get(req.params.aid,req.params.tid);if(!row)return fail(res,404,'Arquivo não encontrado.');if(row.user_id!==req.user.id&&req.role!=='owner')return fail(res,403,'Você só pode excluir seus próprios arquivos.');db.prepare('DELETE FROM media_assets WHERE id=?').run(req.params.aid);res.json({ok:true});});
}

const icons=['🧑‍🚀','🦊','👾','🐼','🤖','🪐','😎','🧙'];
export function validAvatar(value){
 if(icons.includes(value))return true;
 if(typeof value!=='string'||value.length>49000)return false;
 const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
 if(!match)return false;
 const data=Buffer.from(match[2],'base64');
 if(data.length<12||data.toString('base64')!==match[2])return false;
 if(match[1]==='jpeg')return data[0]===255&&data[1]===216&&data[2]===255;
 if(match[1]==='png')return data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 return data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP';
}

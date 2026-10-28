import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Hash,Send,LoaderCircle} from 'lucide-react';
import {api} from './api';

export default function TextChannel({tenantId,channel,user}) {
  const [messages,setMessages]=useState([]),[text,setText]=useState(''),[loading,setLoading]=useState(true),[sending,setSending]=useState(false),[olderBusy,setOlderBusy]=useState(false),[hasOlder,setHasOlder]=useState(false),[error,setError]=useState('');
  const box=useRef(null),lastId=useRef(0),nearBottom=useRef(true),restore=useRef(null),firstLoad=useRef(true);
  const path='/tenants/'+tenantId+'/channels/'+channel.id+'/messages';
  function merge(items){lastId.current=Math.max(lastId.current,...items.map(m=>m.id));setMessages(old=>[...new Map([...old,...items].map(m=>[m.id,m])).values()].sort((a,b)=>a.id-b.id));}
  useEffect(()=>{
    let cancelled=false,pending=false;
    async function read(){if(pending)return;pending=true;try{const initial=firstLoad.current;const d=await api(path+(initial?'':'?after='+lastId.current));if(cancelled)return;merge(d.messages);if(initial){setHasOlder(d.hasMore);firstLoad.current=false;}setError('');}catch(e){if(!cancelled)setError(e.message);}finally{pending=false;if(!cancelled)setLoading(false);}}
    read();const timer=setInterval(()=>{if(!document.hidden)read();},3000);
    const visible=()=>{if(!document.hidden)read();};document.addEventListener('visibilitychange',visible);
    return()=>{cancelled=true;clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[path]);
  useLayoutEffect(()=>{const el=box.current;if(!el)return;if(restore.current){el.scrollTop=restore.current.top+el.scrollHeight-restore.current.height;restore.current=null;}else if(nearBottom.current){el.scrollTop=el.scrollHeight;}},[messages]);
  async function loadOlder(){if(!messages.length)return;setOlderBusy(true);try{const d=await api(path+'?before='+messages[0].id);restore.current={top:box.current.scrollTop,height:box.current.scrollHeight};merge(d.messages);setHasOlder(d.hasMore);setError('');}catch(e){setError(e.message);}finally{setOlderBusy(false);}}
  async function send(e){e.preventDefault();const body=text.trim();if(!body||sending)return;setSending(true);try{const d=await api(path,{body});nearBottom.current=true;merge([d.message]);setText('');setError('');}catch(e){setError(e.message);}finally{setSending(false);}}
  return <section className="text-channel" aria-label={'Canal de texto '+channel.name}>
    <div className="chat-history" ref={box} role="log" aria-label="Mensagens" aria-live="polite" aria-relevant="additions" onScroll={()=>{const e=box.current;nearBottom.current=e.scrollHeight-e.scrollTop-e.clientHeight<80;}}>
      {hasOlder&&<button className="load-older" disabled={olderBusy} onClick={loadOlder}>{olderBusy?'Carregando…':'Carregar mensagens anteriores'}</button>}
      {loading&&<div className="chat-placeholder"><LoaderCircle size={22}/><p>Carregando mensagens…</p></div>}
      {!loading&&!messages.length&&<div className="chat-placeholder"><Hash size={32}/><h2>{channel.name}</h2><p>Comece a conversa.</p></div>}
      {messages.map(m=><article className="chat-message" key={m.id}>
        <div className="chat-avatar">{(m.userId===user.id?user.avatar:m.avatar)?.startsWith('data:image/')?<img src={m.userId===user.id?user.avatar:m.avatar} alt=""/>:<span>{(m.userId===user.id?user.avatar:m.avatar)||m.name[0].toUpperCase()}</span>}</div>
        <div className="chat-message-body"><div className="chat-message-meta"><strong>{m.name}</strong><time dateTime={new Date(m.created).toISOString()} title={new Date(m.created).toLocaleString('pt-BR')}>{new Date(m.created).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time></div><p>{m.body}</p></div>
      </article>)}
    </div>
    {error&&<div className="chat-error" role="alert">{error}</div>}
    <form className="chat-compose" onSubmit={send}><input aria-label="Mensagem" placeholder={'Conversar em #'+channel.name} value={text} onChange={e=>setText(e.target.value)} maxLength={2000} autoComplete="off"/><button type="submit" aria-label="Enviar mensagem" title="Enviar mensagem" disabled={!text.trim()||sending}>{sending?<LoaderCircle size={19}/>:<Send size={19}/>}</button></form>
  </section>;
}

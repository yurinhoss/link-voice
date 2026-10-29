import React,{useRef,useState,useEffect,Children} from 'react';
import {participantLayout} from './participantLayout';
export default function ParticipantLayout({gallery,children}){
 const ref=useRef(null),[size,setSize]=useState({width:640,height:360}),count=Children.count(children);
 useEffect(()=>{const node=ref.current;if(!node)return;const update=()=>{const r=node.getBoundingClientRect();setSize(old=>Math.abs(old.width-r.width)<1&&Math.abs(old.height-r.height)<1?old:{width:r.width,height:r.height});};update();const observer=new ResizeObserver(update);observer.observe(node);return()=>observer.disconnect();},[gallery]);
 const layout=participantLayout(size.width,size.height,count,gallery);
 return <div ref={ref} className={'meeting-participants '+(gallery?'gallery':'strip')}><div className="participant-grid" style={{'--tile-width':layout.tileWidth+'px','--tile-height':layout.tileHeight+'px'}}>{children}</div></div>;
}

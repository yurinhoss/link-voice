import React,{useState,useEffect,useRef} from 'react';import {createPortal} from 'react-dom';
export default function CallFooter({children}){
 const [host,setHost]=useState(null),ref=useRef(null);
 useEffect(()=>{const node=ref.current;if(!node)return;const measure=()=>document.documentElement.style.setProperty('--call-footer-height',Math.ceil(node.getBoundingClientRect().height)+'px');measure();const observer=new ResizeObserver(measure);observer.observe(node);return()=>observer.disconnect();},[host]);
 useEffect(()=>{const update=()=>{const native=document.fullscreenElement;setHost(native?.classList.contains('screen-stream')?native:document.querySelector('.screen-stream.expanded'));};update();document.addEventListener('fullscreenchange',update);window.addEventListener('link-expanded-change',update);return()=>{document.removeEventListener('fullscreenchange',update);window.removeEventListener('link-expanded-change',update);};},[]);
 const footer=<footer ref={ref} className={'call-footer'+(host?' fullscreen-call-footer':'')}>{children}</footer>;
 return host?createPortal(footer,host):footer;
}

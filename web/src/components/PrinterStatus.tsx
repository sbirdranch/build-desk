'use client';
import {useEffect,useState} from 'react';
import {Printer} from 'lucide-react';
import type {PrinterView} from '@/core/types';
const stateNames:Record<string,string>={RUNNING:'Printing',PAUSE:'Paused',FINISH:'Finished',IDLE:'Idle',FAILED:'Failed',PREPARE:'Preparing',SLICING:'Slicing'};
const remaining=(minutes:number)=>minutes>=60?`${Math.floor(minutes/60)}h ${Math.round(minutes%60)}m`:`${Math.round(minutes)}m`;
export default function PrinterStatus({buildId,initial,mobile,recordedAt}:{buildId:string;initial:PrinterView;mobile:boolean;recordedAt:string}) {
 const [device,setDevice]=useState(initial);
 useEffect(()=>{setDevice(initial)},[buildId,initial]);
 useEffect(()=>{
  if(mobile)return;let stopped=false;const controller=new AbortController();
  async function refresh(){if(document.hidden)return;try {
   const response=await fetch('/api/builds/'+encodeURIComponent(buildId)+'/printer',{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error();const data:PrinterView=await response.json();if(!stopped)setDevice(data);
  }catch{if(!stopped)setDevice(old=>({...old,status:old.lastSeen?'stale':'offline',label:'Printer status unavailable'}));}}
  refresh();const timer=setInterval(refresh,10000);document.addEventListener('visibilitychange',refresh);
  return()=>{stopped=true;clearInterval(timer);controller.abort();document.removeEventListener('visibilitychange',refresh)};
 },[buildId,mobile]);
 if(mobile)return <footer className="printer-bar"><Printer size={18}/><span>Recorded information only · {new Date(recordedAt).toLocaleString()}</span></footer>;
 const live=device.status==='live',state=device.state?(stateNames[device.state]||device.state):'';
 return <footer className={'printer-bar printer-status '+device.status} aria-label="Printer device status">
  <div className="printer-summary"><Printer size={18}/><strong>{device.name}</strong>
   <span className="printer-signal">{live?'● Connected':device.label}</span>
   {state&&<strong>{live?state:'Last reported: '+state}</strong>}
   {device.progress!==undefined&&<span>{device.progress}%</span>}
   {device.remainingMinutes!==undefined&&<span>~{remaining(device.remainingMinutes)} remaining</span>}
   {device.layer!==undefined&&device.totalLayers!==undefined&&<span>Layer {device.layer} / {device.totalLayers}</span>}
   <span className="printer-observed muted">{device.lastSeen?'Observed '+new Date(device.lastSeen).toLocaleTimeString():'Read-only status'}</span>
  </div>
  {device.job&&<div className="printer-job" title={device.job}>Device job: {device.job}<span className="muted"> · Accepted parts remain under your control</span></div>}
 </footer>;
}

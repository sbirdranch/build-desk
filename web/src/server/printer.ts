import {readFile} from 'node:fs/promises';
import path from 'node:path';
import type {BuildConfig,PrinterView} from '../core/types';
import {root} from './registry';

export function recordedPrinter(name:string,data:Record<string,unknown>,now=Date.now()):PrinterView {
 const lastSeen=typeof data.lastSeen==='string'&&Number.isFinite(Date.parse(data.lastSeen))?data.lastSeen:undefined;
 const age=lastSeen?now-Date.parse(lastSeen):Infinity;
 const status=data.connection==='connected'&&age>=0&&age<30000?'live':lastSeen?'stale':data.connection==='offline'?'offline':'connecting';
 const finite=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:undefined;
 const state=typeof data.state==='string'?data.state.slice(0,50):undefined;
 const job=typeof data.job==='string'?data.job.slice(0,250):undefined;
 return {name,status,label:status==='live'?'Printer connected':status==='stale'?'Last reported · connection stale':status==='offline'?'Printer disconnected':'Connecting to printer',lastSeen,state,job,
  progress:finite(data.progress,0,100),remainingMinutes:finite(data.remainingMinutes,0,100000),
  layer:finite(data.layer,0,100000),totalLayers:finite(data.totalLayers,0,100000)};
}
export async function printerView(config:BuildConfig):Promise<PrinterView> {
 const name=config.printer?.name||'Printer not configured',id=config.printer?.id;
 if(!id||!/^[-a-zA-Z0-9_]+$/.test(id))return {name,status:'unconfigured',label:'Printer monitoring not connected'};
 try {const data=JSON.parse(await readFile(path.join(root,'local-data/printers',id+'.status.json'),'utf8'));return recordedPrinter(name,data);}
 catch{return {name,status:'unconfigured',label:'Printer monitoring not connected'};}
}

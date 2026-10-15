// Local, subscribe-only MQTT 3.1.1 status reader. No printer-command publisher.
import tls from 'node:tls';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';

export function mqttString(value) {
 const bytes=Buffer.from(value),length=Buffer.alloc(2);
 length.writeUInt16BE(bytes.length);return Buffer.concat([length,bytes]);
}
export function mqttPacket(header,body=Buffer.alloc(0)) {
 let length=body.length;const encoded=[];
 do {let byte=length%128;length=Math.floor(length/128);if(length)byte|=128;encoded.push(byte);} while(length);
 return Buffer.concat([Buffer.from([header,...encoded]),body]);
}
export function readFrames(buffer) {
 const frames=[];let consumed=0;
 while(consumed+1<buffer.length) {
  let size=0,multiplier=1,cursor=consumed+1,byte;
  do {if(cursor>=buffer.length)return {frames,remainder:buffer.subarray(consumed)};byte=buffer[cursor++];size+=(byte&127)*multiplier;multiplier*=128;if(cursor-consumed>5)throw Error('Invalid MQTT frame.');} while(byte&128);
  if(size>2_000_000)throw Error('Oversize status frame.');
  if(buffer.length<cursor+size)break;
  frames.push({header:buffer[consumed],body:buffer.subarray(cursor,cursor+size)});consumed=cursor+size;
 }
 return {frames,remainder:buffer.subarray(consumed)};
}

function monitor(config,ca,target) {
 let stopped=false,socket,reconnect,ping,handshake,lastSeen=null,values={},reports=0;
 let output=Promise.resolve();
 function record(connection,error) {
  const data={connection,lastSeen,recordedAt:new Date().toISOString(),reports,
   state:values.gcode_state??null,job:values.subtask_name??null,
   progress:values.mc_percent??null,remainingMinutes:values.mc_remaining_time??null,
   layer:values.layer_num??null,totalLayers:values.total_layer_num??null,
   bedTemperature:values.bed_temper??null,nozzleTemperature:values.nozzle_temper??null,
   ...(error?{error}:{})};
  output=output.catch(()=>{}).then(async()=>{
   const temporary=target+'.'+process.pid+'.tmp';
   await writeFile(temporary,JSON.stringify(data));await rename(temporary,target);
  }).catch(()=>console.error('Printer status snapshot could not be saved.'));
 }
 function connect() {
  if(stopped)return;record('connecting');let pending=Buffer.alloc(0),failed=false;
  function fail(message) {
   if(failed||stopped)return;failed=true;clearInterval(ping);clearTimeout(handshake);
   socket.destroy();record('offline',message);reconnect=setTimeout(connect,15000);
  }
  socket=tls.connect({host:config.host,port:8883,ca,rejectUnauthorized:true,
   servername:config.serialNumber.trim(),minVersion:'TLSv1.2',maxVersion:'TLSv1.2'});
  handshake=setTimeout(()=>fail('Printer connection timed out.'),10000);
  socket.on('secureConnect',()=>socket.write(mqttPacket(0x10,Buffer.concat([
   mqttString('MQTT'),Buffer.from([4,0xc2,0,30]),mqttString('builddesk-'+randomUUID().slice(0,12)),
   mqttString('bblp'),mqttString(config.accessCode.trim())]))));
  socket.on('error',()=>fail('Printer connection or certificate verification failed.'));
  socket.on('close',()=>fail('Printer status connection closed.'));
  socket.setTimeout(45000,()=>fail('No printer messages received for 45 seconds.'));
  socket.on('data',bytes=>{
   if(failed)return;
   try {
    pending=Buffer.concat([pending,bytes]);const parsed=readFrames(pending);pending=parsed.remainder;
    for(const {header,body} of parsed.frames) {
     const type=header>>4;
     if(type===2) {
      if(body.length<2||body[1]!==0)return fail('Printer authentication rejected. Check the local access code.');
      socket.write(mqttPacket(0x82,Buffer.concat([Buffer.from([0,1]),mqttString('device/'+config.serialNumber.trim()+'/report'),Buffer.from([0])])));
      ping=setInterval(()=>{if(!socket.destroyed)socket.write(mqttPacket(0xc0));},15000);
     } else if(type===9) {
      if(body.length<3||body[2]===128)return fail('Printer rejected the status subscription.');
      clearTimeout(handshake);record('subscribed');
     } else if(type===3) {
      if(body.length<2)throw Error('Incomplete report.');
      let cursor=2+body.readUInt16BE(0);const qos=(header>>1)&3;
      const topic=body.subarray(2,cursor).toString();
      if(qos===1){socket.write(mqttPacket(0x40,body.subarray(cursor,cursor+2)));cursor+=2;}
      else if(qos>1)throw Error('Unsupported status QoS.');
      if(topic!=='device/'+config.serialNumber.trim()+'/report')continue;
      const data=JSON.parse(body.subarray(cursor).toString());
      if(data.print&&typeof data.print==='object') {
       if(data.print.subtask_name&&data.print.subtask_name!==values.subtask_name)values={};
       values={...values,...data.print};lastSeen=new Date().toISOString();reports++;record('connected');
      }
     }
    }
   } catch {fail('Printer sent an unsupported status message.');}
  });
 }
 connect();
 return ()=>{stopped=true;clearTimeout(reconnect);clearTimeout(handshake);clearInterval(ping);socket?.destroy();};
}

export async function startPrinterMonitors(root,registryFile) {
 if(process.env.BUILDDESK_DISABLE_MONITOR==='1')return ()=>{};
 const registry=JSON.parse(await readFile(registryFile,'utf8'));
 const stops=[],seen=new Set();
 for(const build of registry.builds) {
  const id=build.printer?.id;if(!build.active||!id||seen.has(id)||!/^[-a-zA-Z0-9_]+$/.test(id))continue;seen.add(id);
  const folder=path.join(root,'local-data/printers');
  try {
   const config=JSON.parse((await readFile(path.join(folder,id+'.local.json'),'utf8')).replace(/^\uFEFF/,''));
   if(!config.host||!config.serialNumber?.trim()||!config.accessCode?.trim())continue;
   const ca=await readFile(path.join(folder,config.caFile||'bambu-ca.cert'));
   await mkdir(folder,{recursive:true});stops.push(monitor(config,ca,path.join(folder,id+'.status.json')));
  } catch(error) {if(error.code!=='ENOENT')console.error('Printer monitoring setup is invalid; check the local settings file.');}
 }
 return ()=>stops.forEach(stop=>stop());
}

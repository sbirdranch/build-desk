import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import {XMLParser} from 'fast-xml-parser';
import type {BuildConfig,Snapshot,Command,ImportedPlate} from '../core/types';
import {DomainError} from '../core/domain';
import {refreshFile,modelPath,sourceHashes} from './assets';
import {createStore} from './excel-store';

const many=<T,>(value:T|T[]|undefined):T[]=>value===undefined?[]:Array.isArray(value)?value:[value];
type Node=Record<string,any>;
const metadata=(node:Node)=>Object.fromEntries(many<Node>(node.metadata).filter(m=>m['@_key']).map(m=>[String(m['@_key']),String(m['@_value']??'')]));

export async function inspectMembership(bytes:Buffer,snapshot:Snapshot,fileId:string) {
 if(bytes.length>150_000_000)throw new DomainError('Project is too large for the importer.');
 const zip=await JSZip.loadAsync(bytes),parser=new XMLParser({ignoreAttributes:false,processEntities:false});
 async function xml(name:string):Promise<Node>{const file=zip.file(name);if(!file)throw new DomainError('The project is missing saved plate metadata.');const raw=await file.async('string');if(raw.length>2_000_000||/<!DOCTYPE/i.test(raw))throw new DomainError('Unsupported project metadata.');return parser.parse(raw);}
 const settings=await xml('Metadata/model_settings.config'),model=await xml('3D/3dmodel.model');
 const objects=new Map(many<Node>(settings.config?.object).map(o=>[String(o['@_id']),o]));
 const items=many<Node>(model.model?.build?.item);
 const tracked=new Set(snapshot.plates.filter(p=>p.fileId===fileId).map(p=>p.number));
 const match=(name:string)=>snapshot.parts.filter(p=>path.win32.basename(p.source).toLowerCase()===path.win32.basename(name).toLowerCase());
 const plates:ImportedPlate[]=[],untracked:number[]=[];
 for(const node of many<Node>(settings.config?.plate)) {
  const md=metadata(node),number=Number(md.plater_id);
  if(!Number.isSafeInteger(number)||number<1)throw new DomainError('A saved plate has an invalid number.');
  if(!tracked.has(number)){untracked.push(number);continue;}
  const assignments=new Map<string,ImportedPlate['assignments'][number]>(),unmapped:string[]=[];
  for(const instance of many<Node>(node.model_instance)) {
   const im=metadata(instance),object=objects.get(im.object_id);
   if(!object)throw new DomainError('A plate references an unknown model object.');
   const name=metadata(object).name||im.object_id;
   const buildItem=items.filter(i=>String(i['@_objectid'])===im.object_id)[Number(im.instance_id||0)];
   if(!buildItem)throw new DomainError('A saved instance has no build item.');
   const enabled=String(buildItem['@_printable']??'1')!=='0';
   let matches=match(name),split=false;
   if(matches.length!==1) {
    const sources=[...new Set(many<Node>(object.part).map(p=>metadata(p).source_file).filter(Boolean))];
    if(sources.length===1)matches=match(sources[0]);
   }
   if(matches.length!==1&&/\.stl_\d+$/i.test(name)){matches=match(name.replace(/_\d+$/,''));split=matches.length===1;}
   if(matches.length!==1){unmapped.push(name);continue;}
   const partId=matches[0].id,old=assignments.get(partId);
   // Split fragments establish membership, not complete printable-unit quantities.
   assignments.set(partId,{partId,copies:split||old?.split?null:(old?.copies??0)+(enabled?1:0),split:split||old?.split||false});
  }
  plates.push({number,name:md.plater_name||`Plate ${number}`,assignments:[...assignments.values()],unmapped});
 }
 if(new Set(plates.map(p=>p.number)).size!==plates.length)throw new DomainError('Duplicate saved plate numbers.');
 return {sourceHash:createHash('sha256').update(bytes).digest('hex'),plates,untracked};
}

export async function refreshTrackedFile(config:BuildConfig,snapshot:Snapshot,fileId:string,revision:string,requestId:string) {
 if(snapshot.revision!==revision)throw new DomainError('The tracker changed. Reload it before refreshing this project.',409);
 const file=snapshot.files.find(f=>f.id===fileId);if(!file)throw new DomainError('File not found.');
 const inspected=await inspectMembership(await readFile(modelPath(config,file.filename)),snapshot,fileId);
 await refreshFile(config,snapshot,fileId);
 const hashes=await sourceHashes(config,snapshot);
 const command:Command={type:'reconcile-file',fileId,sourceHash:inspected.sourceHash,plates:inspected.plates};
 const result=await createStore(config).commit(revision,requestId,command,hashes);
 const review=inspected.plates.reduce((n,p)=>n+p.unmapped.length,0);
 return {message:`File details refreshed: plate parts and images updated.${inspected.untracked.length?' '+inspected.untracked.length+' custom/new plate(s) remain untracked.':''}${review?' '+review+' object(s) need part matching.':''}`,replayed:result.replayed};
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {ExcelStore} from '../src/server/excel-store';
import {applyCommand} from '../src/core/domain';
import {requireEditor} from '../src/server/security';
import {withPrinterSlot} from '../src/server/printer-slot';
import {assetFile,refreshFile} from '../src/server/assets';
import type {BuildConfig,Preparation} from '../src/core/types';
const testRoot=path.resolve('test-output');
async function fixture(id='test-build'){
 const dir=path.join(testRoot,randomUUID());await mkdir(dir,{recursive:true});const filename=path.join(dir,'Master.xlsx');
 const wb=new ExcelJS.Workbook();const p=wb.addWorksheet('Printed Parts Checklist');p.addRow(['ID','Section','Part','STL','Material','Required','Opening','Jobs','Total','Remaining','Files','Plates','Review','Link','Locations','Status','Installed','Notes']);p.addRow(['part-one','Front','Panel','Front/Panel.stl','PETG',3,0,0,0,3,'','','','','','',0,'Keep notes']);p.addRow(['part-two','Rear','Bracket','Rear/Bracket.stl','PETG',2,0,0,0,2,'','','','','','',0,'']);
 const f=wb.addWorksheet('3MF Project Register');f.addRow(['ID','Filename','Path','Revision','Material','Profile','Override','Status']);f.addRow(['file-one','Front.3mf','','v1','PETG','Standard','','Active']);f.addRow(['file-two','Rear.3mf','','v1','PETG','Standard','','Active']);
 const m=wb.addWorksheet('Part-to-Plate Mapping');m.addRow(['ID','Part ID','File ID','Number','Name','Copies','Review']);m.addRow(['map-one','part-one','file-one',1,'Front plate',2,'Confirmed']);m.addRow(['map-two','part-two','file-two',1,'Rear plate',1,'Confirmed']);
 wb.addWorksheet('Print Job History').addRow(['Job','Date','Part','Mapping','File','Revision','Plate','Runs','Planned','Accepted','Rejected','Status','Profile','Material','Notes','Check','Filename','Number','Started','Finished']);
 const unrelated=wb.addWorksheet('Purchasing');unrelated.getCell('A1').value='Do not modify';unrelated.getCell('B2').value={formula:'1+2',result:3};unrelated.getCell('A1').note='Keep this comment';
 await wb.xlsx.writeFile(filename);
 const config:BuildConfig={id,name:id,active:true,store:{kind:'excel',path:filename,schema:'master-tracker-v1'},assets:{root:dir,catalog:'catalog.json'},models:{directory:dir},workflow:{defaultProfile:'Standard',materials:['PETG'],maxPrintingJobs:1},modules:['printing']};
 return {dir,filename,config,store:new ExcelStore(config)};
}
function preparation():Preparation{return {runs:1,material:'PETG',profile:'Standard',layoutConfirmed:true,sourceHash:'source-a',items:[{mappingId:'map-one',included:true,copies:2,planned:2}],notes:'',savedAt:''}}
async function start(f:Awaited<ReturnType<typeof fixture>>){let s=await f.store.load();s=(await f.store.commit(s.revision,randomUUID(),{type:'save-preparation',plateId:'file-one-P01',preparation:preparation()},{'file-one':'source-a'})).snapshot;return (await f.store.commit(s.revision,randomUUID(),{type:'start',plateId:'file-one-P01'},{'file-one':'source-a'})).snapshot}

test('preparation, start, draft and acceptance preserve complete workbook and audit trail',async()=>{
 const f=await fixture();let s=await start(f);assert.equal(s.jobs[0].items[0].planned,2);assert.equal(s.parts[0].accepted,0);
 s=(await f.store.commit(s.revision,randomUUID(),{type:'save-results',jobId:s.jobs[0].id,results:[{mappingId:'map-one',accepted:1,rejected:null}]},{})).snapshot;assert.equal(s.parts[0].accepted,0);
 const requestId=randomUUID();const result=await f.store.commit(s.revision,requestId,{type:'finish',jobId:s.jobs[0].id,results:[{mappingId:'map-one',accepted:1,rejected:1}]},{});assert.equal(result.snapshot.parts[0].accepted,1);assert.equal(result.snapshot.audit.length,4);
 const replay=await f.store.commit(s.revision,requestId,{type:'finish',jobId:s.jobs[0].id,results:[{mappingId:'map-one',accepted:1,rejected:1}]},{});assert.equal(replay.replayed,true);assert.equal(replay.snapshot.parts[0].accepted,1);
 await assert.rejects(()=>f.store.commit(replay.snapshot.revision,randomUUID(),{type:'finish',jobId:s.jobs[0].id,results:[{mappingId:'map-one',accepted:1,rejected:1}]},{}),/already closed/);
 const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(f.filename);assert.equal(wb.getWorksheet('Purchasing')!.getCell('A1').value,'Do not modify');assert.equal(wb.getWorksheet('Purchasing')!.getCell('B2').result,3);assert.ok(wb.getWorksheet('Purchasing')!.getCell('A1').note);assert.equal((await readdir(path.join(f.dir,'backups'))).length,4);
});
test('one Printing job; preparation of another plate remains allowed',async()=>{
 const f=await fixture();let s=await start(f);await assert.rejects(()=>f.store.commit(s.revision,randomUUID(),{type:'start',plateId:'file-one-P01'},{'file-one':'source-a'}),/already has/);
 const prep={...preparation(),sourceHash:'source-b',items:[{mappingId:'map-two',included:true,copies:1,planned:1}]};s=(await f.store.commit(s.revision,randomUUID(),{type:'save-preparation',plateId:'file-two-P01',preparation:prep},{'file-two':'source-b'})).snapshot;assert.equal(s.plates[1].preparation?.runs,1);assert.equal(s.jobs[0].status,'Printing');
});
test('stale source and invalid counts cannot change accepted totals',async()=>{
 const f=await fixture();let s=await f.store.load();s=(await f.store.commit(s.revision,randomUUID(),{type:'save-preparation',plateId:'file-one-P01',preparation:preparation()},{'file-one':'source-a'})).snapshot;
 await assert.rejects(()=>f.store.commit(s.revision,randomUUID(),{type:'start',plateId:'file-one-P01'},{'file-one':'changed'}),/stale/);
 s=(await f.store.commit(s.revision,randomUUID(),{type:'start',plateId:'file-one-P01'},{'file-one':'source-a'})).snapshot;
 for(const results of [[{mappingId:'map-one',accepted:2,rejected:1}],[{mappingId:'map-one',accepted:-1,rejected:3}],[{mappingId:'map-one',accepted:1,rejected:null}]])await assert.rejects(()=>f.store.commit(s.revision,randomUUID(),{type:'finish',jobId:s.jobs[0].id,results},{}));assert.equal((await f.store.load()).parts[0].accepted,0);
});
test('manual custom-layout results credit original mappings without plate runs',async()=>{
 const f=await fixture();const s=await f.store.load();const r=await f.store.commit(s.revision,randomUUID(),{type:'manual-results',items:[{mappingId:'map-one',planned:1,accepted:1,rejected:0},{mappingId:'map-two',planned:2,accepted:1,rejected:1}],notes:'Custom recovery plate'},{});assert.deepEqual(r.snapshot.parts.map(p=>p.accepted),[1,1]);assert.equal(r.snapshot.jobs[0].kind,'manual');assert.ok(r.snapshot.jobs[0].items.every(i=>i.runs===0));assert.equal(r.snapshot.plates.length,2);
});
test('external workbook edits and Excel lock files block saves without overwriting',async()=>{
 const f=await fixture();const stale=await f.store.load();const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(f.filename);wb.getWorksheet('Purchasing')!.getCell('A2').value='Outside edit';await wb.xlsx.writeFile(f.filename);
 await assert.rejects(()=>f.store.commit(stale.revision,randomUUID(),{type:'update-part',partId:'part-one',required:4,installed:0,notes:'app'},{}),/changed since/);assert.equal((await f.store.load()).parts[0].required,3);
 await writeFile(path.join(f.dir,'~$Master.xlsx'),'Excel lock');const fresh=await f.store.load();await assert.rejects(()=>f.store.commit(fresh.revision,randomUUID(),{type:'update-part',partId:'part-one',required:4,installed:0,notes:''},{}),/Close this workbook/);
});
test('two builds with identical entity IDs have separate data stores',async()=>{
 const a=await fixture('build-a'),b=await fixture('build-b');const sa=await a.store.load();await a.store.commit(sa.revision,randomUUID(),{type:'update-part',partId:'part-one',required:12,installed:0,notes:'Only build A'},{});assert.equal((await a.store.load()).parts[0].required,12);assert.equal((await b.store.load()).parts[0].required,3);assert.equal((await b.store.load()).audit.length,0);
});
test('builds sharing one printer cannot start independent simultaneous tracked prints',async()=>{
 const a=await fixture('printer-build-a'),b=await fixture('printer-build-b');const printer={id:'test-'+randomUUID(),name:'Shared test printer'};a.config.printer=printer;b.config.printer=printer;
 await withPrinterSlot(a.config,[a.config,b.config],()=>start(a));
 await assert.rejects(()=>withPrinterSlot(b.config,[a.config,b.config],()=>start(b)),/already has a tracked print/);
});
test('printer-finished stage does not accept parts; cancellation preserves drafted accepts',async()=>{
 const f=await fixture();let s=await start(f);s=(await f.store.commit(s.revision,randomUUID(),{type:'await-inspection',jobId:s.jobs[0].id},{})).snapshot;assert.equal(s.jobs[0].status,'Awaiting inspection');assert.equal(s.parts[0].accepted,0);s=(await f.store.commit(s.revision,randomUUID(),{type:'save-results',jobId:s.jobs[0].id,results:[{mappingId:'map-one',accepted:1,rejected:1}]},{})).snapshot;await assert.rejects(()=>f.store.commit(s.revision,randomUUID(),{type:'cancel',jobId:s.jobs[0].id},{}),/Accepted parts are drafted/);
});
test('remote clients cannot edit and foreign origins cannot use a desktop token',()=>{
 process.env.BUILDDESK_EDIT_TOKEN='test-token-12345';const make=(local:string,origin:string,token='test-token-12345')=>new Request('http://localhost:4174/api',{headers:{'host':'localhost:4174','origin':origin,'x-builddesk-local':local,'x-builddesk-token':token}});
 assert.throws(()=>requireEditor(make('0','http://localhost:4174')),/read-only/);assert.throws(()=>requireEditor(make('1','https://other.example')),/this app/);assert.throws(()=>requireEditor(make('1','http://localhost:4174','wrong')),/Refresh/);assert.doesNotThrow(()=>requireEditor(make('1','http://localhost:4174')));
});
test('asset paths cannot escape the configured build root',async()=>{const f=await fixture();await assert.rejects(()=>assetFile(f.config,'../secret.txt'),/not allowed/)});
test('file refresh preserves disabled flags and leaves new plates untracked',async()=>{
 const f=await fixture();const zip=new JSZip();zip.file('Metadata/model_settings.config','<config><object id="1"><metadata key="name" value="Panel.stl"/></object><plate><metadata key="plater_id" value="1"/><model_instance><metadata key="object_id" value="1"/><metadata key="instance_id" value="0"/></model_instance></plate><plate><metadata key="plater_id" value="2"/><model_instance><metadata key="object_id" value="1"/><metadata key="instance_id" value="0"/></model_instance></plate></config>');zip.file('3D/3dmodel.model','<model><build><item objectid="1" printable="0"/></build></model>');zip.file('Metadata/slice_info.config','<config><header/></config>');await writeFile(path.join(f.dir,'Front.3mf'),await zip.generateAsync({type:'nodebuffer'}));await writeFile(path.join(f.dir,'catalog.json'),JSON.stringify({parts:[],projects:[{id:'file-one',filename:'Front.3mf',sha256:'old',plates:[{id:'file-one-P01',name:'Plate1',thumbnail:'old.png',preview:'old.png',model:'old.glb',tracking:'tracked'}]}],references:[]}));const before=await f.store.load();const result=await refreshFile(f.config,before,'file-one');assert.equal(result.changed,true);const cat=JSON.parse(await readFile(path.join(f.dir,'catalog.json'),'utf8'));assert.equal(cat.projects[0].plates[0].instances[0].enabled,false);assert.equal(cat.projects[0].plates[0].model,undefined);assert.equal(cat.projects[0].plates[1].tracking,'untracked_candidate');assert.equal(cat.projects[0].plates[0].slice_info.label,'Not yet sliced');assert.equal((await f.store.load()).revision,before.revision);
});
test('real exported workbook survives a clone-only save; original is unchanged',async()=>{
 const input=path.resolve('../local-data/kitten-745/Master Tracker.xlsx');const original=await readFile(input);const dir=path.join(testRoot,'real-roundtrip-'+randomUUID());await mkdir(dir,{recursive:true});const filename=path.join(dir,'Clone.xlsx');await writeFile(filename,original);const registry=JSON.parse(await readFile('../config/builds.json','utf8'));const config={...registry.builds[0],store:{...registry.builds[0].store,path:filename}} as BuildConfig;const store=new ExcelStore(config);const before=await store.load();const part=before.parts[0];await store.commit(before.revision,randomUUID(),{type:'update-part',partId:part.id,required:part.required,installed:part.installed,notes:part.notes+' [TEST CLONE ONLY]'},{});const after=await store.load();assert.equal(after.parts.length,101);assert.deepEqual(after.parts.map(p=>p.accepted),before.parts.map(p=>p.accepted));const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(filename);assert.equal(wb.worksheets.length,19);assert.equal(createHash('sha256').update(await readFile(input)).digest('hex'),createHash('sha256').update(original).digest('hex'));
});

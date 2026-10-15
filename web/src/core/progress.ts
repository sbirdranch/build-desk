import type {Snapshot} from './types';

export const tally=(complete:number,total:number)=>({complete,total,percent:total?Math.round(complete/total*100):0});
export function buildProgress(snapshot:Snapshot){
 const printed=new Set(snapshot.jobs.filter(j=>j.kind==='plate'&&j.status==='Completed').flatMap(j=>j.items.filter(i=>i.runs>0).map(i=>JSON.stringify([i.fileId,i.plateNumber]))));
 const platePrinted=(p:Snapshot['plates'][number])=>printed.has(JSON.stringify([p.fileId,p.number]));
 const fileComplete=(id:string)=>{const plates=snapshot.plates.filter(p=>p.fileId===id);return plates.length>0&&plates.every(platePrinted)};
 const sectionNames=[...new Set([...snapshot.parts.map(p=>p.section),...snapshot.files.map(f=>f.section)])];
 const sections=sectionNames.map(name=>{const files=snapshot.files.filter(f=>f.section===name),plates=snapshot.plates.filter(p=>p.section===name);return {name,plates:tally(plates.filter(platePrinted).length,plates.length),complete:files.length>0&&files.every(f=>fileComplete(f.id))}});
 return {parts:tally(snapshot.parts.filter(p=>p.required!==null&&p.accepted>=p.required).length,snapshot.parts.length),plates:tally(snapshot.plates.filter(platePrinted).length,snapshot.plates.length),files:tally(snapshot.files.filter(f=>fileComplete(f.id)).length,snapshot.files.length),categories:tally(sections.filter(s=>s.complete).length,sections.length),sections};
}

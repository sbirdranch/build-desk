import {Box,Printer,Layers,Folder} from 'lucide-react';
import {buildProgress} from '@/core/progress';
import type {Snapshot} from '@/core/types';

export default function BuildProgress({snapshot}:{snapshot:Snapshot}){
 const totals=buildProgress(snapshot);
 const metrics=[{label:'Parts complete',value:totals.parts,Icon:Box,help:'Accepted quantity meets or exceeds required quantity. Unconfirmed quantities remain incomplete.'},{label:'Plates printed',value:totals.plates,Icon:Printer,help:'Tracked plates with a completed print run. Manual reprints do not count as plate runs.'},{label:'3MF files complete',value:totals.files,Icon:Layers,help:'All tracked plates in the file have a completed print run.'},{label:'Sections complete',value:totals.categories,Icon:Folder,help:'All tracked plates in every file in the section have a completed print run.'}];
 return <><div className="build-progress" aria-label="Vehicle progress">{metrics.map(({label,value,Icon,help})=><div className="progress-card" key={label} title={help}><div className="progress-card-label"><Icon size={17}/><span>{label}</span></div><div className="progress-card-count"><strong>{value.complete}<small> of {value.total}</small></strong><span>{value.percent}%</span></div><progress aria-label={label} value={value.complete} max={value.total||1}/></div>)}</div><p className="progress-note">{snapshot.parts.reduce((n,p)=>n+p.accepted,0)} accepted units recorded · Printed progress uses completed tracked runs; acceptance is counted separately.</p></>;
}

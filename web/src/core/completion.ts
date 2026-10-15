import type {Part} from './types';

export function completionState(parts:Part[],unmapped=false){
 const unique=[...new Map(parts.map(p=>[p.id,p])).values()];
 if(unique.length&&!unmapped&&unique.every(p=>p.required!==null&&p.accepted>=p.required))return 'complete';
 if(unique.some(p=>p.accepted>0||p.required!==null&&p.accepted>=p.required))return 'partial';
 if(unmapped||!unique.length||unique.some(p=>p.required===null))return 'unconfirmed';
 return 'not-printed';
}

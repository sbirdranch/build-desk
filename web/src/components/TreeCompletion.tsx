import {CircleCheck,CircleDashed,CircleHelp,Circle} from 'lucide-react';
import {completionState} from '@/core/completion';
import type {Part} from '@/core/types';

export default function TreeCompletion({parts,unmapped=false}:{parts:Part[];unmapped?:boolean}){
 const state=completionState(parts,unmapped);
 const {Icon,label}={complete:{Icon:CircleCheck,label:'Complete'},partial:{Icon:CircleDashed,label:'Partially complete'},unconfirmed:{Icon:CircleHelp,label:'Quantity or part matching needs review'},'not-printed':{Icon:Circle,label:'Not started'}}[state];
 return <span className={'tree-completion '+state} role="img" aria-label={label} title={label}><Icon size={13}/></span>;
}

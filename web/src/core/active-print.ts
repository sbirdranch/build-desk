export function activePrintAnchor(path:string[],expanded:(key:string)=>boolean,visible:(key:string)=>boolean){
 let anchor=path[0];
 for(let i=1;i<path.length;i++){if(!expanded(anchor)||!visible(path[i]))break;anchor=path[i];}
 return anchor;
}

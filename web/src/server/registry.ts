import {readFile} from 'node:fs/promises';
import path from 'node:path';
import type {BuildConfig} from '../core/types';
export const root=path.resolve(process.cwd(),'..');
export async function builds():Promise<BuildConfig[]>{
 const file=process.env.BUILDDESK_REGISTRY||path.join(root,'config/builds.json');
 const data=JSON.parse(await readFile(file,'utf8'));if(data.version!==1||!Array.isArray(data.builds))throw Error('Unsupported build registry.');
 const seen=new Set<string>(),stores=new Set<string>();
 for(const b of data.builds){if(!/^[a-z0-9][a-z0-9-]{0,63}$/.test(b.id)||seen.has(b.id))throw Error('Build IDs must be unique URL-safe identifiers.');seen.add(b.id);const p=path.resolve(root,b.store.path).toLowerCase();if(stores.has(p))throw Error('Each build needs its own workbook.');stores.add(p);if(b.store.kind!=='excel')throw Error('No adapter registered for '+b.store.kind);}
 return data.builds;
}
export async function build(id:string){const found=(await builds()).find(b=>b.id===id);if(!found)throw Error('Build not found.');return found;}
export function assetRoot(config:BuildConfig){return path.resolve(root,config.assets.root)}
export function workbookPath(config:BuildConfig){return path.resolve(root,config.store.path)}

import {builds} from '@/server/registry';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){try{return Response.json((await builds()).map(b=>({id:b.id,name:b.name,active:b.active,modules:b.modules})));}catch{return Response.json({error:'The Builds registry could not be loaded.'},{status:500});}}

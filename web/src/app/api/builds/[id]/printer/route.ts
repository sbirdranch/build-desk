import {build} from '@/server/registry';
import {printerView} from '@/server/printer';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,context:{params:Promise<{id:string}>}) {
 try{return Response.json(await printerView(await build((await context.params).id)),{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'Printer status is unavailable.'},{status:503});}
}

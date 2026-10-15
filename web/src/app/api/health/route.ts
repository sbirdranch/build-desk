import {local} from '@/server/security';
export const dynamic='force-dynamic';
export function GET(request:Request){return Response.json({application:'Build Desk',version:'0.2.0',...(local(request)?{pid:process.pid}:{})})}

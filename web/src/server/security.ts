import {timingSafeEqual} from 'node:crypto';
import {DomainError} from '../core/domain';
export function local(request:Request){return request.headers.get('x-builddesk-local')==='1'}
export function requireEditor(request:Request){
 if(!local(request))throw new DomainError('This connection is read-only. Use the app on the host PC to make changes.',403);
 const origin=request.headers.get('origin');const host=request.headers.get('host');if(!origin||new URL(origin).host!==host)throw new DomainError('Save requests must come from this app.',403);
 const token=request.headers.get('x-builddesk-token')||'',expected=process.env.BUILDDESK_EDIT_TOKEN||'';
 if(!expected||token.length!==expected.length||!timingSafeEqual(Buffer.from(token),Buffer.from(expected)))throw new DomainError('Refresh the app before saving.',403);
}

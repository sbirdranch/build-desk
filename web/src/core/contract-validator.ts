// Narrow JSON Schema interpreter for the checked-in contract's keywords.
// Unknown keywords fail closed so extensions require consumer work.
export function validateContract(value:unknown,schema:any,location='$'):void{
 const supported=new Set(['$schema','$id','title','type','required','properties','additionalProperties','items','minItems','maxItems','minLength','maxLength','minimum','maximum','pattern','enum','const','anyOf','format']);
 for(const key of Object.keys(schema))if(!supported.has(key))throw Error('Unsupported contract keyword: '+key);
 const fail=(reason:string):never=>{throw Error(location+': '+reason)};
 if(schema.anyOf){if(!schema.anyOf.some((s:any)=>{try{validateContract(value,s,location);return true;}catch{return false;}}))fail('invalid value');return;}
 if('const'in schema&&value!==schema.const)fail('unexpected constant');if(schema.enum&&!schema.enum.includes(value))fail('unsupported enumeration');
 if(schema.type==='null'&&value!==null)fail('expected null');if(schema.type==='boolean'&&typeof value!=='boolean')fail('expected boolean');
 if(schema.type==='integer'&&(!Number.isSafeInteger(value)||typeof value!=='number'||value<schema.minimum||value>schema.maximum))fail('invalid whole number');
 if(schema.type==='string'){if(typeof value!=='string')fail('expected text');const text=value as string;if(text.length<(schema.minLength??0)||text.length>(schema.maxLength??Infinity)||schema.pattern&&!new RegExp(schema.pattern).test(text))fail('invalid text');if(schema.format==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(text)||!Number.isFinite(Date.parse(text))||new Date(text).toISOString().slice(0,10)!==text))fail('invalid date');if(schema.format==='date-time'&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(text)||!Number.isFinite(Date.parse(text))))fail('invalid timestamp');}
 if(schema.type==='array'){if(!Array.isArray(value))fail('expected array');const a=value as unknown[];if(a.length<(schema.minItems??0)||a.length>(schema.maxItems??Infinity))fail('invalid array length');a.forEach((v,i)=>validateContract(v,schema.items,location+'['+i+']'));}
 if(schema.type==='object'){if(!value||typeof value!=='object'||Array.isArray(value))fail('expected object');const o=value as Record<string,unknown>;for(const key of schema.required||[])if(!(key in o))fail('missing '+key);for(const [key,v] of Object.entries(o)){if(!schema.properties[key]){if(schema.additionalProperties===false)fail('unsupported field '+key);}else validateContract(v,schema.properties[key],location+'.'+key);}}
}

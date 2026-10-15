"""Integrity checks against real input sources and every generated derivative."""
from pathlib import Path
import hashlib
import json
import struct
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.python-packages'))
from PIL import Image

def main():
    output=ROOT/'assets/generated'
    catalog=json.loads((output/'catalog.json').read_text(encoding='utf-8'))
    keys=json.loads((ROOT/'config/parts.json').read_text(encoding='utf-8'))
    projects=json.loads((ROOT/'config/projects.json').read_text(encoding='utf-8'))
    errors=[]; verified_images=0; verified_models=0; total_bytes=0
    def check(condition,message):
        if not condition: errors.append(message)
    records=catalog['parts']+[p for project in catalog['projects'] for p in project['plates']]
    check(len({r['id'] for r in records})==len(records),'Duplicate asset IDs')
    check({p['id'] for p in catalog['parts']}=={p['id'] for p in keys},'Missing or extra tracked part assets')
    check({p['id'] for p in catalog['projects']}=={p['project_id'] for p in projects},'Missing or extra project assets')
    for p in catalog['parts']:
        source=ROOT/'local-inputs/stl-current'/p['source_relative'].replace('\\','/')
        check(hashlib.sha256(source.read_bytes()).hexdigest()==p['sha256'],f'Source changed: {p["id"]}')
    for p in catalog['projects']:
        source=ROOT/'local-inputs/projects'/p['filename']
        check(hashlib.sha256(source.read_bytes()).hexdigest()==p['sha256'],f'Project changed: {p["id"]}')
    for record in records:
        for field in ['thumbnail','preview']:
            path=output/record[field]
            try:
                with Image.open(path) as im:
                    im.load();check(min(im.size)>=100,f'Tiny image: {path}')
                    colors=im.convert('RGB').getextrema()
                    check(any(hi-lo>15 for lo,hi in colors),f'Blank image: {path}')
                verified_images+=1;total_bytes+=path.stat().st_size
            except Exception as e: errors.append(f'Invalid image {path}: {e}')
        path=output/record['model']
        try:
            raw=path.read_bytes();magic,version,length=struct.unpack_from('<4sII',raw)
            check(magic==b'glTF' and version==2 and length==len(raw),f'Invalid GLB: {path}')
            json_length,kind=struct.unpack_from('<II',raw,12)
            payload=json.loads(raw[20:20+json_length])
            check(kind==0x4e4f534a and bool(payload.get('meshes')),f'No GLB meshes: {path}')
            check(all(len(a.get('min',[0,0,0]))==len(a.get('max',[0,0,0])) for a in payload.get('accessors',[])),f'Invalid bounds: {path}')
            verified_models+=1;total_bytes+=len(raw)
        except Exception as e:errors.append(f'Invalid model {path}: {e}')
    reference_file=output/'references.json'
    reference_count=0
    if reference_file.exists():
        references=json.loads(reference_file.read_text(encoding='utf-8'))
        reference_count=len(references)
        expected=json.loads((ROOT/'config/references.json').read_text(encoding='utf-8'))
        check({r['id'] for r in references}=={r['id'] for r in expected},'Missing or extra reference photos')
        for photo in references:
            original=output/photo['original']
            source=ROOT/'local-inputs/references'/photo['filename']
            check(hashlib.sha256(source.read_bytes()).hexdigest()==photo['sha256'],'Reference source changed: '+photo['id'])
            check(hashlib.sha256(original.read_bytes()).hexdigest()==photo['sha256'],'Reference original copy changed: '+photo['id'])
            for field in ['thumbnail','preview']:
                with Image.open(output/photo[field]) as im: im.load()
    result={'parts':len(catalog['parts']),'projects':len(catalog['projects']),'plates':sum(len(p['plates']) for p in catalog['projects']),'reference_photos':reference_count,
            'verified_images':verified_images,'verified_models':verified_models,'display_asset_bytes':total_bytes,
            'exceptions':catalog['exceptions'],'errors':errors,'passed':not errors and not catalog['exceptions']}
    (output/'verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(result,indent=2))
    raise SystemExit(0 if result['passed'] else 1)

if __name__=='__main__': main()

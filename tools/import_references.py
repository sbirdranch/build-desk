"""Create browsing derivatives while retaining byte-identical reference originals."""
from pathlib import Path
import hashlib
import json
import shutil
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.python-packages'))
from PIL import Image, ImageOps

def main():
    catalog=[]
    for entry in json.loads((ROOT/'config/references.json').read_text(encoding='utf-8')):
        source=ROOT/'local-inputs/references'/entry['filename']
        directory=ROOT/'assets/generated/references'/entry['id']
        directory.mkdir(parents=True,exist_ok=True)
        original=directory/('original'+source.suffix.lower())
        shutil.copyfile(source,original)
        digest=hashlib.sha256(source.read_bytes()).hexdigest()
        assert hashlib.sha256(original.read_bytes()).hexdigest()==digest
        with Image.open(source) as image:
            icc=image.info.get('icc_profile')
            size=image.size
            oriented=ImageOps.exif_transpose(image).convert('RGB')
            for name,maximum in [('thumbnail',320),('preview',2048)]:
                output=oriented.copy()
                output.thumbnail((maximum,maximum),Image.Resampling.LANCZOS)
                output.save(directory/f'{name}.webp',lossless=True,method=6,**({'icc_profile':icc} if icc else {}))
        record={**entry,'section':'Finished-product references','source_sha256':digest,'sha256':digest,'width':size[0],'height':size[1],
                'original':f"references/{entry['id']}/{original.name}",
                'preview':f"references/{entry['id']}/preview.webp",'thumbnail':f"references/{entry['id']}/thumbnail.webp",
                'kind':'reference','color_processing':'No color grading. Embedded ICC profile retained when present. Original retained byte-for-byte.'}
        catalog.append(record)
        print(f"Imported {entry['name']}: {size[0]} × {size[1]}")
    target=ROOT/'assets/generated/references.json'
    target.write_text(json.dumps(catalog,indent=2,ensure_ascii=False),encoding='utf-8')
    print('Verified all original photo copies byte-for-byte.')

if __name__=='__main__':main()

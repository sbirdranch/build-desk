"""Read-only STL/3MF ingestion; writes only the selected asset output directory.

Uses real geometry. Simplified GLBs are display assets, never print sources.
Existing assets can be reused only when their source hash and renderer version match.
"""
from __future__ import annotations
import argparse
import hashlib
import io
import json
import math
import os
from pathlib import Path
import sys
import time
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault('MPLCONFIGDIR', str(ROOT / '.matplotlib-cache'))
sys.path.insert(0, str(ROOT / '.python-packages'))
import numpy as np
import trimesh
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from PIL import Image, ImageDraw, ImageFont

VERSION = 'geometry-v1.0.0'
NS = {'m': 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'}
PROD = 'http://schemas.microsoft.com/3dmanufacturing/production/2015/06'
BG = '#182127'

def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda: f.read(1024*1024), b''):
            h.update(block)
    return h.hexdigest()

def write_json(path, data):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')

def simplify(mesh, faces=22000):
    if len(mesh.faces) <= faces:
        return mesh.copy()
    return mesh.simplify_quadric_decimation(face_count=faces)

def as_mesh(value):
    if isinstance(value, trimesh.Scene):
        return value.to_mesh()
    return value

def draw_mesh(mesh, path, plate=False):
    """Orthographic geometry render with depth-sorted triangles and directional shading."""
    if not len(mesh.faces) or not np.isfinite(mesh.vertices).all():
        raise ValueError('Empty or nonfinite geometry')
    mesh = simplify(mesh, 55000 if plate else 22000)
    bounds = mesh.bounds
    center = bounds.mean(axis=0)
    extent = float(np.max(bounds[1] - bounds[0]))
    if extent <= 0:
        raise ValueError('Zero-size geometry')
    triangles = mesh.triangles - center
    normals = mesh.face_normals
    light = np.array([-0.4, -0.7, 1.0]); light /= np.linalg.norm(light)
    brightness = .42 + .5 * np.maximum(normals @ light, 0) + .08 * np.abs(normals[:, 2])
    base = np.array([.74, .79, .82])
    colors = np.clip(brightness[:, None] * base, 0, 1)
    fig = plt.figure(figsize=(6, 6), dpi=160, facecolor=BG)
    ax = fig.add_axes([0, 0, 1, 1], projection='3d', facecolor=BG)
    ax.set_proj_type('ortho')
    ax.add_collection3d(Poly3DCollection(triangles, facecolors=colors, edgecolors='none', linewidths=0, zsort='average', antialiased=False))
    radius = extent * .54
    for setter in [ax.set_xlim, ax.set_ylim, ax.set_zlim]:
        setter(-radius, radius)
    ax.set_box_aspect((1, 1, 1), zoom=1.12)
    ax.view_init(elev=34, azim=-58)
    ax.set_axis_off()
    fig.savefig(path, format='png', dpi=160, facecolor=BG)
    plt.close(fig)
    with Image.open(path) as im:
        im.convert('RGB').save(path, 'WEBP', quality=90, method=6)

def derivative_set(mesh, directory):
    directory.mkdir(parents=True, exist_ok=True)
    preview = directory / 'preview.webp'
    draw_mesh(mesh, preview)
    with Image.open(preview) as im:
        im.resize((192, 192), Image.Resampling.LANCZOS).save(directory / 'thumbnail.webp', quality=86, method=6)
    display = simplify(mesh, 45000)
    # Normalize only display coordinates. Preserve the source file untouched.
    display.apply_translation(-display.bounds.mean(axis=0))
    display.visual = trimesh.visual.ColorVisuals(display, vertex_colors=[181, 192, 202, 255])
    display.export(directory / 'model.glb')
    return {'source_faces': int(len(mesh.faces)), 'display_faces': int(len(display.faces)),
            'bounds_mm': np.round(mesh.extents, 4).tolist(), 'display_only': True}

def matrix(text):
    if not text:
        return np.eye(4)
    numbers = np.array([float(v) for v in text.split()])
    if len(numbers) != 12:
        raise ValueError('Invalid 3MF transform')
    m = np.eye(4); m[:3, :3] = numbers[:9].reshape(3, 3).T; m[:3, 3] = numbers[9:]
    return m

class Project:
    def __init__(self, path):
        self.z = zipfile.ZipFile(path)
        self.roots = {}; self.meshes = {}
        self.main = '3D/3dmodel.model'
        self.root = self.xml(self.main)
        self.settings = ET.fromstring(self.z.read('Metadata/model_settings.config'))
        self.build = self.root.findall('m:build/m:item', NS)
        self.names = {o.get('id'): meta(o).get('name', '') for o in self.settings.findall('object')}

    def xml(self, path):
        path = path.lstrip('/')
        if path not in self.roots:
            self.roots[path] = ET.fromstring(self.z.read(path))
        return self.roots[path]

    def object(self, path, oid, stack=()):
        path = path.lstrip('/')
        key = (path, oid)
        if key in stack:
            raise ValueError('Cyclic 3MF component reference')
        if key in self.meshes:
            return self.meshes[key].copy()
        obj = self.xml(path).find(f"m:resources/m:object[@id='{oid}']", NS)
        if obj is None:
            raise ValueError(f'Missing 3MF object: {path} {oid}')
        mesh = obj.find('m:mesh', NS)
        if mesh is not None:
            verts = [[float(v.get(k)) for k in ('x','y','z')] for v in mesh.findall('m:vertices/m:vertex', NS)]
            faces = [[int(t.get(k)) for k in ('v1','v2','v3')] for t in mesh.findall('m:triangles/m:triangle', NS)]
            result = trimesh.Trimesh(vertices=verts, faces=faces, process=False)
        else:
            pieces = []
            for c in obj.findall('m:components/m:component', NS):
                child = c.get(f'{{{PROD}}}path', path)
                piece = self.object(child, c.get('objectid'), stack + (key,))
                piece.apply_transform(matrix(c.get('transform')))
                pieces.append(piece)
            if not pieces:
                raise ValueError('3MF object has no geometry')
            result = trimesh.util.concatenate(pieces)
        self.meshes[key] = result
        return result.copy()

    def instance(self, oid, index):
        items = [i for i in self.build if i.get('objectid') == oid]
        if index >= len(items):
            raise ValueError(f'Missing build instance {oid}:{index}')
        item = items[index]
        mesh = self.object(self.main, oid)
        mesh.apply_transform(matrix(item.get('transform')))
        return mesh, item.get('printable', '1') != '0'

def meta(element):
    return {m.get('key'): m.get('value') for m in element.findall('metadata')}

def slice_info(project, number):
    name = 'Metadata/slice_info.config'
    if name not in project.z.namelist():
        return {'status': 'not_yet_sliced', 'label': 'Not yet sliced'}
    root = ET.fromstring(project.z.read(name))
    for p in root.findall('.//plate'):
        md = meta(p)
        idx = md.get('index', md.get('plater_id'))
        if idx != str(number):
            continue
        # Retain raw metadata for the later application importer; no fabricated estimate.
        return {'status': 'saved_slice_metadata', 'label': 'Saved slice metadata; freshness requires review',
                'raw': md, 'filaments': [f.attrib for f in p.findall('filament')]}
    return {'status': 'not_yet_sliced', 'label': 'Not yet sliced'}

def make_sheets(catalog, out):
    records = [(r['id'], r['name'], out / r['thumbnail']) for r in catalog['parts'] if r.get('thumbnail')]
    cols, cell_w, cell_h = 7, 192, 224
    pages = []
    for page, start in enumerate(range(0, len(records), 35), 1):
        batch = records[start:start+35]
        canvas = Image.new('RGB', (cols*cell_w, math.ceil(len(batch)/cols)*cell_h), BG)
        d = ImageDraw.Draw(canvas)
        for n, (pid, name, path) in enumerate(batch):
            x, y = n%cols*cell_w, n//cols*cell_h
            with Image.open(path) as im: canvas.paste(im, (x, y))
            d.text((x+8, y+190), pid, fill='#f4c542')
            d.text((x+8, y+204), name[:28], fill='#e0e6eb')
        path = out / f'contact-sheet-{page}.jpg'
        canvas.save(path, quality=90)
        pages.append(path.name)
    catalog['contact_sheets'] = pages
    plates = [(project['id'], plate) for project in catalog['projects'] for plate in project['plates']]
    canvas = Image.new('RGB', (5*240, math.ceil(len(plates)/5)*280), BG)
    d = ImageDraw.Draw(canvas)
    for n, (project_id, plate) in enumerate(plates):
        x,y = n%5*240,n//5*280
        with Image.open(out/plate['preview']) as im:
            im.thumbnail((230,230),Image.Resampling.LANCZOS)
            canvas.paste(im,(x+(240-im.width)//2,y+(230-im.height)//2))
        d.text((x+8,y+232),plate['id'],fill='#f4c542')
        d.text((x+8,y+247),plate['name'][:32],fill='#e0e6eb')
        d.text((x+8,y+261),plate['tracking'],fill='#afbec9')
    canvas.save(out/'plate-contact-sheet.jpg',quality=90)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--stl-root', type=Path, required=True)
    ap.add_argument('--projects', type=Path, required=True)
    ap.add_argument('--keys', type=Path, required=True)
    ap.add_argument('--project-manifest', type=Path, required=True)
    ap.add_argument('--output', type=Path, default=ROOT/'assets/generated')
    args = ap.parse_args()
    out = args.output.resolve(); out.mkdir(parents=True, exist_ok=True)
    keys = json.loads(args.keys.read_text(encoding='utf-8-sig'))
    manifest = json.loads(args.project_manifest.read_text(encoding='utf-8-sig'))
    known = {p['filename']: p for p in manifest}
    known.setdefault('745 Beadlock Wheel.3mf', {'project_id': 'K745-3MF001', 'section': 'Beadlock Wheels', 'tracked_plate_numbers': [1]})
    old = {}
    if (out/'catalog.json').exists():
        previous = json.loads((out/'catalog.json').read_text(encoding='utf-8'))
        if previous.get('renderer') == VERSION: old = {p['id']: p for p in previous['parts']}
    catalog = {'schema_version': 1, 'renderer': VERSION, 'generated_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
               'parts': [], 'projects': [], 'exceptions': [],
               'notice': 'Display assets only. Geometry simplification and shading do not establish print readiness or completion.'}
    for n, key in enumerate(keys, 1):
        source = args.stl_root / Path(key['source'].replace('\\', '/'))
        record = {'id': key['id'], 'name': source.stem, 'section': key['source'].split('\\')[0], 'source_relative': key['source']}
        if not source.exists():
            catalog['exceptions'].append({'kind': 'missing_part', **record})
            continue
        try:
            fingerprint = sha(source)
            if key['id'] in old and old[key['id']].get('sha256') == fingerprint and all((out/old[key['id']][field]).exists() for field in ['thumbnail','preview','model']):
                record = old[key['id']]
            else:
                mesh = as_mesh(trimesh.load(source, force='mesh'))
                directory = out / 'parts' / key['id']
                record.update(derivative_set(mesh, directory))
                record.update({'sha256': fingerprint, **{field: f"parts/{key['id']}/{file}" for field,file in [('thumbnail','thumbnail.webp'),('preview','preview.webp'),('model','model.glb')]}})
            catalog['parts'].append(record)
            print(f"PART {n}/{len(keys)} {key['id']} {source.name}", flush=True)
        except Exception as e:
            catalog['exceptions'].append({'kind': 'part_error', **record, 'error': str(e)})
            print(f"ERROR {source.name}: {e}", flush=True)
        write_json(out/'catalog.json', catalog)
    for source in sorted(args.projects.glob('*.3mf')):
        info = known.get(source.name)
        if info is None:
            catalog['exceptions'].append({'kind': 'untracked_project', 'filename': source.name})
            continue
        project_record = {'id': info['project_id'], 'filename': source.name, 'section': info['section'], 'sha256': sha(source), 'plates': []}
        try:
            project = Project(source)
            for p in project.settings.findall('plate'):
                md = meta(p); number = int(md['plater_id'])
                plate_id = f"{info['project_id']}-P{number:02d}"
                directory = out/'plates'/plate_id; directory.mkdir(parents=True, exist_ok=True)
                record = {'id': plate_id, 'number': number, 'name': md.get('plater_name') or f'Plate {number}',
                          'instances': [], 'slice_info': slice_info(project, number)}
                tracked = info.get('tracked_plate_numbers', [x['number'] for x in info.get('plates', [])])
                record['tracking'] = 'tracked' if number in tracked else 'untracked_candidate'
                geometries = []
                for instance in p.findall('model_instance'):
                    im = meta(instance); oid = im['object_id']; index = int(im.get('instance_id','0'))
                    mesh, enabled = project.instance(oid, index)
                    geometries.append(mesh)
                    name = project.names.get(oid, oid)
                    # Wheel project contains split objects: never infer complete-unit quantities.
                    matches = [k['id'] for k in keys if Path(k['source'].replace('\\','/')).name.casefold() == name.casefold()]
                    record['instances'].append({'object_id': oid, 'instance_id': index, 'name': name, 'enabled': enabled,
                                                'part_id': matches[0] if len(matches)==1 else None})
                if not geometries:
                    catalog['exceptions'].append({'kind':'empty_plate', 'id':plate_id})
                    continue
                scene_mesh = trimesh.util.concatenate(geometries)
                # Current archive thumbnail is authoritative for appearance and layout when provided.
                embedded = md.get('thumbnail_file') or f'Metadata/plate_{number}.png'
                if embedded in project.z.namelist():
                    with Image.open(io.BytesIO(project.z.read(embedded))) as im:
                        im.load(); im.convert('RGBA').save(directory/'embedded.png')
                        background = Image.new('RGBA', im.size, BG); background.alpha_composite(im.convert('RGBA'))
                        background.convert('RGB').save(directory/'preview.webp', quality=90, method=6)
                    record['preview_origin'] = 'saved_3mf_thumbnail'
                else:
                    draw_mesh(scene_mesh, directory/'preview.webp', plate=True)
                    record['preview_origin'] = 'reconstructed_3mf_geometry'
                with Image.open(directory/'preview.webp') as im:
                    im.thumbnail((240,240), Image.Resampling.LANCZOS); im.save(directory/'thumbnail.webp', quality=86)
                display = simplify(scene_mesh, 100000)
                display.apply_translation(-display.bounds.mean(axis=0))
                display.visual = trimesh.visual.ColorVisuals(display, vertex_colors=[181,192,202,255])
                display.export(directory/'model.glb')
                for field, file in [('thumbnail','thumbnail.webp'),('preview','preview.webp'),('model','model.glb')]:
                    record[field] = f'plates/{plate_id}/{file}'
                record['source_faces'] = int(len(scene_mesh.faces)); record['display_faces'] = int(len(display.faces))
                record['enabled_instances'] = sum(i['enabled'] for i in record['instances'])
                project_record['plates'].append(record)
                print(f"PLATE {plate_id} {record['name']} ({record['enabled_instances']} enabled instances)", flush=True)
            project.z.close()
        except Exception as e:
            catalog['exceptions'].append({'kind':'project_error', 'filename':source.name, 'error':str(e)})
            print(f'ERROR PROJECT {source.name}: {e}', flush=True)
        catalog['projects'].append(project_record)
        write_json(out/'catalog.json', catalog)
    make_sheets(catalog, out)
    write_json(out/'catalog.json', catalog)
    print(json.dumps({'parts':len(catalog['parts']), 'plates':sum(len(p['plates']) for p in catalog['projects']), 'exceptions':catalog['exceptions']}, indent=2), flush=True)

if __name__ == '__main__': main()

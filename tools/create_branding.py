"""Package the realistic RGBA truck master into application icons and wordmarks."""
from pathlib import Path
import json
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.python-packages'))
from PIL import Image, ImageDraw, ImageFont
OUT = ROOT / 'assets/branding'
MASTER = OUT / 'build-desk-truck-master.png'
if not MASTER.exists():
    raise SystemExit('Missing approved RGBA truck master: ' + str(MASTER))
with Image.open(MASTER) as source:
    source = source.convert('RGBA')
    bounds = source.getchannel('A').getbbox()
    if not bounds:
        raise ValueError('The truck master is fully transparent')
    vehicle = source.crop(bounds)

def icon(size):
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    truck = vehicle.copy()
    truck.thumbnail((round(size*.94), round(size*.94)), Image.Resampling.LANCZOS)
    image.alpha_composite(truck, ((size-truck.width)//2, (size-truck.height)//2))
    return image

for size in [32, 64, 128, 192, 256, 512]:
    icon(size).save(OUT / f'icon-{size}.png')
icon(512).save(OUT / 'build-desk-mark.png')
icon(180).save(OUT / 'apple-touch-icon.png')
icon(256).save(OUT / 'favicon.ico', sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
font_path = Path('C:/Windows/Fonts/segoeuib.ttf')
font = ImageFont.truetype(str(font_path), 88) if font_path.exists() else ImageFont.load_default(size=88)
for name, text_color in [('dark', '#edf1f4'), ('light', '#182127')]:
    wordmark = Image.new('RGBA', (900, 256), (0,0,0,0))
    wordmark.alpha_composite(icon(256), (0,0))
    ImageDraw.Draw(wordmark).text((280,75), 'Build Desk', font=font, fill=text_color)
    wordmark.save(OUT / f'wordmark-{name}.png')
(OUT / 'site.webmanifest').write_text(json.dumps({
    'name': 'Build Desk', 'short_name': 'Build Desk',
    'icons': [{'src': f'icon-{size}.png', 'sizes': f'{size}x{size}', 'type': 'image/png'} for size in [192,512]],
    'theme_color': '#182127', 'background_color': '#182127', 'display': 'standalone'
}), encoding='utf-8')
print('Packaged realistic truck icons, favicon and wordmarks.')

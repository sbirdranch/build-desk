"""Original vector truck mark and matching raster application icons."""
from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.python-packages'))
from PIL import Image, ImageDraw, ImageFont

OUT = ROOT / 'assets/branding'
OUT.mkdir(parents=True, exist_ok=True)
YELLOW = '#f7c52b'
INK = '#182127'
# The same points drive SVG and PNG: no raster tracing or external brand artwork.
POLYGONS = [
    [(18,34),(153,34),(137,81),(46,81)],
    [(30,26),(160,26),(156,37),(23,37)],
    [(45,85),(140,85),(161,96),(194,96),(194,108),(45,108)],
    [(177,48),(214,48),(236,81),(238,107),(167,107),(167,70)],
]
WINDOW = [(184,56),(210,56),(225,80),(184,80)]
WHEELS = [(61,108),(115,108),(207,108)]

def mark(size, padded=False):
    scale = size/256
    im = Image.new('RGBA', (size,size), (0,0,0,0))
    d = ImageDraw.Draw(im)
    def points(poly): return [(int(x*scale),int((y+48)*scale)) for x,y in poly]
    for polygon in POLYGONS: d.polygon(points(polygon), fill=YELLOW)
    d.polygon(points(WINDOW), fill=INK)
    for x,y in WHEELS:
        box=lambda r:(int((x-r)*scale),int((y+48-r)*scale),int((x+r)*scale),int((y+48+r)*scale))
        d.ellipse(box(23), fill=INK)
        d.ellipse(box(18), fill=YELLOW)
        d.ellipse(box(10), fill=INK)
    return im

svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-labelledby="title"><title id="title">Build Desk articulated dump truck</title><g transform="translate(0 48)">'
for polygon in POLYGONS:
    svg += '<polygon fill="'+YELLOW+'" points="'+' '.join(f'{x},{y}' for x,y in polygon)+'"/>'
svg += '<polygon fill="'+INK+'" points="'+' '.join(f'{x},{y}' for x,y in WINDOW)+'"/>'
for x,y in WHEELS:
    for radius, color in [(23,INK),(18,YELLOW),(10,INK)]:
        svg += f'<circle cx="{x}" cy="{y}" r="{radius}" fill="{color}"/>'
svg += '</g></svg>'
(OUT/'build-desk-mark.svg').write_text(svg, encoding='utf-8')
high = mark(2048)
for size in [32,64,128,192,256,512]:
    high.resize((size,size),Image.Resampling.LANCZOS).save(OUT/f'icon-{size}.png')
high.resize((180,180),Image.Resampling.LANCZOS).save(OUT/'apple-touch-icon.png')
high.resize((256,256),Image.Resampling.LANCZOS).save(OUT/'favicon.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
font_path = Path('C:/Windows/Fonts/segoeuib.ttf')
font = ImageFont.truetype(str(font_path),96) if font_path.exists() else ImageFont.load_default(size=96)
for name, text_color in [('dark','#edf1f4'),('light',INK)]:
    wordmark = Image.new('RGBA',(880,256),(0,0,0,0))
    wordmark.alpha_composite(high.resize((256,256),Image.Resampling.LANCZOS),(0,0))
    ImageDraw.Draw(wordmark).text((280,70),'Build Desk',font=font,fill=text_color)
    wordmark.save(OUT/f'wordmark-{name}.png')
(OUT/'site.webmanifest').write_text('{"name":"Build Desk","short_name":"Build Desk","icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png"}],"theme_color":"#182127","background_color":"#182127","display":"standalone"}',encoding='utf-8')
print(f'Created {len(list(OUT.iterdir()))} branding assets')

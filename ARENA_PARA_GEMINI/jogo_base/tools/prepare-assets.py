"""Optional art preparation; not part of build/deploy. Requires Pillow, numpy, OpenCV."""
from PIL import Image,ImageDraw,ImageFilter
import numpy as np,cv2
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'assets'
ASSETS=p
original=Image.open(p/'referencia-aprovada.png').convert('RGB');im=original.copy()
def patch(box,src):
 x,y,w,h=box
 tile=original.crop((src[0],src[1],src[0]+w,src[1]+h))
 mask=Image.new('L',(w,h));d=ImageDraw.Draw(mask);d.rectangle((2,2,w-3,h-3),fill=255)
 mask=mask.filter(ImageFilter.GaussianBlur(1))
 im.paste(tile,(x,y),mask)
patch((619,509,44,88),(570,509))
patch((910,652,42,60),(958,652))
# The small indoor attendants and distant people remain painted decoration.
# The central line is rebuilt from real simulated visitors.
for box in [(686,694,32,43),(674,714,35,49),(659,738,38,49),(638,762,38,50)]:
 patch(box,(475,box[1]))
im.save(p/'arena-cenario.png',optimize=True)
# Camera variant without flattened frame UI. Only peripheral areas are affected;
# desktop overview keeps the exact reference frame beneath the live HTML HUD.
mask=np.zeros((960,1536),np.uint8)
for x,y,w,h in [(21,7,269,96),(26,113,305,302),(1176,7,270,92),(1444,16,79,78),(1241,100,280,73),(17,767,283,186),(1300,762,225,192)]:
 cv2.rectangle(mask,(x,y),(x+w,y+h),255,-1)
a=cv2.inpaint(cv2.cvtColor(np.array(im),cv2.COLOR_RGB2BGR),mask,7,cv2.INPAINT_TELEA)
Image.fromarray(cv2.cvtColor(a,cv2.COLOR_BGR2RGB)).save(p/'arena-mapa.png',optimize=True)
print('Frame now preserves original source artwork; dedicated map layer for mobile camera.')

img=original
# Extract the approved character silhouette, preserving the illustration's shading.
box=(621,537,654,590)
sprite=img.crop(box)
poly=[(15,1),(22,2),(26,6),(27,13),(24,18),(23,19),(28,22),(32,37),
      (28,40),(25,38),(27,44),(29,47),(29,50),(23,52),(17,49),(16,39),
      (13,48),(10,51),(4,51),(2,48),(5,43),(7,37),(5,40),(1,38),
      (2,29),(5,23),(10,19),(7,14),(7,7),(10,3)]
alpha=Image.new('L',(sprite.width*4,sprite.height*4));dr=ImageDraw.Draw(alpha)
dr.polygon([(x*4,y*4) for x,y in poly],fill=255)
alpha=alpha.resize(sprite.size,Image.Resampling.LANCZOS)
rgba=sprite.convert('RGBA');rgba.putalpha(alpha)
rgba.save(ASSETS/'gerente.png')
# Jersey variations from the same sprite, not unrelated placeholder stick figures.
rgba_np=np.array(rgba); hsv=cv2.cvtColor(rgba_np[:,:,:3],cv2.COLOR_RGB2HSV)
shirt=(hsv[:,:,0]>80)&(hsv[:,:,0]<115)&(hsv[:,:,1]>65)&(np.indices(hsv.shape[:2])[0]>15)
for name,hue,sat in [('roupeiro',36,175),('torcedor-verde',57,160),('torcedor-roxo',145,135),
                     ('torcedor-dourado',22,205),('atleta-azul',106,200),('atleta-laranja',9,210)]:
    mod=hsv.copy();mod[:,:,0][shirt]=hue;mod[:,:,1][shirt]=sat
    out=rgba_np.copy();out[:,:,:3]=cv2.cvtColor(mod,cv2.COLOR_HSV2RGB)
    Image.fromarray(out).save(ASSETS/(name+'.png'))
rgba.resize((165,265),Image.Resampling.NEAREST).save(ROOT/'qa/sprite-preview.png')
print('Background and 7 sprite variants prepared from the supplied artwork.')

from pathlib import Path
import struct,math,random,zlib
import numpy as np
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]; out=root/'assets/strip';out.mkdir(exist_ok=True)
STAR_TINT=(209,225,255)
def chunk(stream, kind, payload):
 stream.write(struct.pack('>I',len(payload))+kind+payload)
 stream.write(struct.pack('>I',zlib.crc32(kind+payload)&0xffffffff))

def encode(path,frames,count,w,h,fps,palette):
 # Every frame is a w*h buffer of indices into one shared RGBA palette.
 with path.open('wb') as f:
  f.write(b'\x89PNG\r\n\x1a\n');seq=0
  chunk(f,b'IHDR',struct.pack('>IIBBBBB',w,h,8,3,0,0,0));chunk(f,b'PLTE',bytes(c for rgba in palette for c in rgba[:3]));chunk(f,b'tRNS',bytes(rgba[3] for rgba in palette))
  chunk(f,b'acTL',struct.pack('>II',count,0))
  for i,px in enumerate(frames):
   if i==0:
    still=Image.frombytes('P',(w,h),px);still.putpalette([c for rgba in palette for c in rgba],'RGBA')
    still.convert('RGBA').save(path.with_name(path.stem+'-still.png'),optimize=True)
   payload=zlib.compress(b''.join(b'\0'+px[y*w:(y+1)*w] for y in range(h)),9)
   chunk(f,b'fcTL',struct.pack('>IIIIIHHBB',seq,w,h,0,0,1,fps,0,0));seq+=1
   if i==0:chunk(f,b'IDAT',payload)
   else:chunk(f,b'fdAT',struct.pack('>I',seq)+payload);seq+=1
  chunk(f,b'IEND',b'')
 print(path.name,flush=True)

def retime(src,dest,factor):
 # Slow variants are the same frames with longer delays. Firefox ignores multi-megabyte data: URLs
 # in theme.update, so they cannot be derived at runtime and must ship as files.
 data=src.read_bytes();pos=8
 with dest.open('wb') as f:
  f.write(data[:8])
  while pos<len(data):
   n=struct.unpack('>I',data[pos:pos+4])[0];kind=data[pos+4:pos+8];payload=data[pos+8:pos+8+n]
   if kind==b'fcTL':
    values=list(struct.unpack('>IIIIIHHBB',payload));values[5]*=factor;payload=struct.pack('>IIIIIHHBB',*values)
   chunk(f,kind,payload);pos+=n+12

def galaxy_layer(galaxy,angle):
 frame=Image.new('RGBA',(800,160));rot=galaxy.rotate(-angle,Image.Resampling.BICUBIC,expand=True);frame.alpha_composite(rot,(400-rot.width//2,48-rot.height//2))
 return np.asarray(frame.resize((400,80),Image.Resampling.LANCZOS)).reshape(-1,4)
def galaxy_palette(galaxy):
 # Index 0 is transparent; 1-255 come from the galaxy at sample angles.
 samples=np.concatenate([galaxy_layer(galaxy,angle) for angle in range(0,360,10)]);opaque=samples[samples[:,3]>=8]
 colors=Image.fromarray(np.ascontiguousarray(opaque.reshape(1,-1,4)),'RGBA').quantize(255,method=Image.Quantize.FASTOCTREE).getpalette('RGBA')[:255*4]
 entries=[tuple(colors[i:i+4]) for i in range(0,len(colors),4)]
 return [(0,0,0,0)]+entries+[(0,0,0,0)]*(255-len(entries))
art=Image.open(root/'assets/galaxy.png').convert('RGBA')
for size in (48,72,96):
 galaxy=art.resize((size*2,size*2),Image.Resampling.LANCZOS);palette=galaxy_palette(galaxy)
 def frames():
  table=np.array(palette[1:],dtype=np.float32);weights=np.array([1,1,1,1.5],dtype=np.float32)
  for i in range(1125):
   pixels=galaxy_layer(galaxy,360*i/1125);indices=np.zeros(len(pixels),dtype=np.uint8);visible=pixels[:,3]>=8
   distance=(((pixels[visible].astype(np.float32)[:,None,:]-table[None,:,:])*weights)**2).sum(axis=2);indices[visible]=distance.argmin(axis=1)+1
   yield indices.tobytes()
 encode(out/f'galaxy-{size}.png',frames(),1125,400,80,25,palette);retime(out/f'galaxy-{size}.png',out/f'galaxy-{size}-slow.png',2)
rng=random.Random(73421);stars=[(rng.uniform(-2020,540),rng.uniform(-24,56),rng.random(),rng.uniform(.5,1.4),rng.random()<.32,rng.random()*math.tau) for i in range(1300)]
for preset,number,twinkle in [('gentle',850,True),('rich',1300,True),('steady',850,False)]:
 def frames():
  for i in range(1125):
   frame=Image.new('RGBA',(2560,80));draw=ImageDraw.Draw(frame)
   for dx,dy,phase,r,tw,offset in stars[:number]:
    p=(phase+i/1125)%1;scale=.025*80**p;x=2020+dx*scale;y=24+dy*scale
    if x<0 or x>2560 or y<0 or y>80:continue
    pulse=.72+.28*math.sin(math.tau*15*i/1125+offset) if tw and twinkle else 1
    a=round(255*min(1,p*8)*min(1,(1-p)*10)*(.24+.7*p)*pulse);radius=r*(.32+.9*p)
    draw.ellipse((x-radius,y-radius,x+radius,y+radius),fill=(209,225,255,a))
   yield frame.getchannel('A').tobytes()
 # One tint for every star, so the palette is that tint at each of 256 alpha levels.
 encode(out/f'stars-{preset}.png',frames(),1125,2560,80,25,[(*STAR_TINT,a) for a in range(256)]);retime(out/f'stars-{preset}.png',out/f'stars-{preset}-slow.png',2)

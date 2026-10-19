from pathlib import Path
import io,struct,math,random,zlib
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]; out=root/'assets/strip';out.mkdir(exist_ok=True)
def chunk(stream, kind, payload):
 stream.write(struct.pack('>I',len(payload))+kind+payload)
 stream.write(struct.pack('>I',zlib.crc32(kind+payload)&0xffffffff))

def encode(path,frames,count,w,h,fps):
 with path.open('wb') as f:
  f.write(b'\x89PNG\r\n\x1a\n');chunk(f,b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0));chunk(f,b'acTL',struct.pack('>II',count,0));seq=0
  for i,frame in enumerate(frames):
   if i==0:frame.save(path.with_name(path.stem+'-still.png'))
   b=io.BytesIO();frame.save(b,format='PNG',compress_level=3);data=b.getvalue();pos=8;parts=[]
   while pos<len(data):
    n=struct.unpack('>I',data[pos:pos+4])[0]
    if data[pos+4:pos+8]==b'IDAT':parts.append(data[pos+8:pos+8+n])
    pos+=n+12
   chunk(f,b'fcTL',struct.pack('>IIIIIHHBB',seq,w,h,0,0,1,fps,0,0));seq+=1
   payload=b''.join(parts)
   if i==0:chunk(f,b'IDAT',payload)
   else:chunk(f,b'fdAT',struct.pack('>I',seq)+payload);seq+=1
  chunk(f,b'IEND',b'')
 print(path.name,flush=True)

def retime(src,dest,factor):
 data=src.read_bytes();pos=8
 with dest.open('wb') as f:
  f.write(data[:8])
  while pos<len(data):
   n=struct.unpack('>I',data[pos:pos+4])[0];kind=data[pos+4:pos+8];payload=data[pos+8:pos+8+n]
   if kind==b'fcTL':
    values=list(struct.unpack('>IIIIIHHBB',payload));values[5]*=factor;payload=struct.pack('>IIIIIHHBB',*values)
   chunk(f,kind,payload);pos+=n+12

art=Image.open(root/'assets/galaxy.png').convert('RGBA')
for size in (48,72,96):
 def frames():
  galaxy=art.resize((size*2,size*2),Image.Resampling.LANCZOS)
  for i in range(1125):
   frame=Image.new('RGBA',(800,160));rot=galaxy.rotate(-360*i/1125,Image.Resampling.BICUBIC,expand=True);frame.alpha_composite(rot,(400-rot.width//2,48-rot.height//2));yield frame.resize((400,80),Image.Resampling.LANCZOS)
 path=out/f'galaxy-{size}.png';encode(path,frames(),1125,400,80,25);retime(path,out/f'galaxy-{size}-slow.png',2)
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
   yield frame
 path=out/f'stars-{preset}.png';encode(path,frames(),1125,2560,80,25);retime(path,out/f'stars-{preset}-slow.png',2)

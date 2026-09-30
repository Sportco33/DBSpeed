import numpy as np
from PIL import Image
N=1024
def bruit(seed, beta, fmin=1, fmax=None):
    r=np.random.default_rng(seed)
    f=np.fft.fftfreq(N)*N
    fx,fy=np.meshgrid(f,f); k=np.sqrt(fx**2+fy**2); k[0,0]=1
    amp=k**(-beta); amp[k<fmin]=0
    if fmax: amp[k>fmax]=0
    s=np.fft.ifft2(np.fft.fft2(r.standard_normal((N,N)))*amp).real
    return (s-s.mean())/s.std()
def warp(img, dx, dy):
    y,x=np.mgrid[0:N,0:N]
    return img[(y+dy).astype(int)%N,(x+dx).astype(int)%N]
def hexrgb(h): h=h.lstrip('#'); return np.array([int(h[i:i+2],16) for i in (0,2,4)],float)
def marbre(seed, sombre, moyen, clair, veine='#E9E4DC', out='x.jpg'):
    nuage=bruit(seed,1.6,2)
    tache=bruit(seed+1,1.2,6)
    wx=bruit(seed+2,1.8,1)*40; wy=bruit(seed+3,1.8,1)*40
    # grandes veines : lignes où un bruit doux passe par zéro
    g=warp(bruit(seed+4,2.2,1,40),wx,wy)
    gw=0.035+0.03*(bruit(seed+5,1.5,1)>0.3)   # épaisseur variable
    force=np.clip(0.6+0.5*bruit(seed+6,1.5,1),0,1)  # veines qui s'estompent
    v1=np.exp(-(g/gw)**2)*force
    # halo laiteux autour des grandes veines
    halo=np.exp(-(g/0.25)**2)*force*0.25
    # petites veines fines
    h=warp(bruit(seed+7,1.7,4,200),wx*.5,wy*.5)
    v2=np.exp(-(h/0.03)**2)*np.clip(0.3+0.4*bruit(seed+8,1.4,2),0,1)*0.45
    t=np.clip(0.47+0.2*nuage+0.07*tache,0,1)[...,None]
    S,M,C=hexrgb(sombre),hexrgb(moyen),hexrgb(clair)
    base=np.where(t<0.5, S+(M-S)*(t/0.5), M+(C-M)*((t-0.5)/0.5))
    V=hexrgb(veine)
    a=np.clip(v1*0.72+v2*0.8+halo*0.8,0,1)[...,None]
    img=base*(1-a)+V*a
    img+=np.random.default_rng(seed+9).normal(0,1.6,img.shape)  # grain
    Image.fromarray(np.clip(img,0,255).astype(np.uint8)).save(out,quality=78,optimize=True,progressive=True)
marbre(3,'#0A1411','#18302A','#2E5246',veine='#DCE6E0',out='marbre-vert.jpg')
marbre(11,'#160A0D','#33161D','#5C2A33',veine='#E6D6D8',out='marbre-bordeaux.jpg')

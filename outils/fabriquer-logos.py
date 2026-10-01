#!/usr/bin/env python3
"""
DBSpeed — fabrique les logos (médaille) en SVG animé, dans les 4 styles :
  officiel (or + vert, couleurs du site), tron (noir + néon bleu),
  marbre (marbre blanc + or), feu.

Les lettres sont transformées en tracés (plus de police à charger) :
le logo est identique sur tous les écrans, même affiché comme une image.

Sorties (dans public/logos/) :
  <style>.svg        médaille complète (avec « CHRONOMÉTRAGE · BMX RACE »)
  <style>-icone.svg  version simple pour les petites tailles (icône de l'appli)

Les icônes PNG (écran d'accueil du téléphone) sont faites ensuite par
outils/fabriquer-icones.mjs à partir de ces SVG.

Il faut les polices en .ttf (pas woff2) : elles sont dans l'historique Git
(public/app/polices/BigShouldersDisplay-Variable.ttf et Barlow-SemiBold.ttf).
Utilisation : python3 outils/fabriquer-logos.py <dossier des .ttf>
"""
import math
import sys
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

DOSSIER_POLICES = Path(sys.argv[1] if len(sys.argv) > 1 else "polices")
SORTIE = Path(__file__).resolve().parent.parent / "public" / "logos"


def police(nom, poids=None):
    f = TTFont(DOSSIER_POLICES / nom)
    if poids is not None and "fvar" in f:
        f = instantiateVariableFont(f, {"wght": poids})
    return f


TITRE = police("BigShouldersDisplay-Variable.ttf", 900)
TEXTE = police("Barlow-SemiBold.ttf")


def r(x):
    return f"{x:.2f}".rstrip("0").rstrip(".")


def glyphe(f, car, taille, x=0.0, y=0.0, rot=0.0, cx=0.0):
    """Tracé d'une lettre : ligne de base en (x, y), tournée de rot degrés
    autour de ce point, décalée de -cx (pour centrer la lettre)."""
    gs = f.getGlyphSet()
    nom = f.getBestCmap()[ord(car)]
    s = taille / f["head"].unitsPerEm
    a = math.radians(rot)
    ca, sa = math.cos(a), math.sin(a)
    # point (u, v) de la police → (s*u - cx, -s*v) → rotation → translation
    m = (s * ca, s * sa, s * sa, -s * ca, x - cx * ca, y - cx * sa)
    pen = SVGPathPen(gs, ntos=r)
    gs[nom].draw(TransformPen(pen, m))
    return pen.getCommands(), gs[nom].width * s


def avance(f, car, taille):
    return f.getGlyphSet()[f.getBestCmap()[ord(car)]].width * taille / f["head"].unitsPerEm


def mot(f, texte, taille, centre_x, base_y, espace=0.0):
    larg = sum(avance(f, c, taille) for c in texte) + espace * (len(texte) - 1)
    x = centre_x - larg / 2
    d = []
    for c in texte:
        p, w = glyphe(f, c, taille, x, base_y)
        d.append(p)
        x += w + espace
    return " ".join(d)


def arc(f, texte, taille, rayon, espace, en_haut=True):
    """Texte posé sur un cercle (centre 150,150), lettres droites et centrées."""
    avs = [avance(f, c, taille) for c in texte]
    total = sum(avs) + espace * (len(texte) - 1)
    d, s = [], 0.0
    for c, w in zip(texte, avs):
        milieu = s + w / 2
        if en_haut:
            th = -math.pi / 2 + (milieu - total / 2) / rayon
            rot = math.degrees(th) + 90
        else:
            th = math.pi / 2 + (total / 2 - milieu) / rayon
            rot = math.degrees(th) - 90
        x, y = 150 + rayon * math.cos(th), 150 + rayon * math.sin(th)
        if c != " ":
            p, _ = glyphe(f, c, taille, x, y, rot, w / 2)
            d.append(p)
        s += w + espace
    return " ".join(d)


# ---------- Formes communes ----------
DB_GRAND = mot(TITRE, "DB", 128, 156, 196, -2)      # médaille complète
DB_ICONE = mot(TITRE, "DB", 150, 158, 206, -2)      # icône (plus gros)
ARC_HAUT = arc(TEXTE, "CHRONOMÉTRAGE", 13, 124, 5, True)
ARC_BAS = arc(TEXTE, "BMX RACE", 13, 140, 5, False)


def graduations(r1=104, r2=111, r_grand=100):
    d = []
    for i in range(60):
        a = math.radians(i * 6)
        ri = r_grand if i % 5 == 0 else r1
        d.append(f"M{r(150 + ri * math.cos(a))} {r(150 + ri * math.sin(a))}"
                 f"L{r(150 + r2 * math.cos(a))} {r(150 + r2 * math.sin(a))}")
    return "".join(d)


GRAD = graduations()
LOSANGES = "M18 144 24 150 18 156 12 150Z M282 144 288 150 282 156 276 150Z"
SOULIGNE = "M98 214H140 M160 214H202"
LOSANGE_BAS = "M150 209 155 214 150 219 145 214Z"

OR_METAL = [("0", "#5E4518"), (".1", "#9A7228"), (".22", "#E2C06E"), (".3", "#FFF6D8"),
            (".4", "#D4A63A"), (".52", "#9A7228"), (".62", "#D4A63A"), (".72", "#FFF1C4"),
            (".8", "#E2C06E"), (".9", "#9A7228"), ("1", "#5E4518")]


def degrade_lettres(id_, arrets):
    """Dégradé calé sur la forme remplie (pour les lettres DB)."""
    s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in arrets)
    return f'<linearGradient id="{id_}" x1="0" y1="0" x2="1" y2="1">{s}</linearGradient>'


def degrade(id_, arrets, x1="0", y1="0", x2="1", y2="1"):
    s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in arrets)
    # en coordonnées du dessin (0→300) : marche aussi sur les traits droits
    x1, y1, x2, y2 = (r(float(v) * 300) for v in (x1, y1, x2, y2))
    return (f'<linearGradient id="{id_}" gradientUnits="userSpaceOnUse" '
            f'x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{s}</linearGradient>')


ECLAT_DEFS = ('<linearGradient id="bande" x1="0" y1="0" x2="1" y2="0">'
              '<stop offset="0" stop-color="#fff" stop-opacity="0"/>'
              '<stop offset=".5" stop-color="#fff" stop-opacity=".85"/>'
              '<stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>')

# Animations communes (CSS : elles s'arrêtent si le téléphone demande moins d'animations)
CSS_COMMUN = """
.tour{transform-origin:150px 150px;animation:tour 40s linear infinite}
@keyframes tour{to{transform:rotate(360deg)}}
.eclat{animation:eclat 4.5s cubic-bezier(.45,0,.2,1) infinite}
@keyframes eclat{0%{transform:translateX(-120px) skewX(-20deg)}55%,100%{transform:translateX(330px) skewX(-20deg)}}
.vitesse path{stroke-dasharray:40;animation:vitesse 2.4s cubic-bezier(.2,.7,.2,1) infinite}
.vitesse path:nth-child(2){animation-delay:.12s}.vitesse path:nth-child(3){animation-delay:.24s}
@keyframes vitesse{0%{stroke-dashoffset:40;opacity:0}15%{opacity:1}35%,80%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:-40;opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.eclat{opacity:0}}
"""


def vitesse(icone):
    if icone:
        return "M56 126H88 M66 146H88 M76 166H88"
    return "M62 128H90 M70 146H90 M78 164H90"


def lignes_vitesse(icone, couleur, larg, extra=""):
    ps = vitesse(icone).split(" M")
    ps = [ps[0]] + ["M" + p for p in ps[1:]]
    return (f'<g class="vitesse" fill="none" stroke="{couleur}" stroke-width="{larg}" '
            f'stroke-linecap="round" {extra}>' + "".join(f'<path d="{p}"/>' for p in ps) + "</g>")


def eclat(db):
    return (f'<clipPath id="clipdb"><path d="{db}"/></clipPath>'), (
        '<g clip-path="url(#clipdb)"><rect class="eclat" x="0" y="60" width="70" height="180" '
        'fill="url(#bande)"/></g>')


def svg(contenu, defs, css, titre):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" role="img" '
            f'aria-label="{titre}"><title>{titre}</title><defs>{defs}</defs>'
            f'<style>{CSS_COMMUN}{css}</style>{contenu}</svg>\n')


# ---------- 1. Officiel : or + vert ----------
def officiel(icone):
    db = DB_ICONE if icone else DB_GRAND
    clip, reflet = eclat(db)
    defs = degrade("or", OR_METAL) + degrade_lettres("ordb", OR_METAL) + ECLAT_DEFS + clip
    c = '<circle cx="150" cy="150" r="146" fill="#213B32" stroke="url(#or)" stroke-width="5"/>'
    c += '<circle cx="150" cy="150" r="118" fill="#14241F" stroke="url(#or)" stroke-width="1.6"/>'
    c += f'<path class="tour" d="{GRAD}" stroke="#D4A63A" stroke-opacity=".45" stroke-width="1.2"/>'
    if not icone:
        c += f'<path d="{ARC_HAUT} {ARC_BAS}" fill="#E2C06E"/><path d="{LOSANGES}" fill="#D4A63A"/>'
    c += lignes_vitesse(icone, "#B06B77", 7 if icone else 5)
    c += f'<path d="{db}" fill="url(#ordb)"/>' + reflet
    if not icone:
        c += f'<path d="{SOULIGNE}" stroke="#D4A63A" stroke-width="1.5"/><path d="{LOSANGE_BAS}" fill="#D4A63A"/>'
    return svg(c, defs, "", "Logo DBSpeed")


# ---------- 2. Tron : noir + néon bleu ----------
def tron(icone):
    db = DB_ICONE if icone else DB_GRAND
    cyan = "#3FE6FF"
    defs = ('<filter id="neon" x="-30%" y="-30%" width="160%" height="160%">'
            '<feGaussianBlur stdDeviation="3.2" result="b"/><feMerge>'
            '<feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
            '<filter id="halo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>'
            '<clipPath id="disque"><circle cx="150" cy="150" r="117"/></clipPath>'
            '<linearGradient id="sol" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset=".3" stop-color="#3FE6FF" stop-opacity="0"/>'
            '<stop offset="1" stop-color="#3FE6FF" stop-opacity=".8"/></linearGradient>')
    # sol en perspective (grille Tron) dans le disque
    fuyantes = "".join(f"M150 150L{r(150 + k * 60)} 300" for k in range(-6, 7))
    horiz = "".join(f"M0 {r(150 + 150 * (i / 10) ** 1.8)}H300" for i in range(1, 12))
    c = '<circle cx="150" cy="150" r="146" fill="#02050A"/>'
    c += ('<g clip-path="url(#disque)"><rect width="300" height="300" fill="#000"/>'
          f'<g stroke="url(#sol)" stroke-width="1.3"><path d="{fuyantes}"/>'
          f'<path class="grille" d="{horiz}"/></g></g>')
    c += (f'<g filter="url(#neon)" fill="none" stroke="{cyan}">'
          '<circle cx="150" cy="150" r="146" stroke-width="2.5"/>'
          '<circle cx="150" cy="150" r="118" stroke-width="1.4"/></g>')
    # la moto de lumière qui fait le tour
    c += ('<circle class="moto" cx="150" cy="150" r="146" fill="none" stroke="#E6FDFF" stroke-width="4" '
          'stroke-linecap="round" pathLength="1000" stroke-dasharray="70 930" filter="url(#neon)"/>')
    c += f'<path class="tour" d="{GRAD}" stroke="{cyan}" stroke-opacity=".55" stroke-width="1.1"/>'
    if not icone:
        c += f'<path d="{ARC_HAUT} {ARC_BAS}" fill="#A8F5FF" filter="url(#neon)"/>'
        c += f'<path d="{LOSANGES}" fill="#FF9A1F" filter="url(#neon)"/>'
    c += lignes_vitesse(icone, "#FF9A1F", 6 if icone else 4.5, 'filter="url(#neon)"')
    c += f'<path class="halo" d="{db}" fill="{cyan}" opacity=".35" filter="url(#halo)"/>'
    c += (f'<path class="lettres" d="{db}" fill="#00121A" stroke="{cyan}" stroke-width="3" '
          'stroke-linejoin="round" filter="url(#neon)"/>')
    c += f'<path d="{db}" fill="none" stroke="#E6FDFF" stroke-width=".9" stroke-linejoin="round"/>'
    if not icone:
        c += (f'<g filter="url(#neon)"><path d="{SOULIGNE}" stroke="{cyan}" stroke-width="1.5"/>'
              f'<path d="{LOSANGE_BAS}" fill="#FF9A1F"/></g>')
    css = """
.moto{animation:moto 3.2s linear infinite}
@keyframes moto{to{stroke-dashoffset:-1000}}
.grille{animation:grille 2.4s linear infinite}
@keyframes grille{to{transform:translateY(14px)}}
.lettres,.halo{animation:clignote 6s steps(1) infinite}
@keyframes clignote{0%,100%{opacity:1}71%{opacity:.55}72%{opacity:1}74%{opacity:.7}75%{opacity:1}}
.halo{opacity:.35}
"""
    return svg(c, defs, css, "Logo DBSpeed, néon")


# ---------- 3. Marbre blanc + or ----------
def marbre(icone):
    db = DB_ICONE if icone else DB_GRAND
    clip, reflet = eclat(db)
    defs = (degrade("or", OR_METAL) + degrade_lettres("ordb", OR_METAL) + ECLAT_DEFS + clip +
            '<filter id="veines" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">'
            '<feTurbulence type="turbulence" baseFrequency=".006 .018" numOctaves="5" seed="11"/>'
            '<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -4 0 0 0 1"/>'
            '<feComponentTransfer><feFuncA type="table" tableValues="0 .05 .3 .65 .85"/></feComponentTransfer>'
            '<feComposite in2="SourceGraphic" operator="in"/>'
            '<feColorMatrix type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .54  0 0 0 1 0"/>'
            '<feComposite in2="SourceGraphic" operator="atop"/></filter>'
            '<filter id="veines-or" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">'
            '<feTurbulence type="turbulence" baseFrequency=".011 .03" numOctaves="4" seed="3"/>'
            '<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3.5 0 0 0 1"/>'
            '<feComponentTransfer><feFuncA type="table" tableValues="0 0 0 .3 1"/></feComponentTransfer>'
            '<feComposite in2="SourceGraphic" operator="in"/>'
            '<feColorMatrix type="matrix" values="0 0 0 0 .83  0 0 0 0 .65  0 0 0 0 .23  0 0 0 .8 0"/>'
            '<feComposite in2="SourceGraphic" operator="atop"/></filter>'
            '<radialGradient id="relief" cx=".38" cy=".3" r=".8">'
            '<stop offset="0" stop-color="#fff" stop-opacity=".9"/>'
            '<stop offset=".6" stop-color="#fff" stop-opacity="0"/>'
            '<stop offset="1" stop-color="#5E4518" stop-opacity=".18"/></radialGradient>'
            '<filter id="ombre" x="-20%" y="-20%" width="140%" height="140%">'
            '<feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#5E4518" flood-opacity=".45"/></filter>')
    c = '<circle cx="150" cy="150" r="146" fill="#F4F1EA" filter="url(#veines)"/>'
    c += '<circle cx="150" cy="150" r="146" fill="#FFFFFF" filter="url(#veines-or)" opacity=".9"/>'
    c += '<circle cx="150" cy="150" r="146" fill="url(#relief)"/>'
    c += '<circle cx="150" cy="150" r="143.5" fill="none" stroke="url(#or)" stroke-width="5"/>'
    c += '<circle cx="150" cy="150" r="118" fill="none" stroke="url(#or)" stroke-width="2"/>'
    c += '<circle cx="150" cy="150" r="114" fill="none" stroke="#9A7228" stroke-opacity=".35" stroke-width=".8"/>'
    c += f'<path class="tour" d="{GRAD}" stroke="#9A7228" stroke-opacity=".6" stroke-width="1.2"/>'
    if not icone:
        c += f'<path d="{ARC_HAUT} {ARC_BAS}" fill="#7A5A1E"/><path d="{LOSANGES}" fill="url(#or)"/>'
    c += lignes_vitesse(icone, "url(#or)", 7 if icone else 5, 'filter="url(#ombre)"')
    c += f'<path d="{db}" fill="url(#ordb)" stroke="#5E4518" stroke-width=".8" filter="url(#ombre)"/>' + reflet
    if not icone:
        c += f'<path d="{SOULIGNE}" stroke="url(#or)" stroke-width="1.6"/><path d="{LOSANGE_BAS}" fill="#9A7228"/>'
    # petites étincelles
    etoile = "M0-7C.6-1 1-.6 7 0 1 .6.6 1 0 7-.6 1-1 .6-7 0-1-.6-.6-1 0-7Z"
    for i, (x, y) in enumerate([(214, 94), (92, 214), (226, 196)]):
        c += f'<path class="etincelle e{i}" transform="translate({x} {y})" d="{etoile}" fill="#FFF6D8"/>'
    css = """
.etincelle{transform-box:fill-box;transform-origin:center;opacity:0;animation:brille 4.5s ease-in-out infinite}
.e1{animation-delay:1.5s}.e2{animation-delay:3s}
@keyframes brille{0%,100%{opacity:0;scale:.2}12%{opacity:1;scale:1}26%{opacity:0;scale:.2}}
"""
    return svg(c, defs, css, "Logo DBSpeed, marbre blanc et or")


# ---------- 4. Feu ----------
def feu(icone):
    db = DB_ICONE if icone else DB_GRAND
    defs = (degrade("braise", [("0", "#FFE27A"), (".35", "#FFB020"), (".7", "#FF5A14"), ("1", "#B3160B")],
                    "0", "0", "0", "1") +
            degrade("anneau", [("0", "#FFD23F"), (".5", "#FF6A1A"), ("1", "#B3160B")], "0", "0", "0", "1") +
            '<radialGradient id="flamme" cx=".5" cy=".85" r=".75">'
            '<stop offset="0" stop-color="#FFF3B0"/><stop offset=".25" stop-color="#FFC233"/>'
            '<stop offset=".55" stop-color="#FF6A1A"/><stop offset=".85" stop-color="#C81D0E" stop-opacity=".7"/>'
            '<stop offset="1" stop-color="#C81D0E" stop-opacity="0"/></radialGradient>'
            '<radialGradient id="coeur" cx=".5" cy=".9" r=".7"><stop offset="0" stop-color="#FFFBE0"/>'
            '<stop offset=".4" stop-color="#FFD23F"/><stop offset="1" stop-color="#FF8A1A" stop-opacity="0"/></radialGradient>'
            '<filter id="doux" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>'
            '<filter id="chaleur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6"/></filter>'
            '<radialGradient id="foyer" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="#FF6A1A" stop-opacity=".55"/>'
            '<stop offset="1" stop-color="#FF6A1A" stop-opacity="0"/></radialGradient>')
    # flammes tout autour de la médaille (plus hautes en haut)
    flamme = "M0 0C-14 -10 -16 -30 -6 -48 -4 -36 2 -34 2 -42 4 -54 10 -60 9 -70 20 -52 18 -18 0 0Z"
    fl = fl2 = ""
    n = 22
    for i in range(n):
        ang = -90 + i * 360 / n
        a = math.radians(ang)
        haut = 0.9 + 0.9 * (1 - math.sin(a)) / 2   # plus grandes en haut
        x, y = 150 + 118 * math.cos(a), 150 + 118 * math.sin(a)
        fl += (f'<g transform="translate({r(x)} {r(y)}) rotate({r(ang + 90)}) scale({r(haut)})">'
               f'<path class="f f{i % 4}" d="{flamme}" fill="url(#flamme)"/></g>')
        fl2 += (f'<g transform="translate({r(x)} {r(y)}) rotate({r(ang + 90 + 8)}) scale({r(haut * .6)})">'
                f'<path class="f f{(i + 2) % 4}" d="{flamme}" fill="url(#coeur)"/></g>')
    groupe_med = 'transform="translate(150 166) scale(.7) translate(-150 -150)"'
    c = '<circle cx="150" cy="158" r="150" fill="url(#foyer)"/>'
    c += f'<g filter="url(#doux)" {groupe_med}>{fl}</g>'
    c += f'<g {groupe_med} opacity=".85" style="mix-blend-mode:screen">{fl2}</g>'
    c += f'<g {groupe_med}>'
    c += '<circle cx="150" cy="150" r="146" fill="#2A0E06" stroke="url(#anneau)" stroke-width="5"/>'
    c += '<circle cx="150" cy="150" r="118" fill="#120604" stroke="url(#anneau)" stroke-width="1.6"/>'
    c += f'<path class="tour" d="{GRAD}" stroke="#FF8A2A" stroke-opacity=".5" stroke-width="1.2"/>'
    if not icone:
        c += f'<path d="{ARC_HAUT} {ARC_BAS}" fill="#FFB347"/><path d="{LOSANGES}" fill="#FF6A1A"/>'
    c += lignes_vitesse(icone, "#FF6A1A", 7 if icone else 5)
    c += f'<path class="chaleur" d="{db}" fill="#FF5A14" filter="url(#chaleur)"/>'
    c += f'<path d="{db}" fill="url(#braise)" stroke="#FFE27A" stroke-width=".6" stroke-opacity=".6"/>'
    if not icone:
        c += f'<path d="{SOULIGNE}" stroke="#FF8A2A" stroke-width="1.5"/><path d="{LOSANGE_BAS}" fill="#FFD23F"/>'
    c += '</g>'
    # braises qui montent
    for i, (x, d, t) in enumerate([(70, 0, 2.6), (110, 1.1, 3.1), (150, .5, 2.8), (190, 1.7, 3.3),
                                   (230, .9, 2.7), (95, 2.2, 3.0), (205, 2.6, 2.9)]):
        c += (f'<circle class="braise" cx="{x}" cy="250" r="{1.6 + (i % 3) * .5}" fill="#FFC233" '
              f'style="animation-duration:{t}s;animation-delay:{d}s"/>')
    css = """
.f{transform-box:fill-box;transform-origin:50% 100%;animation:flamme 1.1s ease-in-out infinite alternate}
.f1{animation-duration:.8s;animation-delay:-.3s}.f2{animation-duration:1.3s;animation-delay:-.6s}.f3{animation-duration:.95s;animation-delay:-.2s}
@keyframes flamme{0%{transform:scaleY(.82) skewX(-5deg)}50%{transform:scaleY(1.08) skewX(3deg)}100%{transform:scaleY(.94) skewX(6deg)}}
.chaleur{animation:chaleur 1.6s ease-in-out infinite alternate}
@keyframes chaleur{from{opacity:.35}to{opacity:.85}}
.braise{opacity:0;animation:braise 3s linear infinite}
@keyframes braise{0%{transform:translate(0,0);opacity:0}15%{opacity:1}100%{transform:translate(8px,-240px);opacity:0}}
@media (prefers-reduced-motion:reduce){.chaleur{opacity:.6}}
"""
    return svg(c, defs, css, "Logo DBSpeed, feu")


STYLES = {"officiel": officiel, "tron": tron, "marbre": marbre, "feu": feu}

if __name__ == "__main__":
    SORTIE.mkdir(parents=True, exist_ok=True)
    for nom, f in STYLES.items():
        (SORTIE / f"{nom}.svg").write_text(f(False), encoding="utf-8")
        (SORTIE / f"{nom}-icone.svg").write_text(f(True), encoding="utf-8")
        print(nom, "ok")

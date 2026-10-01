// DBSpeed — fabrique les icônes PNG de l'appli (écran d'accueil du téléphone)
// à partir des logos SVG de public/logos/ (faits par outils/fabriquer-logos.py).
// Utilisation : node outils/fabriquer-icones.mjs   (il faut Playwright)
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { writeFileSync, rmSync } from 'node:fs';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const url = (p) => 'file://' + path.join(racine, p);

const STYLES = {
  officiel: `#14241F url('${url('images/marbre-vert.jpg')}') center / 140% `,
  tron: 'radial-gradient(circle at 50% 50%, #062433 0%, #000 70%)',
  marbre: 'radial-gradient(circle at 35% 30%, #FFFFFF 0%, #EFE9DD 75%)',
  feu: 'radial-gradient(circle at 50% 55%, #3A1206 0%, #0C0503 70%)',
};
const TAILLES = [[180, .9, ''], [192, .9, ''], [512, .9, ''], [512, .74, 'maskable-']];

const navigateur = await chromium.launch();
const page = await navigateur.newPage();
await page.emulateMedia({ reducedMotion: 'reduce' });
for (const [style, fond] of Object.entries(STYLES)) {
  for (const [taille, part, prefixe] of TAILLES) {
    await page.setViewportSize({ width: taille, height: taille });
    const temp = path.join(racine, 'icones', '_temp.html');
    writeFileSync(temp, `<body style="margin:0;width:${taille}px;height:${taille}px;background:${fond};
      display:grid;place-items:center"><img src="${url(`logos/${style}-icone.svg`)}"
      style="width:${part * 100}%;height:${part * 100}%"></body>`);
    await page.goto('file://' + temp);
    await page.waitForTimeout(150);
    rmSync(temp);
    const nom = style === 'officiel' ? `icone-${prefixe}${taille}.png` : `icone-${style}-${prefixe}${taille}.png`;
    await page.screenshot({ path: path.join(racine, 'icones', nom) });
    console.log(nom);
  }
}
await navigateur.close();

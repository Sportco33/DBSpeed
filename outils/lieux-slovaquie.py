"""Fabrique le SQL des lieux réels de Slovaquie (pistes BMX et pump tracks) pour la table public.lieux.
Recherche du 01/10/2026 : sources = sites des clubs, des villes, presse régionale, Trailforks, oma.sk (OpenStreetMap).
Seuls les lieux avec des coordonnées données par une source sont gardés (aucune position devinée).
id « way-… » / « node-… » = le même objet dans OpenStreetMap (les infos s'ajoutent à la piste de la carte) ;
id « dbs-sk-… » = lieu ajouté par DBSpeed (pas trouvé dans OpenStreetMap avec son numéro).
"""
import json, sys

TF = 'https://www.trailforks.com/skillpark/'
OMA = 'https://poi.oma.sk/'
BIKER_O = {'nom': 'biker.sk – pump tracks de l’ouest', 'url': 'https://www.biker.sk/109062/kde-na-zapadnom-slovensku-si-mozete-zajazdit-na-pumptracku-1/'}
BIKER_E = {'nom': 'biker.sk – pump tracks de l’est', 'url': 'https://www.biker.sk/94638/pumptracky-na-slovensku-vychodne-slovensko/'}
TF_SK = {'nom': 'Trailforks – skillparks de Slovaquie', 'url': 'https://www.trailforks.com/region/slovakia/skillparks/'}
MEDVED = {'nom': 'medvedkudajlabku.sk – pump tracks de Bratislava', 'url': 'https://medvedkudajlabku.sk/pumptrack/'}

def s(nom, url):
    return {'nom': nom, 'url': url}

def oma(code):
    return s('OpenStreetMap (oma.sk)', OMA + code)

def tf(code, nom='Trailforks'):
    return s(nom, TF + code + '/')

L = []
def lieu(id, genre, nom, lat, lon, adresse=None, horaires=None, acces=None, trace=None, club=None, club_site=None, sources=()):
    L.append(dict(id=id, genre=genre, nom=nom, latitude=lat, longitude=lon, adresse=adresse, horaires=horaires,
                  acces=acces, trace=trace, club=club, club_site=club_site, sources=list(sources)))

# ======================= PISTES DE BMX RACE =======================
lieu('way-23126138', 'bmx', 'BMX dráha BMX klub Rača', 48.20316625622933, 17.14658026732454,
     adresse='Hečkova 3, 831 51 Bratislava-Rača',
     horaires="Pendant les travaux de la LBG aréna autour de la piste : entraînement seulement après accord avec le club.",
     acces='club',
     trace="417 m, 4 virages à 180° (le premier à gauche) et 14 sauts. Grille de départ pneumatique avec voicebox. Lignes droites et virages modernisés en 2025. Plus de 160 manches de la Coupe de Slovaquie et 26 championnats de Slovaquie courus ici.",
     club='BMX klub Rača (depuis 1985)', club_site='https://bmx-raca.sk',
     sources=[s('BMX klub Rača – la piste', 'https://bmx-raca.sk/new/page/track/'), s('BMX klub Rača – le club', 'https://bmx-raca.sk/new/page/club/'), oma('w23126138'), tf('bmx-ra-a')])
lieu('way-914145616', 'bmx', 'BMX dráha Furča (bikros Košice)', 48.73928699275788, 21.279390049556735,
     adresse='Sídlisko Dargovských hrdinov (Furča), entre Lidické námestie et la rue Benadova, Košice',
     acces='public',
     trace="390 m, 7 virages et 11 groupes de bosses. Butte de départ refaite en 2023 avec une grille de départ ProStar certifiée. Surface recouverte de dolomite. Accueille des manches de la Coupe de Slovaquie et des championnats de Slovaquie.",
     club='BMX Klub Košický šarkaň', club_site='https://www.kosickysarkan.sk',
     sources=[s('BMX Klub Košický šarkaň', 'https://www.kosickysarkan.sk/'), oma('w914145616'), tf('bikros-fur-a'), s('invisiblemag – rouler à Košice', 'https://www.invisiblemag.sk/en/infinite-ways-how-to-bike-in-kosice/')])
lieu('way-488771732', 'bmx', 'BMX dráha BMX TEAM LIPTOV', 49.070848167630764, 19.627670087876776,
     adresse='Vrbica, Liptovský Mikuláš (à côté de la piste cyclable le long du Váh)',
     trace="Une des plus grandes pistes de bikros de Slovaquie. Dans le même parc : un pump track en enrobé de 280 m, des dirts et un pump track d’entraînement.",
     club='BMX TEAM LIPTOV (depuis 1987)', club_site='http://www.bmx-liptov.sk',
     sources=[oma('w488771732'), s('visitliptov – Pumptrack & BMX park', 'https://www.visitliptov.sk/en/interests/pumptrack-bmx-park/'), s('visitliptov – Coupe de Slovaquie 2024', 'https://www.visitliptov.sk/podujatie/slovensky-pohar-bmx-racing-2024/')])
lieu('way-78169544', 'bmx', 'BMX dráha Dunajská Lužná (Bike centrum HENKY Riders)', 48.077380745234684, 17.256076635844458,
     adresse='Rekreačná ulica, Jánošíková, Dunajská Lužná',
     horaires="Entraînements du club (piste fermée au public) : lundi et mercredi, 16 h 30 – 19 h.",
     trace="Surface compactée. Sur le site : pump tracks, dirt park, trial park et école de vélo (dès 3 ans).",
     club='HENKY Riders', club_site='https://henky-riders.webnode.sk',
     sources=[s('HENKY Riders – Bike centrum', 'https://henky-riders.webnode.sk/bike-centrum-henky-riders2/'), oma('w78169544'), tf('bmx-draha-dunajska-lu-na')])

# ======================= PUMP TRACKS – OUEST =======================
P = 'pump'
lieu('dbs-sk-pumppark-petrzalka', P, 'PumpPark Petržalka', 48.121438, 17.124741, adresse='Haanova, Bratislava-Petržalka', acces='public',
     trace="Environ 600 m de lignes en enrobé, dont la « Bambi line » pour les petits. Ouvert en 2021 sur l’ancienne piste de bikros. Éclairé. Casque obligatoire.",
     club='OZ Pedál', club_site='https://pumppark.sk',
     sources=[s('pumppark.sk', 'https://pumppark.sk/'), tf('pumppark-petr-alka'), s('startitup.sk – ouverture', 'https://www.startitup.sk/v-bratislave-otvorili-unikat-aky-nenajdes-nikde-inde-v-strednej-europe-potesi-najma-sportovcov/')])
lieu('way-740310145', P, 'Pedal pumptrack Vrakuňa', 48.147903, 17.203995, adresse='Lesopark Vrakuňa (Brezová / Malodunajská), Bratislava', acces='public',
     trace="75 m, en enrobé depuis 2020 (en terre avant). Pas d’éclairage.", club='OZ Pedál', sources=[oma('w740310145'), tf('pedal-pumptrack-vraku-a'), MEDVED])
lieu('dbs-sk-podunajske-biskupice', P, 'Pump track Podunajské Biskupice', 48.135080, 17.212193, adresse='Latorická, Bratislava-Podunajské Biskupice', acces='public',
     trace="En enrobé, ouvert en 2021. Pas d’éclairage.", sources=[tf('pump-track-podunajske-biskupice'), MEDVED])
lieu('dbs-sk-ruzinov', P, 'Pump track Ružinov', 48.155979, 17.154849, adresse='Bratislava-Ružinov', sources=[tf('pump-track-ruzinov')])
lieu('dbs-sk-dubravka', P, 'Pump track Dúbravka', 48.181964, 17.036317, adresse='Talichova, Bratislava-Dúbravka',
     trace="Petit pump track en enrobé (40 à 50 m d’après le projet).", sources=[tf('pump-track-dubravka'), s('Dúbravka – projet', 'https://www.dubravka.sk/files/documents/novinky/pumptrack-talichova.pdf')])
lieu('dbs-sk-zahorska-bystrica', P, 'Pump track Záhorská Bystrica', 48.235644, 17.039443, adresse='Bratislava-Záhorská Bystrica', trace="En enrobé, ouvert vers 2022.", sources=[tf('pump-track-zahorska-bystrica')])
lieu('dbs-sk-parkitect-raca', P, 'Pump track modulaire Parkitect (Rača)', 48.201144, 17.164544, adresse='Sklabinská, Bratislava-Rača', trace="Pump track modulaire (éléments posés).", sources=[tf('parkitect-modular-pumptrack-bowtie-ra-a')])
lieu('way-1186014862', P, 'Pumptrack Zochova chata – Piesok', 48.382043, 17.275872, adresse='Modra-Piesok, près de l’hôtel Zochova chata',
     horaires="Été : 8 h – 20 h\nHiver : 8 h – 18 h", trace="En enrobé, ouvert en 2017, terrain clôturé. Pas d’éclairage.", sources=[oma('w1186014862'), tf('pumptrack-modrapiesok'), MEDVED])
lieu('way-995397775', P, 'Pumptrack Viničné', 48.267399, 17.308286, adresse='Hlavná 259, Viničné (centre du village)', acces='public',
     trace="Ouvert en 2021, construit par BikeIng. Pas d’éclairage.", sources=[oma('w995397775'), tf('pump-track-vini-ne'), BIKER_O])
lieu('dbs-sk-panssula-bahon', P, 'Panšula Park Báhoň', 48.311540, 17.439325, adresse='Báhoň',
     trace="En enrobé : ligne principale d’environ 100 m et ligne de sauts de 70 m. Ouvert en 2019.", sources=[tf('pansula-park-baho'), BIKER_O])
lieu('dbs-sk-lozorno', P, 'Bike & scooter zóna Lozorno', 48.334909, 17.037682, adresse='Lozorno', trace="100 m en enrobé et un mini skatepark. Ouvert en 2022.", sources=[tf('bike-and-scooter-zona-lozorno'), BIKER_O])
lieu('dbs-sk-stupava', P, 'Pumptrack Stupava (Kaštieľsky park)', 48.279083, 17.048262, adresse='Kaštieľsky park, Stupava', acces='public',
     trace="Petit pump track en terre pour les enfants. Pas d’éclairage.", sources=[tf('pumptrack-stupava'), MEDVED])
lieu('way-766778922', P, 'Pumptrack Malacky', 48.438316, 17.023080, adresse='Na brehu 3, Malacky (près du stade)', sources=[oma('w766778922')])
lieu('way-914199495', P, 'Pump track d’entraînement HENKY Riders', 48.076445, 17.255793, adresse='Jánošíkovská 70, Dunajská Lužná',
     club='HENKY Riders', club_site='https://henky-riders.webnode.sk', sources=[oma('w914199495')])
lieu('dbs-sk-trnava', P, 'Pumptrack Trnava', 48.374594, 17.567054, adresse='Ulica Ludwiga van Beethovena, Trnava', acces='public',
     trace="Grand site de 6 375 m² : ligne principale d’environ 249 m, flowtrack de 198 m, boucle enfants de 87 m, pump bowl et U-ramp. Ouvert en 2023. Casque obligatoire, moins de 12 ans avec un adulte.",
     sources=[s('Ville de Trnava', 'https://www.trnava.sk/aktualita/12739/narocnejsia-draha-velkeho-pumptracku-je-od-dnes-otvorena-pre-skusenejsich-jazdcov'), tf('pump-track-trnava')])
lieu('dbs-sk-lovcice', P, 'BikePark Lovčice', 48.367890, 17.668662, adresse='Dolné Lovčice',
     trace="Terre compactée : petite piste de BMX de 257 m, pump track à 4 boucles et 3 dirts. Ouvert en 2012.", sources=[tf('bikepark-lov-ice'), BIKER_O])
lieu('dbs-sk-dlha', P, 'Pumptrack Motokáry Dlhá', 48.419098, 17.415847, adresse='Site de karting, Dlhá', trace="En enrobé, ouvert en 2021, sur un site de karting privé.", sources=[tf('pumptrack-motokary-dlha'), BIKER_O])
lieu('dbs-sk-dojc', P, 'Pumptrack Dojč', 48.679062, 17.249750, adresse='Dojč', trace="Terre compactée avec virages en béton. Ouvert en 2016.", sources=[tf('pumptrack-doj'), BIKER_O])
lieu('way-1315517662', P, 'Pumptrack Nitra – Mlynárce', 48.316724, 18.043886, adresse='Mlynárce, terrain de RSÚC Nitra (bus 8, 18 et 21)', acces='public',
     horaires="Mars – octobre : 7 h – 21 h\nNovembre – février : 7 h – 19 h",
     trace="En enrobé, aux normes de compétition. Ouvert le 3 mai 2025, construit par BikeIng. Éclairé, sous vidéosurveillance.",
     sources=[s('sita.sk – ouverture', 'https://sita.sk/v-nitre-slavnostne-otvorili-novy-pumptrackovy-areal-draha-ziskala-svojich-fanusikov-hned-v-prvy-den/'), oma('w1315517662')])
lieu('way-1342156261', P, 'Pumptrack Cyklopoint Nitra-Chrenová', 48.314806, 18.104798, adresse='Trieda Andreja Hlinku 57, Nitra', sources=[oma('w1342156261')])
lieu('node-3683556239', P, 'Skillpark HidePumpa (Hidepark)', 48.315058, 18.067506, adresse='Vodná ulica, Nitra', trace="Plusieurs pump tracks, gérés par l’association TRIPTYCH.", sources=[oma('n3683556239'), tf('skillpark-hidepumpa')])
lieu('way-999992384', P, 'Pumptrack Cyklopark Veľké Zálužie', 48.303021, 17.937292, adresse='Cintorínska 26, Veľké Zálužie', sources=[oma('w999992384'), tf('pumptrack-ve-ke-zalu-ie')])
lieu('node-9198004319', P, 'Pumptrack Topoľčany', 48.558847, 18.161771, adresse='Park športovcov, Topoľčany', trace="En enrobé, ouvert en 2021 par la ville.", sources=[oma('n9198004319'), tf('pumptrack-topo--any'), BIKER_O])
lieu('way-999983422', P, 'Pumptrack Topoľčianky', 48.423242, 18.420876, adresse='Športová 17H, Topoľčianky', sources=[oma('w999983422'), tf('skillpark-topo--ianky')])
lieu('node-12576727355', P, 'Pumptrack Trenčín – park pod Juhom', 48.874189, 18.037060, adresse='Pod Juhom 40, Trenčín (à côté de l’aire de jeux Žihadielko)', acces='public',
     horaires="1er avril – 31 octobre : 7 h – 22 h\n1er novembre – 31 mars : 8 h – 19 h",
     trace="Trois niveaux de difficulté et une butte de départ. Ouvert en 2024. Casque obligatoire.",
     sources=[s('Ville de Trenčín – pumptrack', 'https://trencin.sk/pre-obcanov/sport/pumptrack/'), s('OpenStreetMap (oma.sk)', 'https://www.oma.sk/n12576727355?s=poi')])
lieu('dbs-sk-trencin-zlatovce', P, 'Pumptrack Trenčín-Zlatovce', 48.902184, 18.022878, adresse='Zlatovce, Trenčín', trace="Construit par BikeIng.", sources=[tf('pumptrack-zlatovce-by-bikeing')])
lieu('dbs-sk-trencianska-turna', P, 'Pumptrack Trenčianska Turná', 48.847554, 18.008485, adresse='Beckovská 347, Trenčianska Turná', trace="110 m en enrobé, depuis 2017.", sources=[tf('pumptrack-tren-ianska-turna'), BIKER_O])
lieu('dbs-sk-drietoma', P, 'Pumptrack Drietoma', 48.890657, 17.954766, adresse='Drietoma', trace="En enrobé, ouvert en 2022.", sources=[tf('pumptrack-drietoma'), BIKER_O])
lieu('dbs-sk-kalnica', P, 'Pumptrack Kellys Bikepark Kálnica', 48.754109, 17.937732, adresse='Kellys Bikepark, Kálnica', trace="En enrobé, ouvert en 2016 par BikeIng. Accueille le BikeFest chaque année.", sources=[tf('pumptrack-kellys-bikepark-kalnica'), BIKER_O])
lieu('dbs-sk-ivanovce', P, 'Pumptrack Ivanovce', 48.827995, 17.910205, adresse='Ivanovce', trace="En enrobé, ouvert en 2020.", sources=[tf('pumptrack-ivanovce'), BIKER_O])
lieu('way-1071062523', P, 'Pumptrack Selec', 48.793121, 17.985280, adresse='Selec', sources=[oma('w1071062523'), tf('pumptrack-selec')])
lieu('dbs-sk-beckov', P, 'Pumptrack Beckov', 48.793303, 17.898130, adresse='Beckov', trace="Construit par BikeIng.", sources=[tf('pumptrack-beckov-by-bikeing')])
lieu('dbs-sk-bohuslavice', P, 'Pumptrack Bohuslavice', 48.799210, 17.858029, adresse='Bohuslavice', sources=[tf('pumptrack-bohuslavice')])
lieu('dbs-sk-bosaca', P, 'Pumptrack Bošáca', 48.828367, 17.834411, adresse='Bošáca', trace="Terre compactée avec virages en enrobé. Ouvert en 2017.", sources=[tf('pumptrack-bosaca'), BIKER_O])
lieu('dbs-sk-hradok', P, 'Pumptrack MTBiker Hrádok', 48.696122, 17.883282, adresse='Hrádok', trace="En enrobé, ouvert en 2018.", sources=[tf('pumptrack-mtbiker-hradok-5051'), BIKER_O])
lieu('dbs-sk-myjava-dema', P, 'DEMA minibikepark Myjava', 48.756613, 17.571446, adresse='Myjava', trace="Piste BMX / VTT, dirts et pump track pour les enfants.", sources=[tf('dema-minibikepark-myjava')])
lieu('way-1049422636', P, 'Pumptrack Beluša', 49.048595, 18.305682, adresse='Beluša', acces='public', trace="En enrobé, ouvert en 2022. Abri, barbecue et parking.", sources=[oma('w1049422636'), tf('pumptrack-belusa'), BIKER_O])
lieu('dbs-sk-dohnany', P, 'Pumptrack Dohňany', 49.155369, 18.279430, adresse='Dohňany', trace="Construit par BikeIng.", sources=[tf('pumptrack-dohnany-by-bikeing')])
lieu('dbs-sk-partizanske', P, 'Pumptrack Partizánske', 48.620182, 18.340763, adresse='Parc municipal, Malé Bielice, Partizánske',
     trace="En enrobé : boucle extérieure de 100 à 130 m (4 virages, 12 bosses) et ligne intérieure de 33 m. Ouvert en 2021, construit par BikeIng.", sources=[tf('pumptrack-7160'), BIKER_O])
lieu('dbs-sk-novaky', P, 'Pumptrack Nováky', 48.717056, 18.542414, adresse='Rastislavova, Nováky', trace="En enrobé (rénové).", sources=[tf('pumptrack-novaky')])

# ======================= PUMP TRACKS – CENTRE ET EST =======================
lieu('dbs-sk-zilina-kia', P, 'KIA Pumptrack Žilina (Vodné dielo)', 49.212264, 18.779127, adresse='Cesta na Mojš 1375, bike park du barrage, Žilina', acces='public',
     trace="180 m en enrobé. Ouvert le 15 juin 2018 (Fondation Kia Slovakia, la ville et Pumptrack Slovakia).",
     sources=[s('teraz.sk – ouverture', 'https://www.teraz.sk/regiony/zilina-v-bike-parku-na-vodnom-diele-ot/331406-clanok.html'), tf('pumptrack--ilina')])
lieu('way-1521455308', P, 'Pumptrack Varín', 49.195376, 18.867684, adresse='Priemyselná, derrière le pont du chemin de fer, Varín', acces='public',
     trace="Deux boucles en enrobé. Ouvert au printemps 2026.", sources=[s('zilinskyvecernik.sk – ouverture', 'https://www.zilinskyvecernik.sk/clanok/vo-varine-otvorili-pumptrackovu-drahu-blizko-noveho-cyklochodnika/16788/'), oma('w1521455308')])
lieu('way-1023290794', P, 'Pumptrack Horný Hričov', 49.259189, 18.662608, adresse='Horný Hričov', acces='public', trace="Construit par BikeIng.", sources=[oma('w1023290794')])
lieu('way-684547321', P, 'Pumptrack pod Hríbom (Raková)', 49.446983, 18.745066, adresse='Chata pod Hríbom, Raková', trace="Petit pump track en triangle (environ 20 m).", sources=[oma('w684547321')])
lieu('way-767855502', P, 'KIA Pumptrack Martin – Pltníky', 49.089309, 18.923418, adresse='Šport park Pltníky, Pltníky 25, Martin',
     horaires="Horaires du parc : lundi – vendredi 10 h – 21 h, samedi – dimanche 8 h – 20 h", trace="En enrobé, construit par Pumptrack.sk avec la Fondation Kia.",
     sources=[oma('w767855502'), tf('pumptrack-martin')])
lieu('dbs-sk-zabokreky', P, 'Pumptrack Žabokreky', 49.021713, 18.924856, adresse='Žabokreky', sources=[TF_SK])
lieu('way-1076541614', P, 'Pumptrack Oravská Polhora', 49.524009, 19.439370, adresse='Športová 3, Oravská Polhora', trace="Deux pistes en enrobé : 400 m et 100 m. Ouvert en 2018.", sources=[oma('w1076541614')])
lieu('way-996278667', P, 'Pumptrack Zákamenné', 49.382497, 19.283462, adresse='Športová 11, Zákamenné', sources=[oma('w996278667')])
lieu('way-914206731', P, 'Pumptrack & BMX park Liptovský Mikuláš', 49.0714094, 19.6270417, adresse='Vrbica, Liptovský Mikuláš (à côté de la piste de BMX)', acces='public',
     trace="280 m en enrobé, 3 boucles. Ouvert le 25 août 2023, construit par BikeIng. Le plus grand site de pump track du nord de la Slovaquie.",
     sources=[s('visitliptov – Pumptrack & BMX park', 'https://www.visitliptov.sk/en/interests/pumptrack-bmx-park/'), s('teraz.sk – ouverture', 'https://www.teraz.sk/regiony/liptovsky-mikulas-otvoril-najvacs/736798-clanok.html'), oma('w914206731')])
lieu('way-995402549', P, 'Pumptrack Laskomer', 48.747877, 19.116670, adresse='Laskomerská dolina, Podlavice, Banská Bystrica', acces='public',
     trace="Virages en enrobé et lignes droites en gravier, avec une ligne de dirt. Ouvert le 30 juin 2018 par l’association KoLesom (bénévoles).", club='OZ KoLesom',
     sources=[s('mtbiker.sk – ouverture', 'https://www.mtbiker.sk/clanky/10242/pozvanka-novy-pumptrack-v-laskomerskej-doline-oficialne-otvorenie-uz-tuto-sobotu.html'), oma('w995402549')])
lieu('way-1424339264', P, 'Pumptrack Bike Park Mýto pod Ďumbierom', 48.844876, 19.619587, adresse='Mýto pod Ďumbierom', sources=[oma('w1424339264')])
lieu('way-996122338', P, 'Pumptrack Hriňová', 48.572149, 19.525834, adresse='Lúčna 3A, Hriňová (à côté de la piscine d’été)', trace="120 m en enrobé, 2 m de large. Ouvert en 2021.", sources=[oma('w996122338')])
lieu('node-9231212327', P, 'Pumptrack Detva', 48.5479637, 19.4094833, adresse='Dolinky 20, Detva (près du stade de foot)', sources=[oma('n9231212327')])
lieu('dbs-sk-ziar', P, 'Pumptrack Žiar nad Hronom', 48.585386, 18.855561, adresse='Hviezdoslavova 275/19, Žiar nad Hronom', sources=[TF_SK])
lieu('node-10826792900', P, 'Pumptrack Bikepark Žarnovica', 48.4892636, 18.6944668, adresse='Žarnovická Huta, Žarnovica', sources=[oma('n10826792900')])
lieu('way-1155995822', P, 'PUMP track & DIRT park Prešov (Bike Centrum)', 48.990738, 21.260524, adresse='Rusínska 5, Prešov',
     trace="Trois boucles en enrobé (petits, enfants, confirmés). Sur le terrain d’un magasin de vélos avec café.", sources=[oma('w1155995822')])
lieu('way-1171763071', P, 'Pumptrack Veľký Šariš', 49.034978, 21.201929, adresse='Doliny, au bord de la Torysa, Veľký Šariš', trace="350 m² en enrobé et un skatepark. Ouvert en 2021.",
     sources=[s('presovregion.travel', 'https://presovregion.travel/clanok/novy-pumptrack-vo-velkom-sarisi/'), oma('w1171763071')])
lieu('way-981552978', P, 'Pumptrack Humenné', 48.937710, 21.913626, adresse='Osloboditeľov 16, Humenné', acces='public',
     trace="106 m en enrobé. Ouvert en septembre 2021. Éclairé, clôturé, avec parking et fontaine.", sources=[s('kosiceonline.sk – ouverture', 'https://www.kosiceonline.sk/v-humennom-otvorili-treti-pumptrack-na-vychode-slovenska'), oma('w981552978')])
lieu('way-1186016264', P, 'Pumptrack Kežmarok (Zlatná)', 49.160294, 20.447830, adresse='Zone de loisirs Zlatná, près de la piste cyclable, Kežmarok', acces='public',
     trace="Ouvert fin 2017 avec des fonds européens.", sources=[oma('w1186016264')])
lieu('dbs-sk-spisska-bela', P, 'Pumptrack Spišská Belá', 49.195859, 20.438034, adresse='Bike park du Beliansky rybník, Spišská Belá', acces='public',
     horaires='Tous les jours, sans limite d’horaire', trace="183 m en enrobé. Ouvert en 2018, construit par BikeIng.",
     sources=[s('Ville de Spišská Belá', 'https://spisskabela.sk/mesto/aktuality/pumptrack-v-novom-bike-parku-pri-belianskom-rybniku-sa-uz-uziva/'), s('domalenka.sk', 'https://domalenka.sk/atrakcie/pumptrack-spisska-bela')])
lieu('dbs-sk-velka-lomnica', P, 'Bike Park Veľká Lomnica', 49.111295, 20.364250, adresse='Près de la route I/66 et de la piste cyclable, Veľká Lomnica', acces='public',
     trace="Pump track en enrobé et bowl en béton. Ouvert au printemps 2024.", sources=[s('kosiceonline.sk – nouveau bike park', 'https://www.kosiceonline.sk/vo-velkej-lomnici-vznikol-novy-bikepark')])
lieu('way-1250723582', P, 'KSK Pumptrack Košice', 48.700697, 21.242359, adresse='Moldavská cesta 22, derrière le parking du Hornbach, Košice', acces='public',
     trace="129 m par tour en enrobé. Seul pump track homologué UCI en Slovaquie : il accueille une qualification pour les championnats du monde de pump track. Ouvert en juin 2024, construit par Velosolutions.",
     sources=[s('teraz.sk – pump track homologué UCI', 'https://www.teraz.sk/regiony/v-kosiciach-otvorili-pumptrack-s-certif/802673-clanok.html'), oma('w1250723582')])
lieu('node-8514585498', P, 'Pumptrack Drábova (Dirtpark KVP)', 48.7059881, 21.2171851, adresse='Drábova, Košice (KVP)', trace="En enrobé, avec des dirts. Ouvert le 23 avril 2022 (budget participatif).",
     club='OZ Enjoy the Ride', sources=[s('kosicednes.sk – ouverture', 'https://kosicednes.sk/spravy/pumptrack-na-sidlisku-kvp-dnes-caka-oficialne-otvorenie-foto/'), oma('n8514585498')])
lieu('way-1410991600', P, 'Pumptrack Parchovany', 48.747071, 21.713618, adresse='Hlavná 21, parc, Parchovany', trace="Ouvert en juin 2024.", sources=[oma('w1410991600')])

def lit(v):
    if v is None: return 'null'
    if isinstance(v, (int, float)): return repr(v)
    return "'" + str(v).replace("'", "''") + "'"

ids = [x['id'] for x in L]
assert len(ids) == len(set(ids)), 'id en double'
lignes = []
for x in L:
    lignes.append('(' + ', '.join([lit(x['id']), lit(x['genre']), lit(x['nom']), lit(x['latitude']), lit(x['longitude']),
        lit(x['adresse']), lit(x['horaires']), lit(x['acces']), lit(x['trace']), lit(x['club']), lit(x['club_site']),
        lit(json.dumps(x['sources'], ensure_ascii=False)) + '::jsonb']) + ')')
sql = ('insert into public.lieux (id, genre, nom, latitude, longitude, adresse, horaires, acces, trace, club, club_site, sources) values\n'
       + ',\n'.join(lignes) +
       '\non conflict (id) do update set genre = excluded.genre, nom = excluded.nom, latitude = excluded.latitude, longitude = excluded.longitude,'
       ' adresse = excluded.adresse, horaires = excluded.horaires, acces = excluded.acces, trace = excluded.trace, club = excluded.club,'
       ' club_site = excluded.club_site, sources = excluded.sources;\n')
print(sql)
print(f'-- {len(L)} lieux', file=sys.stderr)

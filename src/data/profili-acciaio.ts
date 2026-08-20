/**
 * Sagomario acciaio — profili commerciali per le verifiche elastiche.
 *
 * IPE / HEA / HEB / UPN: valori tabellari (dimensioni e proprietà di
 * sezione) tratti dalle tabelle commerciali correnti (EN 10365), sufficienti
 * al predimensionamento come le altre tabelle NTC di questo repository.
 * Tubi e angolari, invece di un sagomario fisso, usano formule geometriche
 * esatte sulle dimensioni commerciali correnti: coprono qualunque taglia e
 * non richiedono trascrivere migliaia di valori.
 *
 * Convenzioni: h, b, spessori in mm; A in cm²; Ix, Wx (elastico) attorno
 * all'asse forte; Avz = area resistente a taglio (approssimata), in cm².
 * Iy, Wy sono le stesse grandezze attorno all'**asse debole**: per i profili
 * a tabella si ricavano dalla geometria delle ali e dell'anima (senza i
 * raccordi, quindi leggermente a favore di sicurezza), per tubi e angolari
 * dalle stesse formule esatte del rispettivo asse forte.
 *
 * Per l'instabilità flesso-torsionale servono altre grandezze: It
 * (inerzia torsionale, cm⁴), Iw (costante di ingobbamento, cm⁶) e i moduli
 * plastici Wplx/Wply (cm³). Per IPE, HEA, HEB e UPN vengono dal sagomario del
 * foglio `Verifica_aste_acciaio_rev01.xlsm`: It in particolare **non** si
 * ricava dalla geometria a spessore costante, perché i raccordi valgono un
 * 20-30% e trascurarli falserebbe il momento critico. Dove il sagomario non
 * arriva (UPN 50 e 65) si torna alle formule di parete sottile, che stanno
 * sotto al valore vero e quindi sono a favore di sicurezza.
 *
 * Spessori e raccordo (tw, tf, r) stanno nelle proprietà perché servono alla
 * classificazione della sezione: le larghezze da confrontare con i limiti c/t
 * sono quelle **fra i raccordi**, e ignorarli farebbe scendere di classe
 * profili che sono compatti davvero.
 *
 * Imin è l'inerzia principale **minima**: per i doppi T, gli U e i tubi
 * coincide con la minore fra Ix e Iy, per gli angolari a lati uguali no —
 * i loro assi principali sono ruotati di 45°, e la rigidezza laterale vera è
 * Ix − |Ixy|, sensibilmente più bassa di Iy. È il valore con cui va calcolato
 * il momento critico.
 */

export interface ProprietaProfilo {
  h: number;
  b: number;
  A: number;
  Ix: number;
  Wx: number;
  Avz: number;
  /** Momento d'inerzia attorno all'asse debole (cm⁴). */
  Iy: number;
  /** Modulo di resistenza elastico attorno all'asse debole (cm³). */
  Wy: number;
  /** Area resistente a taglio per forza parallela all'asse forte (cm²). */
  Avy: number;
  /** Momento d'inerzia torsionale primario (cm⁴). */
  It: number;
  /** Costante di ingobbamento (cm⁶). */
  Iw: number;
  /** Modulo resistente plastico attorno all'asse forte (cm³). */
  Wplx: number;
  /** Modulo resistente plastico attorno all'asse debole (cm³). */
  Wply: number;
  /** Inerzia principale minima (cm⁴) — la rigidezza laterale vera. */
  Imin: number;
  /** Spessore dell'anima, o della parete per tubi e angolari (mm). */
  tw: number;
  /** Spessore dell'ala, o della parete per tubi e angolari (mm). */
  tf: number;
  /** Raggio di raccordo fra anima e ala (mm); 0 dove non c'è. */
  r: number;
}

/** Asse di flessione del profilo: come è ruotato rispetto al carico. */
export type AsseProfilo = 'forte' | 'debole';

/**
 * Proprietà viste dall'asse scelto: ruotare il profilo di 90° vuol dire
 * scambiare (Ix, Wx, Avz) con (Iy, Wy, Avy) e, per la geometria, h con b.
 */
export function propretaSecondoAsse(p: ProprietaProfilo, asse: AsseProfilo): ProprietaProfilo {
  if (asse === 'forte') return p;
  // It, Iw, Imin e gli spessori non dipendono da come si guarda il profilo:
  // restano dove sono
  return {
    ...p,
    h: p.b,
    b: p.h,
    Ix: p.Iy,
    Wx: p.Wy,
    Iy: p.Ix,
    Wy: p.Wx,
    Avz: p.Avy,
    Avy: p.Avz,
    Wplx: p.Wply,
    Wply: p.Wplx,
  };
}

export type TipoProfilo =
  | 'IPE'
  | 'HEA'
  | 'HEB'
  | 'UPN'
  | 'ANGOLARE'
  | 'TUBO_QUADRO'
  | 'TUBO_RETT'
  | 'TUBO_TONDO';

export const TIPI_PROFILO: { id: TipoProfilo; label: string }[] = [
  { id: 'IPE', label: 'IPE' },
  { id: 'HEA', label: 'HEA' },
  { id: 'HEB', label: 'HEB' },
  { id: 'UPN', label: 'UPN' },
  { id: 'ANGOLARE', label: 'Angolare a lati uguali' },
  { id: 'TUBO_QUADRO', label: 'Tubo quadro' },
  { id: 'TUBO_RETT', label: 'Tubo rettangolare' },
  { id: 'TUBO_TONDO', label: 'Tubo tondo' },
];

/**
 * h, b, tw (anima), tf (ali), A, Ix, Wx e, dove non basta la geometria, anche
 * Iy e Wy da tabella. Avz ≈ h·tw; Avy ≈ 2·b·tf (le ali sono ciò che resiste
 * al taglio quando il profilo è ruotato).
 */
type RigaIHU = [number, number, number, number, number, number, number, number?, number?];

/**
 * Asse debole di un doppio T, dalla geometria: due ali b×tf più l'anima.
 * Confrontata con le tabelle EN 10365 la differenza è nell'ordine del mezzo
 * per cento (IPE 200: 142.0 contro 142 cm⁴), perché i raccordi stanno vicino
 * all'asse e pesano poco: si può calcolarla invece di trascriverla.
 */
function debolePerDoppioT(h: number, b: number, tw: number, tf: number) {
  const Iy = (2 * (tf * b ** 3) + (h - 2 * tf) * tw ** 3) / 12; // mm⁴
  return { Iy: Iy / 1e4, Wy: b > 0 ? Iy / (b / 2) / 1000 : 0 };
}

/**
 * Quello che la geometria a spessore costante non sa dare: [It (cm⁴),
 * Iw (cm⁶), Wpl,x (cm³), Wpl,y (cm³), r (mm)], dal sagomario del foglio
 * `Verifica_aste_acciaio_rev01.xlsm`. Chi manca (UPN 50 e 65, che il
 * sagomario non riporta) ricade sulle formule di parete sottile qui sotto.
 */
const TABELLA_IHU: Record<string, [number, number, number, number, number]> = {
  'IPE 80': [0.7, 120, 23.22, 5.82, 5],
  'IPE 100': [1.2, 350, 39.41, 9.15, 7],
  'IPE 120': [1.74, 890, 60.73, 13.58, 7],
  'IPE 140': [2.45, 1980, 88.34, 19.25, 7],
  'IPE 160': [3.6, 3960, 123.9, 26.1, 9],
  'IPE 180': [4.79, 7430, 166.4, 34.6, 9],
  'IPE 200': [6.98, 12990, 220.6, 44.61, 12],
  'IPE 220': [9.07, 22670, 285.4, 58.11, 12],
  'IPE 240': [12.88, 37390, 366.6, 73.92, 15],
  'IPE 270': [15.94, 70580, 484, 96.95, 15],
  'IPE 300': [20.12, 125900, 628.4, 125.2, 15],
  'IPE 330': [28.15, 199100, 804.3, 153.7, 18],
  'IPE 360': [37.32, 313600, 1019, 191.1, 18],
  'IPE 400': [51.08, 490000, 1307, 229, 21],
  'IPE 450': [66.87, 791000, 1702, 276.4, 21],
  'IPE 500': [89.29, 1249000, 2194, 335.9, 21],
  'IPE 550': [123.2, 1884000, 2787, 400.5, 24],
  'IPE 600': [165.4, 2846000, 3512, 485.6, 24],
  'HEA 100': [5.24, 2580, 83.01, 41.14, 12],
  'HEA 120': [5.99, 6470, 119.5, 58.85, 12],
  'HEA 140': [8.13, 15060, 173.5, 84.85, 12],
  'HEA 160': [12.19, 31410, 245.1, 117.6, 15],
  'HEA 180': [14.8, 60210, 324.9, 156.5, 15],
  'HEA 200': [20.98, 108000, 429.5, 203.8, 18],
  'HEA 220': [28.46, 193300, 568.5, 270.6, 18],
  'HEA 240': [41.55, 328500, 744.6, 351.7, 21],
  'HEA 260': [52.37, 516400, 919.8, 430.2, 24],
  'HEA 280': [62.1, 785400, 1112, 518.1, 24],
  'HEA 300': [85.17, 1200000, 1383, 641.2, 27],
  'HEA 320': [108, 1512000, 1628, 709.7, 27],
  'HEA 340': [127.2, 1824000, 1850, 755.9, 27],
  'HEA 360': [148.8, 2177000, 2088, 802.3, 27],
  'HEA 400': [189, 2942000, 2562, 872.9, 27],
  'HEA 450': [243.8, 4148000, 3216, 965.5, 27],
  'HEA 500': [309.3, 5643000, 3949, 1059, 27],
  'HEA 550': [351.5, 7189000, 4622, 1107, 27],
  'HEA 600': [397.8, 8978000, 5350, 1156, 27],
  'HEA 650': [448.3, 11030000, 6136, 1205, 27],
  'HEA 700': [513.9, 13350000, 7032, 1257, 27],
  'HEA 800': [596.9, 18290000, 8699, 1312, 30],
  'HEA 900': [736.8, 24960000, 10810, 1414, 30],
  'HEA 1000': [822.4, 32070000, 12820, 1470, 30],
  'HEB 100': [9.25, 3380, 104.2, 51.42, 12],
  'HEB 120': [13.84, 9410, 165.2, 80.97, 12],
  'HEB 140': [20.06, 22480, 245.4, 119.8, 12],
  'HEB 160': [31.24, 47940, 354, 170, 15],
  'HEB 180': [42.16, 93750, 481.4, 231, 15],
  'HEB 200': [59.28, 171100, 642.5, 305.8, 18],
  'HEB 220': [76.57, 295400, 827, 393.9, 18],
  'HEB 240': [102.7, 486900, 1053, 498.4, 21],
  'HEB 260': [123.8, 753700, 1283, 602.2, 24],
  'HEB 280': [143.7, 1130000, 1534, 717.6, 24],
  'HEB 300': [185, 1688000, 1869, 870.1, 27],
  'HEB 320': [225.1, 2069000, 2149, 939.1, 27],
  'HEB 340': [257.2, 2454000, 2408, 985.7, 27],
  'HEB 360': [292.5, 2883000, 2683, 1032, 27],
  'HEB 400': [355.7, 3817000, 3232, 1104, 27],
  'HEB 450': [440.5, 5258000, 3982, 1198, 27],
  'HEB 500': [538.4, 7018000, 4815, 1292, 27],
  'HEB 550': [600.3, 8856000, 5591, 1341, 27],
  'HEB 600': [667.2, 10970000, 6425, 1391, 27],
  'HEB 650': [739.2, 13360000, 7320, 1441, 27],
  'HEB 700': [830.9, 16060000, 8327, 1495, 27],
  'HEB 800': [946, 21840000, 10230, 1553, 30],
  'HEB 900': [1137, 29460000, 12580, 1658, 30],
  'HEB 1000': [1254, 37640000, 14860, 1716, 30],
  'UPN 80': [2.16, 170, 31.8, 12.1, 8],
  'UPN 100': [2.81, 410, 49, 16.2, 8.5],
  'UPN 120': [4.15, 900, 72.6, 21.2, 9],
  'UPN 140': [5.68, 1800, 103, 28.3, 10],
  'UPN 160': [7.39, 3260, 138, 35.2, 10.5],
  'UPN 180': [9.55, 5570, 179, 42.9, 11],
  'UPN 200': [11.9, 9070, 228, 51.8, 11.5],
  'UPN 220': [16, 14600, 292, 64.1, 12.5],
  'UPN 240': [19.7, 22100, 358, 75.7, 13],
  'UPN 260': [25.5, 33300, 442, 91.6, 14],
  'UPN 280': [31, 48500, 532, 109, 15],
  'UPN 300': [37.4, 69100, 632, 130, 16],
  'UPN 320': [66.7, 96100, 826, 152, 17.5],
  'UPN 350': [61.2, 114000, 918, 143, 16],
  'UPN 380': [59.1, 146000, 1014, 148, 16],
  'UPN 400': [81.6, 221000, 1240, 190, 18],
};

/** Forma della sezione a tabella: cambia solo le formule di riserva. */
type FormaIHU = 'doppioT' | 'U';

/**
 * Torsione e ingobbamento dalla sola geometria, per i profili che il
 * sagomario non copre (UPN 50 e 65). It = Σ b·t³/3 ignora i raccordi e sta
 * sotto al valore vero — per un IPE 160 dà 2.8 cm⁴ contro 3.6, cioè a favore
 * di sicurezza, perché abbassa il momento critico.
 *
 * Per l'ingobbamento un doppio T ha Iw = Iz·(h − tf)²/4, ed è preciso (per lo
 * stesso IPE 160: 3967 cm⁶ contro i 3960 di tabella). Un U vale meno, perché
 * le ali stanno tutte da una parte: il rapporto con la stessa formula è 0.67
 * ÷ 0.72 su tutti gli UPN in tabella, e si adotta 0.67, il valore che i
 * profili piccoli — gli unici che passano di qui — mostrano davvero.
 */
function torsioneDaGeometria(h: number, b: number, tw: number, tf: number, Iy: number, forma: FormaIHU) {
  const It = (2 * b * tf ** 3 + (h - 2 * tf) * tw ** 3) / 3; // mm⁴
  const Iw = ((forma === 'U' ? 0.67 : 1) * (Iy * 1e4 * (h - tf) ** 2)) / 4; // mm⁶
  return { It: It / 1e4, Iw: Iw / 1e6 };
}

/**
 * Moduli plastici dalla geometria (senza raccordi), in cm³. Attorno all'asse
 * forte le due forme hanno la stessa espressione (due ali più un'anima);
 * attorno al debole l'asse neutro plastico di un U non passa per il
 * baricentro, e il rapporto Wpl/Wel vale 1.9 su tutti gli UPN in tabella.
 */
function plasticiDaGeometria(h: number, b: number, tw: number, tf: number, Wy: number, forma: FormaIHU) {
  const hw = h - 2 * tf;
  return {
    Wplx: (b * tf * (h - tf) + (tw * hw ** 2) / 4) / 1000,
    Wply: forma === 'U' ? 1.9 * Wy : ((b ** 2 * tf) / 2 + (tw ** 2 * hw) / 4) / 1000,
  };
}

const daTabella = (
  righe: Record<string, RigaIHU>,
  forma: FormaIHU,
): Record<string, ProprietaProfilo> =>
  Object.fromEntries(
    Object.entries(righe).map(([k, [h, b, tw, tf, A, Ix, Wx, IyTab, WyTab]]) => {
      const geom = debolePerDoppioT(h, b, tw, tf);
      const Iy = IyTab ?? geom.Iy;
      const Wy = WyTab ?? geom.Wy;
      const tab = TABELLA_IHU[k];
      const torsGeom = torsioneDaGeometria(h, b, tw, tf, Iy, forma);
      const plGeom = plasticiDaGeometria(h, b, tw, tf, Wy, forma);
      return [
        k,
        {
          h,
          b,
          A,
          Ix,
          Wx,
          Avz: (h * tw) / 100,
          Iy,
          Wy,
          Avy: (2 * b * tf) / 100,
          It: tab?.[0] ?? torsGeom.It,
          Iw: tab?.[1] ?? torsGeom.Iw,
          Wplx: tab?.[2] ?? plGeom.Wplx,
          Wply: tab?.[3] ?? plGeom.Wply,
          // doppi T e U flettono attorno agli assi principali geometrici
          Imin: Math.min(Ix, Iy),
          tw,
          tf,
          // negli UPN il raccordo vale quanto l'ala (DIN 1026-1: r1 = t), ed è
          // la riserva per le due taglie che il sagomario non riporta
          r: tab?.[4] ?? (forma === 'U' ? tf : 0),
        },
      ];
    }),
  );

export const IPE: Record<string, ProprietaProfilo> = daTabella({
  'IPE 80': [80, 46, 3.8, 5.2, 7.64, 80.1, 20.0],
  'IPE 100': [100, 55, 4.1, 5.7, 10.3, 171, 34.2],
  'IPE 120': [120, 64, 4.4, 6.3, 13.2, 318, 53.0],
  'IPE 140': [140, 73, 4.7, 6.9, 16.4, 541, 77.3],
  'IPE 160': [160, 82, 5.0, 7.4, 20.1, 869, 109],
  'IPE 180': [180, 91, 5.3, 8.0, 23.9, 1317, 146],
  'IPE 200': [200, 100, 5.6, 8.5, 28.5, 1943, 194],
  'IPE 220': [220, 110, 5.9, 9.2, 33.4, 2772, 252],
  'IPE 240': [240, 120, 6.2, 9.8, 39.1, 3892, 324],
  'IPE 270': [270, 135, 6.6, 10.2, 45.9, 5790, 429],
  'IPE 300': [300, 150, 7.1, 10.7, 53.8, 8356, 557],
  'IPE 330': [330, 160, 7.5, 11.5, 62.6, 11770, 713],
  'IPE 360': [360, 170, 8.0, 12.7, 72.7, 16270, 904],
  'IPE 400': [400, 180, 8.6, 13.5, 84.5, 23130, 1156],
  'IPE 450': [450, 190, 9.4, 14.6, 98.8, 33740, 1500],
  'IPE 500': [500, 200, 10.2, 16.0, 116, 48200, 1928],
  'IPE 550': [550, 210, 11.1, 17.2, 134, 67120, 2441],
  'IPE 600': [600, 220, 12.0, 19.0, 156, 92080, 3069],
}, 'doppioT');

export const HEA: Record<string, ProprietaProfilo> = daTabella({
  'HEA 100': [96, 100, 5.0, 8.0, 21.2, 349, 72.8],
  'HEA 120': [114, 120, 5.0, 8.0, 25.3, 606, 106],
  'HEA 140': [133, 140, 5.5, 8.5, 31.4, 1033, 155],
  'HEA 160': [152, 160, 6.0, 9.0, 38.8, 1673, 220],
  'HEA 180': [171, 180, 6.0, 9.5, 45.3, 2510, 294],
  'HEA 200': [190, 200, 6.5, 10.0, 53.8, 3692, 389],
  'HEA 220': [210, 220, 7.0, 11.0, 64.3, 5410, 515],
  'HEA 240': [230, 240, 7.5, 12.0, 76.8, 7763, 675],
  'HEA 260': [250, 260, 7.5, 12.5, 86.8, 10450, 836],
  'HEA 280': [270, 280, 8.0, 13.0, 97.3, 13670, 1013],
  'HEA 300': [290, 300, 8.5, 14.0, 112.5, 18260, 1260],
  'HEA 320': [310, 300, 9.0, 15.5, 124.4, 22930, 1479],
  'HEA 340': [330, 300, 9.5, 16.5, 133.5, 27690, 1678],
  'HEA 360': [350, 300, 10.0, 17.5, 142.8, 33090, 1891],
  'HEA 400': [390, 300, 11.0, 19.0, 159, 45070, 2311],
  'HEA 450': [440, 300, 11.5, 21.0, 178, 63720, 2896],
  'HEA 500': [490, 300, 12.0, 23.0, 197.5, 86970, 3550],
  'HEA 550': [540, 300, 12.5, 24.0, 211.8, 111900, 4146],
  'HEA 600': [590, 300, 13.0, 25.0, 226.5, 141200, 4787],
  'HEA 650': [640, 300, 13.5, 26.0, 241.6, 175200, 5474],
  'HEA 700': [690, 300, 14.5, 27.0, 260.5, 215300, 6241],
  'HEA 800': [790, 300, 15.0, 28.0, 285.8, 303400, 7682],
  'HEA 900': [890, 300, 16.0, 30.0, 320.5, 422100, 9485],
  'HEA 1000': [990, 300, 16.5, 31.0, 347.1, 553800, 11190],
}, 'doppioT');

export const HEB: Record<string, ProprietaProfilo> = daTabella({
  'HEB 100': [100, 100, 6.0, 10.0, 26.0, 450, 89.9],
  'HEB 120': [120, 120, 6.5, 11.0, 34.0, 864, 144],
  'HEB 140': [140, 140, 7.0, 12.0, 43.0, 1509, 216],
  'HEB 160': [160, 160, 8.0, 13.0, 54.3, 2492, 311],
  'HEB 180': [180, 180, 8.5, 14.0, 65.3, 3831, 426],
  'HEB 200': [200, 200, 9.0, 15.0, 78.1, 5696, 570],
  'HEB 220': [220, 220, 9.5, 16.0, 91.0, 8091, 736],
  'HEB 240': [240, 240, 10.0, 17.0, 106, 11260, 938],
  'HEB 260': [260, 260, 10.0, 17.5, 118.4, 14920, 1148],
  'HEB 280': [280, 280, 10.5, 18.0, 131.4, 19270, 1376],
  'HEB 300': [300, 300, 11.0, 19.0, 149.1, 25170, 1678],
  'HEB 320': [320, 300, 11.5, 20.5, 161.3, 30820, 1926],
  'HEB 340': [340, 300, 12.0, 21.5, 170.9, 36660, 2156],
  'HEB 360': [360, 300, 12.5, 22.5, 180.6, 43190, 2400],
  'HEB 400': [400, 300, 13.5, 24.0, 197.8, 57680, 2884],
  'HEB 450': [450, 300, 14.0, 26.0, 218, 79890, 3551],
  'HEB 500': [500, 300, 14.5, 28.0, 238.6, 107200, 4287],
  'HEB 550': [550, 300, 15.0, 29.0, 254.1, 136700, 4971],
  'HEB 600': [600, 300, 15.5, 30.0, 270, 171000, 5701],
  'HEB 650': [650, 300, 16.0, 31.0, 286, 210600, 6480],
  'HEB 700': [700, 300, 17.0, 32.0, 306, 256900, 7340],
  'HEB 800': [800, 300, 17.5, 33.0, 334.2, 359100, 8977],
  'HEB 900': [900, 300, 18.5, 35.0, 371.3, 494100, 10980],
  'HEB 1000': [1000, 300, 19.0, 36.0, 400, 644700, 12890],
}, 'doppioT');

/**
 * Gli UPN hanno le ali rastremate: l'asse debole calcolato sulla geometria a
 * spessore costante verrebbe sopravvalutato (~15%), perciò Iy e Wy sono
 * quelli di tabella (DIN 1026-1), riferiti al bordo esterno delle ali.
 */
export const UPN: Record<string, ProprietaProfilo> = daTabella({
  'UPN 50': [50, 38, 5.0, 7.0, 7.12, 26.4, 10.6, 9.12, 3.75],
  'UPN 65': [65, 42, 5.5, 7.5, 9.03, 57.5, 17.7, 14.1, 5.07],
  'UPN 80': [80, 45, 6.0, 8.0, 11.0, 106, 26.5, 19.4, 6.36],
  'UPN 100': [100, 50, 6.0, 8.5, 13.5, 206, 41.2, 29.3, 8.49],
  'UPN 120': [120, 55, 7.0, 9.0, 17.0, 364, 60.7, 43.2, 11.1],
  'UPN 140': [140, 60, 7.0, 10.0, 20.4, 605, 86.4, 62.7, 14.8],
  'UPN 160': [160, 65, 7.5, 10.5, 24.0, 925, 116, 85.3, 18.3],
  'UPN 180': [180, 70, 8.0, 11.0, 28.0, 1350, 150, 114, 22.4],
  'UPN 200': [200, 75, 8.5, 11.5, 32.2, 1910, 191, 148, 27.0],
  'UPN 220': [220, 80, 9.0, 12.5, 37.4, 2690, 245, 197, 33.6],
  'UPN 240': [240, 85, 9.5, 13.0, 42.3, 3600, 300, 248, 39.6],
  'UPN 260': [260, 90, 10.0, 14.0, 48.3, 4820, 371, 317, 47.7],
  'UPN 280': [280, 95, 10.0, 15.0, 53.3, 6280, 448, 399, 57.2],
  'UPN 300': [300, 100, 10.0, 16.0, 58.8, 8030, 535, 495, 67.8],
  'UPN 320': [320, 100, 14.0, 17.5, 75.8, 10870, 679, 597, 80.6],
  'UPN 350': [350, 100, 14.0, 16.0, 77.3, 12840, 734, 570, 75.0],
  'UPN 380': [380, 102, 13.5, 16.0, 80.4, 15760, 829, 615, 78.7],
  'UPN 400': [400, 110, 14.0, 18.0, 91.5, 20350, 1020, 846, 102],
}, 'U');

export const SAGOMARI: Record<'IPE' | 'HEA' | 'HEB' | 'UPN', Record<string, ProprietaProfilo>> = {
  IPE,
  HEA,
  HEB,
  UPN,
};

/* ─────────────────────── angolari e tubi: da geometria ─────────────────── */

/** Taglie commerciali correnti — usate solo per popolare il menù a tendina. */
export const TAGLIE_ANGOLARE = [
  '20x3', '25x3', '30x3', '35x4', '40x4', '45x5', '50x5', '60x6', '65x7', '70x7',
  '75x8', '80x8', '90x9', '100x10', '120x12', '130x12', '150x15', '160x15', '180x18', '200x20',
];

export const TAGLIE_TUBO_QUADRO = [
  '20x2', '25x2.5', '30x3', '40x3', '40x4', '50x3', '50x4', '50x5', '60x4', '60x5',
  '60x6', '70x5', '80x4', '80x5', '80x6', '80x8', '90x6', '100x5', '100x6', '100x8',
  '100x10', '120x6', '120x8', '120x10', '140x6', '140x8', '150x6', '150x8', '150x10',
  '160x8', '160x10', '180x8', '180x10', '200x8', '200x10', '200x12', '250x10', '300x10',
];

export const TAGLIE_TUBO_RETT = [
  '40x20x2', '50x30x3', '60x40x3', '80x40x3', '80x40x4', '100x50x4', '100x60x4',
  '120x60x5', '120x80x5', '140x80x5', '150x100x6', '160x80x6', '180x100x6', '200x100x6',
  '200x120x8', '250x150x8', '300x200x10',
];

export const TAGLIE_TUBO_TONDO = [
  '21.3x2.3', '26.9x2.3', '33.7x2.6', '42.4x2.6', '48.3x2.9', '60.3x2.9', '60.3x3.6',
  '76.1x3.2', '88.9x3.2', '101.6x3.6', '114.3x3.6', '139.7x4', '168.3x4.5', '193.7x5',
  '219.1x6', '244.5x6.3', '273x6.3', '323.9x7.1', '355.6x8', '406.4x8.8', '457x10',
];

/** Angolare a lati uguali b×t: scomposizione in due rettangoli. */
function angolare(b: number, t: number): ProprietaProfilo {
  const a1 = b * t;
  const a2 = (b - t) * t;
  const A = a1 + a2;
  const y1 = b / 2;
  const y2 = t / 2;
  const yBar = A > 0 ? (a1 * y1 + a2 * y2) / A : 0;
  const I1 = (t * b ** 3) / 12 + a1 * (y1 - yBar) ** 2;
  const I2 = ((b - t) * t ** 3) / 12 + a2 * (y2 - yBar) ** 2;
  const Ix = I1 + I2;
  const cMax = Math.max(yBar, b - yBar);
  // gli assi geometrici di un angolare a lati uguali danno Ix = Iy, ma non
  // sono i principali: quelli stanno a 45°, e la rigidezza minima è
  // Ix − |Ixy| (per un L 100×10: 73 cm⁴ contro i 180 degli assi geometrici)
  const Ixy = a1 * (t / 2 - yBar) * (y1 - yBar) + a2 * ((b + t) / 2 - yBar) * (y2 - yBar);
  // asse neutro plastico dentro l'ala orizzontale: yp = A / (2·b)
  const yp = b > 0 ? A / (2 * b) : 0;
  const Wpl =
    (b * yp ** 2) / 2 + (b * (t - yp) ** 2) / 2 + t * (b - t) * ((b + t) / 2 - yp);
  return {
    h: b,
    b,
    A: A / 100,
    Ix: Ix / 10000,
    Wx: cMax > 0 ? Ix / cMax / 1000 : 0,
    Avz: A / 200, // ala reagente a taglio ≈ metà sezione, semplificato
    // a lati uguali le due direzioni principali baricentriche coincidono
    Iy: Ix / 10000,
    Wy: cMax > 0 ? Ix / cMax / 1000 : 0,
    Avy: A / 200,
    // sezione aperta di parete sottile: It = Σ b·t³/3, ingobbamento trascurabile
    It: ((2 * b - t) * t ** 3) / 3 / 10000,
    Iw: 0,
    Wplx: Wpl / 1000,
    Wply: Wpl / 1000,
    Imin: (Ix - Math.abs(Ixy)) / 10000,
    tw: t,
    tf: t,
    r: 0,
  };
}

/** Tubo quadro b×t (spigoli vivi, semplificazione a favore di sicurezza). */
function tuboQuadro(b: number, t: number): ProprietaProfilo {
  const bi = b - 2 * t;
  const A = b ** 2 - Math.max(bi, 0) ** 2;
  const Ix = (b ** 4 - Math.max(bi, 0) ** 4) / 12;
  const Av = (2 * Math.max(bi, 0) * t) / 100;
  const Wpl = (b ** 3 - Math.max(bi, 0) ** 3) / 4;
  // quadro: ruotarlo non cambia niente
  return {
    h: b,
    b,
    A: A / 100,
    Ix: Ix / 10000,
    Wx: Ix / (b / 2) / 1000,
    Avz: Av,
    Iy: Ix / 10000,
    Wy: Ix / (b / 2) / 1000,
    Avy: Av,
    // sezione chiusa: formula di Bredt, It = 4·Am²·t / perimetro medio
    It: (t * (b - t) ** 3) / 10000,
    Iw: 0,
    Wplx: Wpl / 1000,
    Wply: Wpl / 1000,
    Imin: Ix / 10000,
    tw: t,
    tf: t,
    r: 0,
  };
}

/** Tubo rettangolare b×h×t (asse forte = h). */
function tuboRettangolare(b: number, h: number, t: number): ProprietaProfilo {
  const bi = b - 2 * t;
  const hi = h - 2 * t;
  const A = b * h - Math.max(bi, 0) * Math.max(hi, 0);
  const Ix = (b * h ** 3 - Math.max(bi, 0) * Math.max(hi, 0) ** 3) / 12;
  const Iy = (h * b ** 3 - Math.max(hi, 0) * Math.max(bi, 0) ** 3) / 12;
  // Bredt su una sezione scatolare a spessore costante: Am = (b−t)·(h−t)
  const um = b - t + (h - t);
  const It = um > 0 ? (2 * t * (b - t) ** 2 * (h - t) ** 2) / um : 0;
  return {
    h,
    b,
    A: A / 100,
    Ix: Ix / 10000,
    Wx: Ix / (h / 2) / 1000,
    Avz: (2 * Math.max(hi, 0) * t) / 100,
    Iy: Iy / 10000,
    Wy: b > 0 ? Iy / (b / 2) / 1000 : 0,
    Avy: (2 * Math.max(bi, 0) * t) / 100,
    It: It / 10000,
    Iw: 0,
    Wplx: (b * h ** 2 - Math.max(bi, 0) * Math.max(hi, 0) ** 2) / 4 / 1000,
    Wply: (h * b ** 2 - Math.max(hi, 0) * Math.max(bi, 0) ** 2) / 4 / 1000,
    Imin: Math.min(Ix, Iy) / 10000,
    tw: t,
    tf: t,
    r: 0,
  };
}

/** Tubo tondo D×t. */
function tuboTondo(D: number, t: number): ProprietaProfilo {
  const Di = D - 2 * t;
  const A = (Math.PI / 4) * (D ** 2 - Math.max(Di, 0) ** 2);
  const Ix = (Math.PI / 64) * (D ** 4 - Math.max(Di, 0) ** 4);
  const Av = (2 * A) / Math.PI / 100;
  const Wpl = (D ** 3 - Math.max(Di, 0) ** 3) / 6;
  // tondo: qualunque asse è uguale all'altro
  return {
    h: D,
    b: D,
    A: A / 100,
    Ix: Ix / 10000,
    Wx: Ix / (D / 2) / 1000,
    Avz: Av,
    Iy: Ix / 10000,
    Wy: Ix / (D / 2) / 1000,
    Avy: Av,
    // sezione circolare chiusa: It coincide con il momento polare, 2·Ix
    It: (2 * Ix) / 10000,
    Iw: 0,
    Wplx: Wpl / 1000,
    Wply: Wpl / 1000,
    Imin: Ix / 10000,
    tw: t,
    tf: t,
    r: 0,
  };
}

const numeri = (s: string) => s.split('x').map((v) => parseFloat(v));

/** Proprietà di un profilo dato tipo e taglia (chiave del sagomario o dimensioni "b x t"). */
export function proprietaProfilo(tipo: TipoProfilo, taglia: string): ProprietaProfilo | undefined {
  if (tipo === 'IPE' || tipo === 'HEA' || tipo === 'HEB' || tipo === 'UPN') {
    return SAGOMARI[tipo][taglia];
  }
  if (!taglia) return undefined;
  if (tipo === 'ANGOLARE') {
    const [b, t] = numeri(taglia);
    return Number.isFinite(b) && Number.isFinite(t) ? angolare(b, t) : undefined;
  }
  if (tipo === 'TUBO_QUADRO') {
    const [b, t] = numeri(taglia);
    return Number.isFinite(b) && Number.isFinite(t) ? tuboQuadro(b, t) : undefined;
  }
  if (tipo === 'TUBO_RETT') {
    // la sigla commerciale è altezza × larghezza × spessore: 200x100x6 è un
    // tubo alto 200 e largo 100, quindi il primo numero è h, non b
    const [h, b, t] = numeri(taglia);
    return Number.isFinite(b) && Number.isFinite(h) && Number.isFinite(t)
      ? tuboRettangolare(b, h, t)
      : undefined;
  }
  if (tipo === 'TUBO_TONDO') {
    const [D, t] = numeri(taglia);
    return Number.isFinite(D) && Number.isFinite(t) ? tuboTondo(D, t) : undefined;
  }
  return undefined;
}

/** Peso specifico dell'acciaio da carpenteria (kg/m³) — NTC2018 §3.1.2. */
export const PESO_ACCIAIO = 7850;

/**
 * Peso al metro del profilo (kg/m), dall'area della sezione: è il numero con
 * cui si ordina il materiale e si stima il peso proprio della struttura.
 * Confrontato con i sagomari commerciali torna entro il mezzo per cento — la
 * differenza sono i raccordi, che stanno già dentro l'area tabellare.
 */
export function pesoProfilo(p: ProprietaProfilo): number {
  return (p.A / 1e4) * PESO_ACCIAIO;
}

/** Elenco delle taglie disponibili per il menù a tendina, per tipo di profilo. */
export function taglieDisponibili(tipo: TipoProfilo): string[] {
  switch (tipo) {
    case 'IPE':
    case 'HEA':
    case 'HEB':
    case 'UPN':
      return Object.keys(SAGOMARI[tipo]);
    case 'ANGOLARE':
      return TAGLIE_ANGOLARE;
    case 'TUBO_QUADRO':
      return TAGLIE_TUBO_QUADRO;
    case 'TUBO_RETT':
      return TAGLIE_TUBO_RETT;
    case 'TUBO_TONDO':
      return TAGLIE_TUBO_TONDO;
  }
}

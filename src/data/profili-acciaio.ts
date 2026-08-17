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
}

/** Asse di flessione del profilo: come è ruotato rispetto al carico. */
export type AsseProfilo = 'forte' | 'debole';

/**
 * Proprietà viste dall'asse scelto: ruotare il profilo di 90° vuol dire
 * scambiare (Ix, Wx, Avz) con (Iy, Wy, Avy) e, per la geometria, h con b.
 */
export function propretaSecondoAsse(p: ProprietaProfilo, asse: AsseProfilo): ProprietaProfilo {
  if (asse === 'forte') return p;
  return { ...p, h: p.b, b: p.h, Ix: p.Iy, Wx: p.Wy, Iy: p.Ix, Wy: p.Wx, Avz: p.Avy, Avy: p.Avz };
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

const daTabella = (righe: Record<string, RigaIHU>): Record<string, ProprietaProfilo> =>
  Object.fromEntries(
    Object.entries(righe).map(([k, [h, b, tw, tf, A, Ix, Wx, IyTab, WyTab]]) => {
      const geom = debolePerDoppioT(h, b, tw, tf);
      return [
        k,
        {
          h,
          b,
          A,
          Ix,
          Wx,
          Avz: (h * tw) / 100,
          Iy: IyTab ?? geom.Iy,
          Wy: WyTab ?? geom.Wy,
          Avy: (2 * b * tf) / 100,
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
});

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
});

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
});

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
});

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
  };
}

/** Tubo quadro b×t (spigoli vivi, semplificazione a favore di sicurezza). */
function tuboQuadro(b: number, t: number): ProprietaProfilo {
  const bi = b - 2 * t;
  const A = b ** 2 - Math.max(bi, 0) ** 2;
  const Ix = (b ** 4 - Math.max(bi, 0) ** 4) / 12;
  const Av = (2 * Math.max(bi, 0) * t) / 100;
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
  };
}

/** Tubo rettangolare b×h×t (asse forte = h). */
function tuboRettangolare(b: number, h: number, t: number): ProprietaProfilo {
  const bi = b - 2 * t;
  const hi = h - 2 * t;
  const A = b * h - Math.max(bi, 0) * Math.max(hi, 0);
  const Ix = (b * h ** 3 - Math.max(bi, 0) * Math.max(hi, 0) ** 3) / 12;
  const Iy = (h * b ** 3 - Math.max(hi, 0) * Math.max(bi, 0) ** 3) / 12;
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
  };
}

/** Tubo tondo D×t. */
function tuboTondo(D: number, t: number): ProprietaProfilo {
  const Di = D - 2 * t;
  const A = (Math.PI / 4) * (D ** 2 - Math.max(Di, 0) ** 2);
  const Ix = (Math.PI / 64) * (D ** 4 - Math.max(Di, 0) ** 4);
  const Av = (2 * A) / Math.PI / 100;
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

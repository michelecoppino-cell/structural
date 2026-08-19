/**
 * I riferimenti ai prezzari regionali e le voci di partenza della scheda
 * «Stime costi».
 *
 * La stima di costo di un predimensionamento non ha bisogno di un computo
 * vero: ha bisogno di dieci voci giuste, con l'unità di misura giusta e un
 * prezzo dell'ordine di grandezza giusto. Quelle dieci voci stanno qui.
 *
 * Ogni voce porta un campo `codice`, che è il posto dove va trascritto il
 * codice della voce del prezzario da cui si è preso il prezzo — è quello che
 * rende la stima difendibile: chi la rilegge apre il prezzario a quel codice e
 * ritrova lo stesso numero. Il codice non se lo può inventare l'app perché la
 * numerazione dei capitoli cambia a ogni edizione (la stessa voce «scavo di
 * sbancamento» sta a 11.7.CP1.01 nell'edizione 2024 e a 11.6.CP1.01 nella
 * 2025): va letto sull'edizione che si sta usando, dai link qui sotto.
 *
 * I prezzi di serie sono valori indicativi di mercato per il Friuli Venezia
 * Giulia, messi lì perché la scheda parta con dei numeri sensati invece che
 * con degli zeri. Non sono i prezzi del prezzario: prima di mettere la stima
 * in un elaborato si aprono i link, si cerca la voce e si riscrivono prezzo e
 * codice.
 */

/** Un prezzario consultabile, con il link da cui si cercano voci e codici. */
export interface RiferimentoPrezzario {
  id: string;
  /** Sigla breve, quella che va sulla riga ocra. */
  sigla: string;
  titolo: string;
  url: string;
  /** A cosa serve questo link, in una riga. */
  nota: string;
}

export const PREZZARI: RiferimentoPrezzario[] = [
  {
    id: 'fvg2026',
    sigla: 'FVG 2026',
    titolo: 'Prezzario regionale dei lavori pubblici FVG — edizione 2026 (PDF)',
    url: 'https://www.regione.fvg.it/rafvg/export/sites/default/RAFVG/infrastrutture-lavori-pubblici/lavori-pubblici/FOGLIA7/allegati/20260806_Prezzario_Regionale_dei_lavori_Pubblici_FVG_2026.pdf',
    nota: 'Edizione in vigore: è questa la fonte dei prezzi e dei codici da citare.',
  },
  {
    id: 'fvg2025',
    sigla: 'FVG 2025',
    titolo: 'Prezzario FVG 2025 — ricerca online per codice',
    url: 'https://www.regione.fvg.it/rafvg/cms/RAFVG/infrastrutture-lavori-pubblici/lavori-pubblici/prezzario-2025/',
    nota: 'Il 2026 esce solo in PDF: per cercare una voce a schermo, e per leggerne la descrizione per esteso, si usa la ricerca del 2025 e poi si riporta il prezzo dal PDF 2026.',
  },
  {
    id: 'veneto2026',
    sigla: 'Veneto 2026',
    titolo: 'Prezzario regionale Veneto — edizione 2026 (ricerca online)',
    url: 'https://prezzario.regione.veneto.it/?anno=2026',
    nota: "Confronto: utile per i lavori al confine e per pesare una voce che in FVG non c’è.",
  },
];

/** Una voce di partenza della scheda costi. */
export interface VocePrezzario {
  id: string;
  categoria: string;
  /** Codice della voce di prezzario da cui viene il prezzo: da compilare. */
  codice: string;
  descrizione: string;
  um: string;
  quantita: string;
  prezzo: string;
}

/**
 * Le voci di serie: le dieci lavorazioni che compaiono in quasi ogni stima di
 * una struttura, nell'ordine in cui si costruisce (scavi, strutture, opere
 * provvisionali).
 *
 * Le descrizioni ricalcano quelle del prezzario FVG, abbreviate: servono a
 * ritrovare la voce quando si apre il PDF, non a sostituirla.
 */
export const VOCI_COSTO_DEFAULT: VocePrezzario[] = [
  {
    id: 'c1',
    categoria: 'Scavi e movimenti terra',
    codice: '',
    descrizione: 'Scavo di sbancamento a sezione aperta, terreno di qualsiasi natura, fino a 5 m',
    um: 'm³',
    quantita: '350',
    prezzo: '9.50',
  },
  {
    id: 'c2',
    categoria: 'Scavi e movimenti terra',
    codice: '',
    descrizione: 'Scavo a sezione obbligata per fondazioni, terreno di qualsiasi natura, fino a 2 m',
    um: 'm³',
    quantita: '210',
    prezzo: '24.00',
  },
  {
    id: 'c3',
    categoria: 'Scavi e movimenti terra',
    codice: '',
    descrizione: 'Formazione di rilevato/riporto con materiale idoneo, compresi stesa e compattazione',
    um: 'm³',
    quantita: '180',
    prezzo: '14.00',
  },
  {
    id: 'c4',
    categoria: 'Demolizioni',
    codice: '',
    descrizione: 'Demolizione di struttura in c.a. o muratura, con mezzo meccanico, esclusi oneri di discarica',
    um: 'm³',
    quantita: '45',
    prezzo: '120.00',
  },
  {
    id: 'c5',
    categoria: 'Strutture in c.a.',
    codice: '',
    descrizione: 'Calcestruzzo C25/30, classe di esposizione XC2, in opera per fondazioni ed elevazioni',
    um: 'm³',
    quantita: '48',
    prezzo: '175.00',
  },
  {
    id: 'c6',
    categoria: 'Strutture in c.a.',
    codice: '',
    descrizione: 'Acciaio per armature B450C in barre ad aderenza migliorata, sagomato e posto in opera',
    um: 'kg',
    quantita: '5200',
    prezzo: '2.05',
  },
  {
    id: 'c7',
    categoria: 'Strutture in c.a.',
    codice: '',
    descrizione: 'Casseforme per getti in c.a., compresi montaggio, disarmo e disarmante',
    um: 'm²',
    quantita: '320',
    prezzo: '38.00',
  },
  {
    id: 'c8',
    categoria: 'Carpenteria metallica',
    codice: '',
    descrizione: 'Carpenteria metallica S275/S355 in profilati e piatti, lavorata e montata in opera',
    um: 'kg',
    quantita: '8500',
    prezzo: '4.20',
  },
  {
    id: 'c9',
    categoria: 'Carpenteria metallica',
    codice: '',
    descrizione: 'Zincatura a caldo per immersione di carpenteria metallica',
    um: 'kg',
    quantita: '8500',
    prezzo: '0.85',
  },
  {
    id: 'c10',
    categoria: 'Opere provvisionali',
    codice: '',
    descrizione: 'Ponteggio metallico a telai prefabbricati, primo mese compreso montaggio e smontaggio',
    um: 'm²',
    quantita: '260',
    prezzo: '16.00',
  },
];

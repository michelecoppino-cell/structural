/**
 * I riferimenti ai prezzari regionali e le voci di partenza della scheda
 * «Stime costi».
 *
 * La stima di costo di un predimensionamento non ha bisogno di un computo
 * vero: ha bisogno di dieci voci giuste, con l'unità di misura giusta e il
 * prezzo giusto. Quelle dieci voci stanno qui, e i prezzi sono quelli veri —
 * letti sul **Prezzario regionale dei lavori pubblici FVG, edizione 2026/1**
 * (decreto 30 giugno 2026), non stimati.
 *
 * Ogni voce porta il suo `codice`: è quello che rende la stima difendibile,
 * perché chi la rilegge apre il prezzario a quel codice e ritrova lo stesso
 * numero. Il codice va tenuto insieme al prezzo — se si cambia il prezzo a
 * mano senza cambiare il codice, la voce racconta una bugia.
 *
 * Attenzione a non contare due volte. Il prezzario ha, per lo stesso getto,
 * due voci: quella «tutto compreso» (16.5.EQ4.01, che include la casseratura)
 * e quella «con esclusione del cassero» (16.5.EQ4.03). Qui si usa la seconda,
 * perché casseri e armature stanno in due righe loro: sommare la prima con le
 * righe del cassero vorrebbe dire pagare i casseri due volte.
 */

/** Un prezzario consultabile, con il link da cui si cercano voci e codici. */
export interface RiferimentoPrezzario {
  id: string;
  /** Sigla breve, quella che va sul bottone. */
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
    titolo: 'Prezzario regionale dei lavori pubblici FVG — edizione 2026/1 (PDF)',
    url: 'https://www.regione.fvg.it/rafvg/export/sites/default/RAFVG/infrastrutture-lavori-pubblici/lavori-pubblici/FOGLIA7/allegati/20260806_Prezzario_Regionale_dei_lavori_Pubblici_FVG_2026.pdf',
    nota: "Edizione in vigore, ed è da qui che vengono i prezzi e i codici delle voci di partenza.",
  },
  {
    id: 'fvg2025',
    sigla: 'FVG 2025',
    titolo: 'Prezzario FVG 2025 — ricerca online per codice',
    url: 'https://www.regione.fvg.it/rafvg/cms/RAFVG/infrastrutture-lavori-pubblici/lavori-pubblici/prezzario-2025/',
    nota: "Il 2026 esce solo in PDF: per cercare una voce a schermo, e per leggerne la descrizione per esteso, conviene la ricerca del 2025 — la numerazione dei capitoli è la stessa, il prezzo no, quello si riporta dal 2026.",
  },
  {
    id: 'veneto2026',
    sigla: 'Veneto 2026',
    titolo: 'Prezzario regionale Veneto — edizione 2026 (ricerca online)',
    url: 'https://prezzario.regione.veneto.it/?anno=2026',
    nota: "Confronto: utile per i lavori al confine e per pesare una lavorazione che in FVG non ha una voce sua.",
  },
];

/** Una voce di partenza della scheda costi. */
export interface VocePrezzario {
  id: string;
  categoria: string;
  /** Codice della voce di prezzario da cui viene il prezzo. */
  codice: string;
  descrizione: string;
  um: string;
  quantita: string;
  prezzo: string;
}

/**
 * Le voci di serie: le dieci lavorazioni che compaiono in quasi ogni stima di
 * una struttura, nell'ordine in cui si costruisce — scavi, demolizioni,
 * strutture, carpenteria, opere provvisionali.
 *
 * Prezzi e codici sono del prezzario FVG 2026/1. Le quantità no: quelle sono
 * di un cantiere immaginario, e vanno riscritte tutte.
 */
export const VOCI_COSTO_DEFAULT: VocePrezzario[] = [
  {
    id: 'c1',
    categoria: 'Scavi e movimenti terra',
    codice: '11.6.CP1.01.A',
    descrizione:
      "Scavo di sbancamento a sezione aperta fino a 5 m, terreno di qualsiasi natura, anche in presenza d'acqua (tirante fino a 20 cm)",
    um: 'm³',
    quantita: '350',
    prezzo: '10.41',
  },
  {
    id: 'c2',
    categoria: 'Scavi e movimenti terra',
    codice: '11.7.CP1.01.A',
    descrizione:
      "Scavo di fondazione a sezione obbligata, terreno di qualsiasi natura, anche in presenza d'acqua (tirante fino a 20 cm)",
    um: 'm³',
    quantita: '210',
    prezzo: '20.69',
  },
  {
    id: 'c3',
    categoria: 'Scavi e movimenti terra',
    codice: '11.8.CP1.01.A',
    descrizione:
      'Riporti in materiale misto di cava, fornitura e posa, costipamento pari al 95% della densità massima AASHTO',
    um: 'm³',
    quantita: '180',
    prezzo: '44.92',
  },
  {
    id: 'c4',
    categoria: 'Demolizioni',
    codice: '20.1.BQ4.01.B',
    descrizione:
      "Demolizione di strutture in calcestruzzo andante armato, compresi taglio dell'armatura, puntellazioni e calo a terra",
    um: 'm³',
    quantita: '45',
    prezzo: '353.92',
  },
  {
    id: 'c5',
    categoria: 'Strutture in c.a.',
    codice: '16.5.EQ4.03.B',
    descrizione:
      'Getto di fondazione in calcestruzzo C25/30 Rck30 XC2 S4, esclusi i casseri e il ferro di armatura (compensati a parte)',
    um: 'm³',
    quantita: '48',
    prezzo: '240.16',
  },
  {
    id: 'c6',
    categoria: 'Strutture in c.a.',
    codice: '20.3.DH2.01.A',
    descrizione:
      'Acciaio B450C in barre ad aderenza migliorata, sagomato e posto in opera, compresi sfridi, legature e distanziatori',
    um: 'kg',
    quantita: '5200',
    prezzo: '2.02',
  },
  {
    id: 'c7',
    categoria: 'Strutture in c.a.',
    codice: '20.2.RI1.01.A',
    descrizione: 'Casseratura per getti di fondazione, compresi armo, disarmo e disarmante',
    um: 'm²',
    quantita: '320',
    prezzo: '29.54',
  },
  {
    id: 'c8',
    categoria: 'Carpenteria metallica',
    codice: '20.6.HH2.01.A',
    descrizione:
      'Strutture in acciaio primarie in profili laminati a caldo S355J0, manufatti oltre 1500 kg, comprese bullonature, saldature e verniciatura',
    um: 'kg',
    quantita: '8500',
    prezzo: '4.94',
  },
  {
    id: 'c9',
    categoria: 'Carpenteria metallica',
    codice: '20.6.IH2.01.D',
    descrizione: 'Sovrapprezzo per zincatura a caldo della carpenteria metallica',
    um: 'kg',
    quantita: '8500',
    prezzo: '1.50',
  },
  {
    id: 'c10',
    categoria: 'Opere provvisionali',
    codice: '99.3.AH2.15.A',
    descrizione:
      'Ponteggio da costruzione a telai prefabbricati, primo mese, compresi ancoraggi, impalcati, parapetti e sottoponti',
    um: 'm²',
    quantita: '260',
    prezzo: '16.42',
  },
];

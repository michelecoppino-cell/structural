/**
 * I modelli di partenza della Base: schede-tipo da cui nascono le altre.
 *
 * Stanno qui solo per essere **scritti una volta** su OneDrive, nella
 * sottocartella `_modelli/`, quando la Base è ancora vuota. Da lì in poi sono
 * file come gli altri: si correggono, se ne aggiungono, si buttano — e l'app
 * propone quelli che trova nella cartella, non questi. Un tipo di scheda nuovo
 * è un file in più, non una riga di codice in più.
 */
import { CARTELLA_MODELLI } from './schede';

export interface FileIniziale {
  percorso: string;
  testo: string;
}

const SINTESI = `---
titolo: {{titolo}}
area:
tipo: sintesi
stato: da-studiare
tag: []
norme: []
ripasso:
---
# {{titolo}}

> [!sintesi] In tre righe
> Cos'è, a cosa serve, quando conta.

## Riferimenti
- [[NTC 2018 §…]]
- Circolare 2019 §…

## Il concetto
…

## Formule chiave
\`\`\`calcolo
# dati
a = 1 [m]
# risultato
b = 2*a [m]    # cosa rappresenta
\`\`\`

## Errori tipici
- …

## Domande di ripasso
1. …
2. …

## Collegamenti
- [[…]]
`;

const RIASSUNTO = `---
titolo: {{titolo}}
area:
tipo: riassunto
stato: in-corso
fonte:
tag: []
ripasso:
---
# {{titolo}}

**Fonte:** libro, corso, articolo, seminario — con autore e anno.

## Idee principali
1. …
2. …
3. …

## Dettagli che servono davvero
…

## Cosa cambia nel mio lavoro
…

## Domande di ripasso
1. …

## Da approfondire
- [ ] …
`;

const PROCEDURA = `---
titolo: {{titolo}}
area: coordinamento
tipo: procedura
stato: in-corso
tag: []
---
# {{titolo}}

**Scopo:** …
**Quando si usa:** …
**Chi coinvolgere:** …

## Passi
- [ ] …
- [ ] …
- [ ] …

## Documenti in uscita
| Documento | Chi lo prepara | Chi lo approva |
|---|---|---|
| … | … | … |

> [!attenzione] Dove si inciampa
> …
`;

const LEZIONE = `---
titolo: {{titolo}}
area:
tipo: lezione
stato: consolidata
commessa:
data: {{data}}
tag: []
---
# {{titolo}}

## Contesto
Commessa, fase, chi c'era.

## Cosa è successo
…

## Perché
…

## La prossima volta
- …

## Collegamenti
- [[…]]
`;

const DISCIPLINA = `---
titolo: {{titolo}}
area: coordinamento
tipo: disciplina
stato: in-corso
tag: []
norme: []
---
# {{titolo}}

## Cosa fa questa disciplina
…

## Interfacce con le strutture
| Tema | Cosa chiedere | Cosa fornire | Quando |
|---|---|---|---|
| Fori e passaggi | … | … | … |
| Carichi e masse | … | … | … |
| Giunti e tolleranze | … | … | … |

## Checklist di coordinamento
- [ ] …

## Normativa di riferimento
- …
`;

const COME_FUNZIONA = `---
titolo: Come funziona la Base
area: Base tecnica
tipo: guida
stato: consolidata
tag: [base]
---
# Come funziona la Base

Ogni scheda è un file Markdown nella cartella **strutturale/base** del tuo OneDrive.
Si scrive da qui, da qualunque editor (OneDrive web, Obsidian, VS Code) o da Claude
con il connettore «Base tecnica». Un argomento nuovo è un file nuovo: **nessuna riga
di codice**.

## L'intestazione
Fra le due righe \`---\` in testa:

| Campo | A cosa serve |
|---|---|
| \`area\` | lo scaffale: strutture, geotecnica, impianti, coordinamento… quelle che vuoi |
| \`tipo\` | sintesi, riassunto, procedura, lezione, disciplina — o un tipo tuo |
| \`stato\` | da-studiare → in-corso → consolidata |
| \`tag\` | \`[fondazioni, pali]\` |
| \`norme\` | i riferimenti, anche come \`[[NTC 2018 §6.4]]\` nel testo |
| \`ripasso\` | la data dell'ultimo ripasso |

Un campo che l'app non conosce resta nel file e si vede in testa alla scheda.

## Collegamenti
- \`[[Come funziona la Base]]\` porta a un'altra scheda, per titolo o nome del file.
- \`[[NTC 2018 §4.1.2.3]]\` porta alla norma della **Libreria**, se lì c'è una sigla che
  comincia così, e ti dice a che pagina sta il capitolo se l'hai scritto nell'indice.

## Calcoli veri
Un blocco \`calcolo\` si calcola con il motore del Quaderno, unità comprese:

\`\`\`calcolo
# trave appoggiata
q = 25 [kN/m]      # carico distribuito
l = 6 [m]          # luce
M = q*l^2/8 [kNm]  # momento in mezzeria
V = q*l/2 [kN]     # taglio all'appoggio
\`\`\`

Con «Porta nel Quaderno» le righe diventano formule del foglio di calcolo.

## Immagini
Grafici, schemi, screenshot: in modifica si **incollano** (Ctrl+V dopo uno screenshot),
si **trascinano** sul testo o si scelgono col pulsante dell'immagine. Finiscono in
**_allegati/**, ridotte e compresse, e nel testo resta una riga come
\`![Diagramma del momento](_allegati/…webp)\`: quello fra parentesi quadre è la didascalia.

## I pulsanti
Sopra il testo c'è una barra: intestazione (area, tipo, stato, tag, norme, ripasso come
campi di un modulo), titoli, grassetto, elenchi, caselle, collegamenti a schede e norme
scelti da un elenco, blocco di calcolo, tabella, riquadri, linea, immagine. Il testo
resta Markdown: i pulsanti scrivono i segni al posto tuo.

## Caselle e riquadri
- [x] le caselle si spuntano toccandole, e il file si aggiorna
- [ ] i riquadri si scrivono con \`> [!attenzione]\`, \`> [!nota]\`, \`> [!sintesi]\`

> [!attenzione] Dove non si scrive
> Le schede non si cancellano da qui: si cancellano da OneDrive, dove resta anche la
> cronologia delle versioni.

## Modelli
Le schede-tipo stanno in **_modelli/**. Per un tipo nuovo basta un file nuovo lì
dentro: lo proporrà «Nuova scheda». I segnaposto \`{{titolo}}\` e \`{{data}}\` si
riempiono da soli.
`;

/** I file da scrivere la prima volta, quando la Base è vuota. */
export const FILE_INIZIALI: FileIniziale[] = [
  { percorso: `${CARTELLA_MODELLI}/sintesi.md`, testo: SINTESI },
  { percorso: `${CARTELLA_MODELLI}/riassunto.md`, testo: RIASSUNTO },
  { percorso: `${CARTELLA_MODELLI}/procedura.md`, testo: PROCEDURA },
  { percorso: `${CARTELLA_MODELLI}/lezione.md`, testo: LEZIONE },
  { percorso: `${CARTELLA_MODELLI}/disciplina.md`, testo: DISCIPLINA },
  { percorso: 'come-funziona-la-base.md', testo: COME_FUNZIONA },
];

/** Una scheda vuota, per quando non c'è nessun modello. */
export const SCHEDA_VUOTA = `---
titolo: {{titolo}}
area:
tipo:
stato: da-studiare
tag: []
---
# {{titolo}}

`;

/**
 * La barra dei pulsanti sopra il testo di una scheda: i segni del Markdown
 * senza doverli ricordare. Ogni pulsante è una trasformazione di `editor.ts`
 * sul testo e sulla selezione; qui c'è solo dove cliccare.
 *
 * Tre pulsanti aprono un piccolo pannello invece di scrivere subito:
 * l'**intestazione** (area, tipo, stato, tag, norme, ripasso, come campi di un
 * modulo), il **collegamento** a un'altra scheda (si sceglie dall'elenco) e la
 * **norma** (si sceglie dalla Libreria, e si scrive il capitolo).
 */
import { useMemo, useRef, useState, type RefObject } from 'react';
import {
  BookOpenText,
  Calculator,
  CheckSquare,
  Image,
  LinkSimple,
  ListBullets,
  ListNumbers,
  Minus,
  Quotes,
  SlidersHorizontal,
  Table,
  TextB,
  TextHTwo,
  TextHThree,
  TextItalic,
} from '@phosphor-icons/react';
import type { LinkUtente } from '../data/normative';
import {
  aCapoRiga,
  avvolgi,
  BLOCCO_CALCOLO,
  BLOCCO_TABELLA,
  bloccoRiquadro,
  inserisci,
  inserisciBlocco,
  segnoImmagine,
  TIPI_RIQUADRO,
  type Modifica,
} from './editor';
import { impostaCampo, leggiScheda, normalizza, STATI_STUDIO, type Scheda } from './schede';

type Pannello = '' | 'intestazione' | 'collegamento' | 'norma' | 'riquadro';

export interface PropsBarra {
  area: RefObject<HTMLTextAreaElement | null>;
  testo: string;
  percorso: string;
  onTesto: (t: string) => void;
  schede: Scheda[];
  norme: LinkUtente[];
  /** Carica un'immagine e restituisce il percorso da scrivere; assente = senza OneDrive. */
  onImmagine?: (file: File) => Promise<string>;
  onErrore: (m: string) => void;
}

/** Applica una modifica e rimette la selezione dov'era detto, dopo il disegno. */
export function applica(area: HTMLTextAreaElement | null, m: Modifica, onTesto: (t: string) => void) {
  onTesto(m.testo);
  requestAnimationFrame(() => {
    if (!area) return;
    area.focus();
    area.setSelectionRange(m.da, m.a);
  });
}

function Campo({ etichetta, children }: { etichetta: string; children: React.ReactNode }) {
  return (
    <label className="base-campo">
      <span>{etichetta}</span>
      {children}
    </label>
  );
}

/** L'intestazione come modulo: ogni campo riscrive solo la sua riga. */
function PannelloIntestazione({ testo, onTesto, schede }: { testo: string; onTesto: (t: string) => void; schede: Scheda[] }) {
  const s = useMemo(() => leggiScheda('', testo), [testo]);
  const valori = (campo: 'area' | 'tipo') =>
    [...new Set(schede.map((x) => x[campo]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));
  const imposta = (chiave: string, v: string | string[]) => onTesto(impostaCampo(testo, chiave, v));
  const elenco = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);
  const ripasso = typeof s.meta.ripasso === 'string' ? s.meta.ripasso : '';

  return (
    <div className="base-pannello base-intestazione">
      <Campo etichetta="Titolo">
        <input className="input" value={s.titolo} onChange={(e) => imposta('titolo', e.target.value)} />
      </Campo>
      <Campo etichetta="Area">
        <input className="input" list="barra-aree" value={s.area} onChange={(e) => imposta('area', e.target.value)} />
        <datalist id="barra-aree">
          {valori('area').map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </Campo>
      <Campo etichetta="Tipo">
        <input className="input" list="barra-tipi" value={s.tipo} onChange={(e) => imposta('tipo', e.target.value)} />
        <datalist id="barra-tipi">
          {[...new Set(['sintesi', 'riassunto', 'procedura', 'lezione', 'disciplina', ...valori('tipo')])].map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </Campo>
      <Campo etichetta="Stato">
        <select className="input" value={s.stato} onChange={(e) => imposta('stato', e.target.value)}>
          {!(STATI_STUDIO as readonly string[]).includes(s.stato) && <option value={s.stato}>{s.stato || '—'}</option>}
          {STATI_STUDIO.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Campo>
      <Campo etichetta="Tag (separati da virgola)">
        <input
          className="input"
          defaultValue={s.tag.join(', ')}
          placeholder="fondazioni, pali"
          onBlur={(e) => imposta('tag', elenco(e.target.value))}
        />
      </Campo>
      <Campo etichetta="Norme (separate da virgola)">
        <input
          className="input"
          defaultValue={s.norme.join(', ')}
          placeholder="NTC 2018 §6.4.3, EC7"
          onBlur={(e) => imposta('norme', elenco(e.target.value))}
        />
      </Campo>
      <Campo etichetta="Ultimo ripasso">
        <input className="input" type="date" value={ripasso} onChange={(e) => imposta('ripasso', e.target.value)} />
      </Campo>
    </div>
  );
}

/** Un elenco da cui scegliere, con la ricerca in testa. */
function Scelta({
  voci,
  segnaposto,
  onScegli,
  extra,
}: {
  voci: { chiave: string; titolo: string; sotto?: string }[];
  segnaposto: string;
  onScegli: (chiave: string) => void;
  extra?: React.ReactNode;
}) {
  const [q, setQ] = useState('');
  const filtrate = voci.filter((v) => normalizza(`${v.titolo} ${v.sotto ?? ''}`).includes(normalizza(q))).slice(0, 40);
  return (
    <div className="base-pannello base-scelta">
      <input
        className="input"
        autoFocus
        value={q}
        placeholder={segnaposto}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && filtrate[0]) {
            e.preventDefault();
            onScegli(filtrate[0].chiave);
          }
        }}
      />
      {extra}
      <ul>
        {filtrate.map((v) => (
          <li key={v.chiave}>
            <button type="button" onClick={() => onScegli(v.chiave)}>
              <span>{v.titolo}</span>
              {v.sotto && <span className="sotto">{v.sotto}</span>}
            </button>
          </li>
        ))}
        {filtrate.length === 0 && <li className="vuoto">Niente che corrisponda.</li>}
      </ul>
    </div>
  );
}

/** Un pulsante della barra. */
function B({ titolo, icona, onClick, attivo }: { titolo: string; icona: React.ReactNode; onClick: () => void; attivo?: boolean }) {
  return (
    <button
      type="button"
      className="base-barra-btn"
      title={titolo}
      aria-label={titolo}
      aria-pressed={attivo}
      // il fuoco resta nel testo: senza, la selezione si perderebbe al clic
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {icona}
    </button>
  );
}

export default function BarraEditor({ area, testo, percorso, onTesto, schede, norme, onImmagine, onErrore }: PropsBarra) {
  const [pannello, setPannello] = useState<Pannello>('');
  const [capitolo, setCapitolo] = useState('');
  const [caricando, setCaricando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sel = () => {
    const a = area.current;
    return a ? { da: a.selectionStart, a: a.selectionEnd } : { da: testo.length, a: testo.length };
  };
  const fai = (f: (testo: string, da: number, a: number) => Modifica) => {
    const { da, a } = sel();
    applica(area.current, f(testo, da, a), onTesto);
    setPannello('');
  };
  const apri = (p: Pannello) => setPannello((v) => (v === p ? '' : p));

  /** Il collegamento prende la selezione come etichetta: `[[Titolo|parole scelte]]`. */
  const collega = (bersaglio: string) =>
    fai((t, da, a) => {
      const scelto = t.slice(da, a).trim();
      return inserisci(t, da, a, scelto && scelto !== bersaglio ? `[[${bersaglio}|${scelto}]]` : `[[${bersaglio}]]`);
    });

  const caricaImmagini = async (files: FileList | null) => {
    if (!files?.length || !onImmagine) return;
    setCaricando(true);
    try {
      let t = testo;
      let { da, a } = sel();
      for (const f of Array.from(files)) {
        const p = await onImmagine(f);
        const m = inserisciBlocco(t, da, a, segnoImmagine(p, f.name.replace(/\.[^.]+$/, '')));
        t = m.testo;
        da = a = m.a + (t.slice(m.a).match(/^\n*/)?.[0].length ?? 0);
      }
      applica(area.current, { testo: t, da, a }, onTesto);
    } catch (e) {
      onErrore(e instanceof Error ? e.message : String(e));
    } finally {
      setCaricando(false);
    }
  };

  const vereSchede = schede.filter((s) => !s.percorso.startsWith('_') && s.percorso !== percorso);

  return (
    <div className="base-barra-contenitore">
      <div className="base-barra" role="toolbar" aria-label="Formattazione">
        <B titolo="Intestazione: area, tipo, stato, tag, norme" icona={<SlidersHorizontal size={16} />} attivo={pannello === 'intestazione'} onClick={() => apri('intestazione')} />
        <span className="base-barra-sep" />
        <B titolo="Titolo di sezione" icona={<TextHTwo size={16} />} onClick={() => fai((t, d, a) => aCapoRiga(t, d, a, '## '))} />
        <B titolo="Sottotitolo" icona={<TextHThree size={16} />} onClick={() => fai((t, d, a) => aCapoRiga(t, d, a, '### '))} />
        <B titolo="Grassetto (Ctrl+B)" icona={<TextB size={16} />} onClick={() => fai((t, d, a) => avvolgi(t, d, a, '**', '**', 'testo'))} />
        <B titolo="Corsivo (Ctrl+I)" icona={<TextItalic size={16} />} onClick={() => fai((t, d, a) => avvolgi(t, d, a, '*', '*', 'testo'))} />
        <span className="base-barra-sep" />
        <B titolo="Elenco puntato" icona={<ListBullets size={16} />} onClick={() => fai((t, d, a) => aCapoRiga(t, d, a, '- '))} />
        <B titolo="Elenco numerato" icona={<ListNumbers size={16} />} onClick={() => fai((t, d, a) => aCapoRiga(t, d, a, '1. '))} />
        <B titolo="Casella da spuntare" icona={<CheckSquare size={16} />} onClick={() => fai((t, d, a) => aCapoRiga(t, d, a, '- [ ] '))} />
        <span className="base-barra-sep" />
        <B titolo="Collegamento a un'altra scheda" icona={<LinkSimple size={16} />} attivo={pannello === 'collegamento'} onClick={() => apri('collegamento')} />
        <B titolo="Norma della Libreria" icona={<BookOpenText size={16} />} attivo={pannello === 'norma'} onClick={() => apri('norma')} />
        <span className="base-barra-sep" />
        <B titolo="Blocco di calcolo" icona={<Calculator size={16} />} onClick={() => fai((t, d, a) => inserisciBlocco(t, d, a, BLOCCO_CALCOLO))} />
        <B titolo="Tabella" icona={<Table size={16} />} onClick={() => fai((t, d, a) => inserisciBlocco(t, d, a, BLOCCO_TABELLA))} />
        <B titolo="Riquadro: sintesi, attenzione, nota" icona={<Quotes size={16} />} attivo={pannello === 'riquadro'} onClick={() => apri('riquadro')} />
        <B titolo="Linea di separazione" icona={<Minus size={16} />} onClick={() => fai((t, d, a) => inserisciBlocco(t, d, a, '---'))} />
        {onImmagine && (
          <>
            <B
              titolo={caricando ? 'Carico l’immagine…' : 'Immagine (anche incollata con Ctrl+V o trascinata sul testo)'}
              icona={<Image size={16} weight={caricando ? 'fill' : 'regular'} />}
              onClick={() => fileRef.current?.click()}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void caricaImmagini(e.target.files);
                e.target.value = '';
              }}
            />
          </>
        )}
      </div>

      {pannello === 'intestazione' && <PannelloIntestazione testo={testo} onTesto={onTesto} schede={schede} />}

      {pannello === 'collegamento' && (
        <Scelta
          segnaposto="Cerca la scheda da collegare…"
          voci={vereSchede.map((s) => ({ chiave: s.titolo, titolo: s.titolo, sotto: [s.area, s.tipo].filter(Boolean).join(' · ') }))}
          onScegli={collega}
        />
      )}

      {pannello === 'norma' && (
        <Scelta
          segnaposto="Cerca la norma nella Libreria…"
          voci={norme.map((n) => ({ chiave: n.sigla, titolo: n.sigla || n.titolo, sotto: n.titolo }))}
          onScegli={(sigla) => collega(`${sigla}${capitolo.trim() ? ` §${capitolo.trim().replace(/^§\s*/, '')}` : ''}`)}
          extra={
            <input
              className="input"
              value={capitolo}
              placeholder="Capitolo, facoltativo: 4.1.2.3"
              onChange={(e) => setCapitolo(e.target.value)}
            />
          }
        />
      )}

      {pannello === 'riquadro' && (
        <div className="base-pannello base-riquadri">
          {TIPI_RIQUADRO.map((r) => (
            <button
              key={r.tipo}
              type="button"
              className="chip-toggle"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => fai((t, d, a) => inserisciBlocco(t, d, a, bloccoRiquadro(r.tipo, r.etichetta)))}
            >
              {r.etichetta}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Le scorciatoie da tastiera della barra: Ctrl+B, Ctrl+I. `true` se il tasto è stato usato. */
export function scorciatoia(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  testo: string,
  onTesto: (t: string) => void,
): boolean {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return false;
  const t = e.currentTarget;
  const k = e.key.toLowerCase();
  if (k !== 'b' && k !== 'i') return false;
  e.preventDefault();
  const segno = k === 'b' ? '**' : '*';
  applica(t, avvolgi(testo, t.selectionStart, t.selectionEnd, segno, segno, 'testo'), onTesto);
  return true;
}

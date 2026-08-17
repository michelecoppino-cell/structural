import { useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import {
  Backspace,
  CaretDown,
  CaretUp,
  Check,
  ClipboardText,
  DownloadSimple,
  GridNine,
  Image as ImageIcon,
  Link as LinkIcon,
  NotePencil,
  PencilSimple,
  Plus,
  Printer,
  Ruler,
  Trash,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { useStore, type CapitoloId } from '../state/store';
import { ComandiScheda } from '../components/ComandiScheda';
import {
  GRANDEZZE_CATALOGO,
  PREIMPOSTATE_DEFAULT,
  VOCI_DEFAULT,
  formatta,
  ricalcola,
  vociDaSelezioni,
  type Preimpostata,
  type Selezioni,
  type TipoVoce,
  type VoceCalcolo,
  type VoceCalcolata,
} from '../calc/calcolatrice';
import {
  nuovoBlocco,
  ricalcolaQuaderno,
  type BloccoCalcolato,
  type BloccoQuaderno,
  type TipoBlocco,
} from '../calc/quaderno';
import { CAPITOLI, blocchiCapitolo, importiDaSchede, titoloCapitolo } from '../calc/relazione';
import { documentoHtml, documentoTesto, nomeFile, oggi } from '../calc/esportazione';
import { UNITA_DEFAULT, normalizzaElenco, unitaInElenco } from '../calc/unita';
import { ACCIAI, CLS, DIAMETRI, SIGLE_ACCIAIO } from '../data/materiali';
import { TAGLIE_BULLONE } from '../data/bulloni';

/* ─────────────────────────── cose di servizio ─────────────────────────── */

/** Un valore scritto come numero e basta: non si ripete il risultato. */
const SOLO_NUMERO = /^[+-]?[\d\s.,]+$/;

/** Larghezza massima di uno schema incollato: oltre, il file diventa enorme. */
const LATO_MAX = 1400;

/** La γ dei pesi di volume si scrive con il pedice: γC, non gC. */
function Nome({ nome }: { nome: string }) {
  const m = /^([γΓ])(.+)$/.exec(nome.trim());
  if (!m) return <>{nome}</>;
  return (
    <>
      {m[1]}
      <sub>{m[2]}</sub>
    </>
  );
}

/** Payload del drag & drop: che cosa si sta trascinando nel quaderno. */
interface Trascinato {
  tipo: TipoBlocco;
  fonte: string;
}

const MIME = 'application/x-quaderno';

function iniziaTrascinamento(e: DragEvent, dato: Trascinato) {
  e.dataTransfer.setData(MIME, JSON.stringify(dato));
  e.dataTransfer.setData('text/plain', dato.fonte);
  e.dataTransfer.effectAllowed = 'copy';
}

function leggiTrascinato(e: DragEvent): Trascinato | null {
  try {
    const raw = e.dataTransfer.getData(MIME);
    if (!raw) return null;
    const d = JSON.parse(raw) as Trascinato;
    return d?.tipo ? d : null;
  } catch {
    return null;
  }
}

/**
 * Riduce uno schema incollato a una misura da documento e lo mette in un data
 * URL: l'immagine viaggia dentro il progetto e dentro l'HTML esportato, quindi
 * tenerla piccola non è un vezzo — è la differenza fra un file che si apre e
 * uno che non si salva nemmeno.
 */
function leggiImmagine(file: File): Promise<string> {
  return new Promise((risolvi, rifiuta) => {
    const lettore = new FileReader();
    lettore.onerror = () => rifiuta(new Error('immagine non leggibile'));
    lettore.onload = () => {
      const src = String(lettore.result);
      const img = new Image();
      img.onerror = () => risolvi(src);
      img.onload = () => {
        const scala = Math.min(1, LATO_MAX / Math.max(img.width, img.height));
        if (scala >= 1 && src.length < 400_000) return risolvi(src);
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * scala));
        c.height = Math.max(1, Math.round(img.height * scala));
        const ctx = c.getContext('2d');
        if (!ctx) return risolvi(src);
        // fondo bianco: un PNG trasparente su carta bianca deve restare leggibile
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        risolvi(c.toDataURL('image/jpeg', 0.9));
      };
      img.src = src;
    };
    lettore.readAsDataURL(file);
  });
}

/** Prima immagine fra i file trascinati o negli appunti. */
function immagineDa(dati: DataTransfer | null): File | null {
  if (!dati) return null;
  for (const f of Array.from(dati.files)) if (f.type.startsWith('image/')) return f;
  for (const it of Array.from(dati.items)) {
    if (it.kind === 'file' && it.type.startsWith('image/')) {
      const f = it.getAsFile();
      if (f) return f;
    }
  }
  return null;
}

/* ─────────────────────────── sezioni del pannello ─────────────────────── */

function Sezione({
  id,
  titolo,
  hint,
  children,
}: {
  id: string;
  titolo: string;
  hint?: string;
  children: ReactNode;
}) {
  const { state, dispatch } = useStore();
  const aperto = !!state.ui.open[id];
  return (
    <div className={`quad-sez${aperto ? ' is-aperta' : ''}`}>
      <button
        type="button"
        className="quad-sez-testa"
        aria-expanded={aperto}
        aria-controls={`${id}-corpo`}
        onClick={() => dispatch({ type: 'toggleOpen', id })}
      >
        <span className="t">{titolo}</span>
        {hint && !aperto && <span className="d">{hint}</span>}
        {aperto ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
      </button>
      {aperto && (
        <div className="quad-sez-corpo" id={`${id}-corpo`}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Una grandezza nel pannello: il valore si scrive dentro la pastiglia, il nome
 * la trascina nel quaderno e il «+» ce la mette senza trascinare. Toccando il
 * nome si aprono unità, nota e colonna.
 */
function RigaGrandezza({
  v,
  elenco,
  aperta,
  onApri,
  onAggiorna,
  onElimina,
  onAggiungi,
}: {
  v: VoceCalcolata;
  elenco: string[];
  aperta: boolean;
  onApri: () => void;
  onAggiorna: (patch: Partial<VoceCalcolo>) => void;
  onElimina: () => void;
  onAggiungi: () => void;
}) {
  const fuori = !!v.um.trim() && !unitaInElenco(v.um, elenco);
  return (
    <div className={`quad-gr${v.errore ? ' is-errore' : ''}${aperta ? ' is-aperta' : ''}`}>
      <div
        className="quad-gr-riga"
        draggable
        onDragStart={(e) => iniziaTrascinamento(e, { tipo: 'valore', fonte: v.id })}
        title={`${v.nota || v.nome} — trascina nel quaderno, o tocca il «+»`}
      >
        <button type="button" className="quad-gr-nome" aria-expanded={aperta} onClick={onApri}>
          <Nome nome={v.nome || '—'} />
        </button>
        <input
          className={`input quad-gr-valore${v.errore ? ' is-error' : ''}`}
          value={v.espressione}
          placeholder="—"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-label={`Valore di ${v.nome || 'grandezza'}`}
          onChange={(e) => onAggiorna({ espressione: e.target.value })}
        />
        <span className="quad-gr-um" title={v.umEffettiva}>
          {v.umEffettiva}
        </span>
        <button type="button" className="quad-gr-piu" title="Metti nel quaderno" onClick={onAggiungi}>
          <Plus size={11} weight="bold" />
        </button>
      </div>

      {aperta && (
        <div className="quad-gr-modifica">
          <div className="mini-campo">
            <label htmlFor={`qn-${v.id}`}>Nome</label>
            <input
              id={`qn-${v.id}`}
              className={`input${v.nome.trim() && !v.nomeValido ? ' is-error' : ''}`}
              value={v.nome}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => onAggiorna({ nome: e.target.value })}
            />
          </div>
          <div className="mini-campo">
            <label htmlFor={`qu-${v.id}`}>Unità</label>
            <input
              id={`qu-${v.id}`}
              className={`input${fuori ? ' is-error' : ''}`}
              value={v.um}
              list="quad-elenco-unita"
              placeholder={v.umCalcolata || 'kN/mq'}
              autoComplete="off"
              spellCheck={false}
              title={fuori ? 'Unità non in elenco' : undefined}
              onChange={(e) => onAggiorna({ um: e.target.value })}
            />
          </div>
          <div className="mini-campo quad-campo-largo">
            <label htmlFor={`qt-${v.id}`}>Nota</label>
            <input
              id={`qt-${v.id}`}
              className="input"
              value={v.nota}
              autoComplete="off"
              onChange={(e) => onAggiorna({ nota: e.target.value })}
            />
          </div>
          <div className="mini-campo">
            <label htmlFor={`qc-${v.id}`}>Colonna</label>
            <select
              id={`qc-${v.id}`}
              className="input"
              value={v.tipo ?? 'operazione'}
              onChange={(e) => onAggiorna({ tipo: e.target.value as TipoVoce })}
            >
              <option value="compilabile">Da compilare</option>
              <option value="fissa">Fissa</option>
              <option value="operazione">Operazione</option>
            </select>
          </div>
          <button type="button" className="btn btn-secondary btn-icon" title="Elimina la grandezza" onClick={onElimina}>
            <Trash size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

/** Le scelte a tendina da cui nascono le grandezze fisse di libreria. */
function ScelteLibreria({
  sel,
  derivate,
  onCambia,
  onAggiungi,
}: {
  sel: Selezioni;
  derivate: VoceCalcolata[];
  onCambia: (patch: Partial<Selezioni>) => void;
  onAggiungi: (v: VoceCalcolata) => void;
}) {
  return (
    <>
      <div className="quad-scelte">
        <div className="mini-campo">
          <label htmlFor="q-cls">CLS</label>
          <select id="q-cls" className="input" value={sel.cls} onChange={(e) => onCambia({ cls: e.target.value })}>
            <option value="">— nessuno —</option>
            {Object.keys(CLS).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="mini-campo">
          <label htmlFor="q-acc">Acciaio</label>
          <select id="q-acc" className="input" value={sel.acciaio} onChange={(e) => onCambia({ acciaio: e.target.value })}>
            <option value="">— nessuno —</option>
            {SIGLE_ACCIAIO.map((s) => (
              <option key={s} value={s}>
                {s} — {ACCIAI[s].famiglia}
              </option>
            ))}
          </select>
        </div>
        <div className="mini-campo">
          <label htmlFor="q-fi">Ferro ⌀</label>
          <select id="q-fi" className="input" value={sel.barraFi} onChange={(e) => onCambia({ barraFi: e.target.value })}>
            {DIAMETRI.map((d) => (
              <option key={d} value={d}>
                ⌀{d}
              </option>
            ))}
          </select>
        </div>
        <div className="mini-campo">
          <label htmlFor="q-fi-n">n. ferri</label>
          <input
            id="q-fi-n"
            className="input"
            value={sel.barraN}
            placeholder="—"
            inputMode="numeric"
            autoComplete="off"
            onChange={(e) => onCambia({ barraN: e.target.value })}
          />
        </div>
        <div className="mini-campo">
          <label htmlFor="q-m">Bullone M</label>
          <select id="q-m" className="input" value={sel.bulloneM} onChange={(e) => onCambia({ bulloneM: e.target.value })}>
            {TAGLIE_BULLONE.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="mini-campo">
          <label htmlFor="q-m-n">n. bulloni</label>
          <input
            id="q-m-n"
            className="input"
            value={sel.bulloneN}
            placeholder="—"
            inputMode="numeric"
            autoComplete="off"
            onChange={(e) => onCambia({ bulloneN: e.target.value })}
          />
        </div>
      </div>

      {derivate.length > 0 ? (
        <div className="quad-chips">
          {derivate.map((v) => (
            <button
              key={v.id}
              type="button"
              className="quad-chip"
              draggable
              onDragStart={(e) => iniziaTrascinamento(e, { tipo: 'valore', fonte: v.id })}
              title={`${v.nota} — trascina o tocca per metterla nel quaderno`}
              onClick={() => onAggiungi(v)}
            >
              <span className="n">{v.nome}</span>
              <strong>{formatta(v.valore)}</strong>
              {v.umEffettiva && <span className="um">{v.umEffettiva}</span>}
            </button>
          ))}
        </div>
      ) : (
        <p className="note" style={{ margin: 0 }}>
          Nessuna scelta fatta: scegli una classe di calcestruzzo o un acciaio e qui compaiono le
          resistenze di progetto, da tirare nel quaderno o da richiamare per nome nelle formule.
        </p>
      )}
    </>
  );
}

/* ─────────────────────────── la scheda ─────────────────────────── */

export default function Quaderno() {
  const { state, dispatch } = useStore();
  const q = state.quaderno;
  const calc = state.calcolatrice;
  const aiuto = state.ui.allDetails.quaderno;

  const [toast, setToast] = useState('');
  const [apriUnita, setApriUnita] = useState(false);
  const [nuovaUnita, setNuovaUnita] = useState('');
  const [modificaFormule, setModificaFormule] = useState(false);
  const [nuovaPre, setNuovaPre] = useState({ nome: '', espressione: '', um: '', nota: '' });
  /** Ultimo campo di formula toccato: è lì che scrive il tastierino. */
  const ultimoCampo = useRef<HTMLInputElement | null>(null);

  const setQ = (patch: Partial<typeof q>) => dispatch({ type: 'quaderno', patch });
  const setCalc = (patch: Partial<typeof calc>) => dispatch({ type: 'calcolatrice', patch });

  const flash = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(''), 2400);
  };

  /* ── i numeri: le grandezze del pannello e i blocchi del foglio ── */

  // le grandezze che nascono dalle scelte di libreria stanno in testa alla
  // sequenza, così ogni formula più in basso le vede
  const daLibreria = useMemo(() => vociDaSelezioni(calc.selezioni), [calc.selezioni]);
  const generate = useMemo(
    () => ricalcola([...daLibreria, ...calc.voci], calc.unita),
    [daLibreria, calc.voci, calc.unita],
  );
  const derivate = generate.slice(0, daLibreria.length);
  const voci = generate.slice(daLibreria.length);
  // gli import vengono dalle altre schede: si rifanno quando cambia lo stato
  const importi = useMemo(() => importiDaSchede(state), [state]);

  const calcolati = useMemo(
    () =>
      ricalcolaQuaderno(q.blocchi, {
        voci: generate,
        preimpostate: calc.preimpostate,
        importi,
        elenco: calc.unita,
      }),
    [q.blocchi, generate, calc.preimpostate, calc.unita, importi],
  );

  /* ── comporre il quaderno ── */

  const aggiungi = (b: BloccoQuaderno) => setQ({ blocchi: [...q.blocchi, b] });
  const aggiornaBlocco = (id: string, patch: Partial<BloccoQuaderno>) =>
    setQ({ blocchi: q.blocchi.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  const eliminaBlocco = (id: string) => setQ({ blocchi: q.blocchi.filter((b) => b.id !== id) });

  const onDrop = (e: DragEvent) => {
    const d = leggiTrascinato(e);
    if (d) {
      e.preventDefault();
      aggiungi(nuovoBlocco(d.tipo, { fonte: d.fonte }));
      return;
    }
    const file = immagineDa(e.dataTransfer);
    if (file) {
      e.preventDefault();
      void leggiImmagine(file).then((img) => aggiungi(nuovoBlocco('immagine', { img })));
    }
  };

  /** Uno schema incollato con Ctrl+V sul foglio diventa un blocco da sé. */
  const onPaste = (e: React.ClipboardEvent) => {
    const file = immagineDa(e.clipboardData);
    if (!file) return;
    e.preventDefault();
    void leggiImmagine(file).then((img) => aggiungi(nuovoBlocco('immagine', { img })));
  };

  /* ── grandezze del pannello ── */

  const setVoci = (v: VoceCalcolo[]) => setCalc({ voci: v });
  const aggiornaVoce = (id: string, patch: Partial<VoceCalcolo>) =>
    setVoci(calc.voci.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const aggiungiGrandezza = (base?: Partial<Omit<VoceCalcolo, 'id'>>) => {
    const id = `calc-${Date.now()}`;
    setVoci([...calc.voci, { id, nome: '', espressione: '', nota: '', um: '', tipo: 'compilabile', ...base }]);
    if (!base?.nome) dispatch({ type: 'toggleExp', id: `quad-${id}` });
  };

  const nomiUsati = new Set(generate.map((v) => v.nome.trim()));
  const proposte = [...VOCI_DEFAULT.map(({ id: _id, ...g }) => g), ...GRANDEZZE_CATALOGO].filter(
    (g) => !nomiUsati.has(g.nome),
  );

  /* ── formule preimpostate ── */

  const setPre = (p: Preimpostata[]) => setCalc({ preimpostate: p });
  const aggiornaPre = (id: string, patch: Partial<Preimpostata>) =>
    setPre(calc.preimpostate.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const aggiungiPre = () => {
    if (!nuovaPre.espressione.trim()) return;
    setPre([
      ...calc.preimpostate,
      {
        id: `pre-${Date.now()}`,
        nome: nuovaPre.nome.trim(),
        espressione: nuovaPre.espressione.trim(),
        nota: nuovaPre.nota.trim(),
        um: nuovaPre.um.trim(),
      },
    ]);
    setNuovaPre({ nome: '', espressione: '', um: '', nota: '' });
  };

  /* ── unità proposte ── */

  const setUnita = (u: string[]) => setCalc({ unita: normalizzaElenco(u) });

  /* ── tastierino: scrive nel campo formula toccato per ultimo ── */

  const inserisci = (testo: string) => {
    const el = ultimoCampo.current;
    if (!el) {
      flash('Tocca prima la formula in cui scrivere');
      return;
    }
    const src = el.value;
    const a = el.selectionStart ?? src.length;
    const b = el.selectionEnd ?? src.length;
    const nuova = src.slice(0, a) + testo + src.slice(b);
    const id = el.dataset.blocco;
    if (id) aggiornaBlocco(id, { espressione: nuova });
    requestAnimationFrame(() => {
      el.focus();
      const p = a + testo.length;
      el.setSelectionRange(p, p);
    });
  };

  /* ── le tre uscite ── */

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(documentoTesto(state));
      flash('Foglio copiato: incollalo dove vuoi');
    } catch {
      flash('Copia non riuscita: consenti l’accesso agli appunti');
    }
  };

  const scarica = () => {
    const blob = new Blob([documentoHtml(state)], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nomeFile(state)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    flash('File HTML scaricato: si apre con qualunque browser');
  };

  const p = state.progetto;
  const capitoliDentro = new Set(q.blocchi.filter((b) => b.tipo === 'capitolo').map((b) => b.fonte));

  return (
    <div className="quad">
      <datalist id="quad-elenco-unita">
        {calc.unita.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      <ComandiScheda>
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={q.quadretti}
          title="Sfondo a quadretti, come la carta da calcolo (non viene stampato)"
          onClick={() => setQ({ quadretti: !q.quadretti })}
        >
          <GridNine size={14} />
          Quadretti
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={apriUnita}
          title="Cambia le unità di misura proposte"
          onClick={() => setApriUnita((v) => !v)}
        >
          <Ruler size={14} />
          Unità
        </button>
        <button type="button" className="btn btn-secondary" title="Copia il foglio come testo" onClick={copia}>
          <ClipboardText size={14} />
          Copia testo
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          title="Scarica un file HTML autonomo, leggibile senza questa app"
          onClick={scarica}
        >
          <DownloadSimple size={14} />
          Scarica HTML
        </button>
        <button
          type="button"
          className="btn btn-primary"
          title="Stampa il foglio — dalla stessa finestra si salva in PDF"
          onClick={() => window.print()}
        >
          <Printer size={14} />
          Stampa / PDF
        </button>
      </ComandiScheda>

      {apriUnita && (
        <section className="panel quad-unita">
          <div className="panel-body" style={{ paddingTop: 12 }}>
            <div className="section-title">Unità di misura proposte</div>
            <p className="note" style={{ marginTop: 0 }}>
              Sono quelle che il quaderno propone per leggere i risultati: cambiando l’unità di un
              blocco il <strong>numero si converte</strong> — 0,8 MPa diventano 8,16 kg/cmq. Il
              prodotto e il rapporto fra grandezze con nome ricavano l’unità da soli, e i valori
              girano in unità base (m, N), così mescolare cm, MPa e cm⁴ nella stessa formula non
              sbaglia i conti. Attenzione: qui il <strong>kg è un kgf</strong> (1 kg = 9,80665 N),
              come in kg/cmq e kg/mc.
            </p>
            <div className="calc-unita-aggiungi">
              <input
                className="input"
                value={nuovaUnita}
                placeholder="kg/cmq"
                aria-label="Nuova unità di misura"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setNuovaUnita(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  if (!nuovaUnita.trim()) return;
                  setUnita([...calc.unita, nuovaUnita.trim()]);
                  setNuovaUnita('');
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={!nuovaUnita.trim()}
                onClick={() => {
                  setUnita([...calc.unita, nuovaUnita.trim()]);
                  setNuovaUnita('');
                }}
              >
                <Plus size={14} />
                Aggiungi
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                title="Torna all’elenco di serie"
                onClick={() => setUnita(UNITA_DEFAULT)}
              >
                Ripristina
              </button>
            </div>
            <div className="calc-unita-elenco">
              {calc.unita.map((u) => (
                <span className="calc-unita-chip" key={u}>
                  {u}
                  <button type="button" title={`Togli ${u}`} onClick={() => setUnita(calc.unita.filter((x) => x !== u))}>
                    <X size={11} weight="bold" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="quad-corpo">
        {/* ─────────────── il foglio ─────────────── */}
        <div className="quad-area" onDragOver={(e) => e.preventDefault()} onDrop={onDrop} onPaste={onPaste}>
          <div className={`quad-foglio${q.quadretti ? ' is-quadretti' : ''}`} id="foglio-esportazione">
            <header className="quad-testa">
              <div>
                <div className="quad-titolo">{p.nome}</div>
                <div className="quad-meta">
                  Commessa {p.commessa} · {p.localita} · NTC2018 (DM 17/01/2018) · rev. {p.revisione}
                </div>
              </div>
              <div className="quad-data">{oggi()}</div>
            </header>

            <input
              className="quad-intestazione"
              value={q.intestazione}
              placeholder="Oggetto del calcolo — scrivi qui una riga di premessa (facoltativa)"
              aria-label="Riga di premessa del foglio"
              onChange={(e) => setQ({ intestazione: e.target.value })}
            />

            <div className="quad-rapidi">
              <button type="button" className="btn btn-secondary" onClick={() => aggiungi(nuovoBlocco('nota'))}>
                <NotePencil size={14} />
                Nota
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => aggiungi(nuovoBlocco('formula'))}
                title="Una riga di calcolo scritta qui, con la sua unità"
              >
                <PencilSimple size={14} />
                Formula
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => aggiungi(nuovoBlocco('immagine'))}>
                <ImageIcon size={14} />
                Screenshot
              </button>
            </div>

            {calcolati.length > 0 && (
              <div className="quad-blocchi">
                {calcolati.map((b) => (
                  <BloccoCard
                    key={b.blocco.id}
                    b={b}
                    campoRef={ultimoCampo}
                    onAggiorna={(patch) => aggiornaBlocco(b.blocco.id, patch)}
                    onElimina={() => eliminaBlocco(b.blocco.id)}
                    capitolo={
                      b.blocco.tipo === 'capitolo'
                        ? blocchiCapitolo(state, b.blocco.fonte as CapitoloId)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}

            <div className="quad-drop" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
              {calcolati.length === 0
                ? 'Quaderno bianco. Trascina qui una grandezza, una formula preimpostata, un valore da un’altra scheda o un capitolo — resta collegato e si aggiorna da sé. Puoi anche incollare uno screenshot con Ctrl+V.'
                : 'Trascina qui il prossimo passaggio — si aggiunge in coda, collegato alla sua fonte'}
            </div>

            <textarea
              className="quad-nota-foglio"
              value={q.nota}
              rows={2}
              placeholder="Nota a piè di foglio (facoltativa)"
              aria-label="Nota a piè di foglio"
              onChange={(e) => setQ({ nota: e.target.value })}
            />

            <footer className="quad-piede">
              Documento di predimensionamento: i valori vanno confermati dal calcolo esecutivo.
            </footer>
          </div>
        </div>

        {/* ─────────────── il pannello ─────────────── */}
        <aside className="quad-panel" aria-label="Grandezze e operazioni da mettere nel quaderno">
          {aiuto && (
            <p className="note" style={{ margin: '0 0 4px' }}>
              Tutto quello che sta qui si trascina nel foglio (o si tocca con il «+») e ci resta{' '}
              <strong>collegato</strong>: se cambi il valore qui, il quaderno si ricalcola da solo.
            </p>
          )}

          <Sezione
            id="q-compilare"
            titolo="Grandezze da compilare"
            hint={`${voci.filter((v) => (v.tipo ?? 'operazione') === 'compilabile').length}`}
          >
            <div className="quad-griglia">
              {voci
                .filter((v) => (v.tipo ?? 'operazione') === 'compilabile')
                .map((v) => (
                  <RigaGrandezza
                    key={v.id}
                    v={v}
                    elenco={calc.unita}
                    aperta={!!state.ui.exp[`quad-${v.id}`]}
                    onApri={() => dispatch({ type: 'toggleExp', id: `quad-${v.id}` })}
                    onAggiorna={(patch) => aggiornaVoce(v.id, patch)}
                    onElimina={() => setVoci(calc.voci.filter((x) => x.id !== v.id))}
                    onAggiungi={() => aggiungi(nuovoBlocco('valore', { fonte: v.id }))}
                  />
                ))}
            </div>
            <div className="quad-chips is-catalogo">
              {proposte
                .filter((g) => g.tipo !== 'fissa')
                .map((g) => (
                  <button
                    key={g.nome}
                    type="button"
                    className="quad-chip is-piu"
                    title={`Aggiungi ${g.nome} — ${g.nota}`}
                    onClick={() => aggiungiGrandezza({ ...g })}
                  >
                    <Plus size={10} weight="bold" />
                    <Nome nome={g.nome} />
                  </button>
                ))}
              <button
                type="button"
                className="quad-chip is-piu"
                title="Aggiungi una grandezza tua"
                onClick={() => aggiungiGrandezza({ tipo: 'compilabile' })}
              >
                <Plus size={10} weight="bold" />
                nuova
              </button>
            </div>
          </Sezione>

          <Sezione id="q-fisse" titolo="Grandezze fisse">
            <div className="quad-griglia">
              {voci
                .filter((v) => (v.tipo ?? 'operazione') === 'fissa')
                .map((v) => (
                  <RigaGrandezza
                    key={v.id}
                    v={v}
                    elenco={calc.unita}
                    aperta={!!state.ui.exp[`quad-${v.id}`]}
                    onApri={() => dispatch({ type: 'toggleExp', id: `quad-${v.id}` })}
                    onAggiorna={(patch) => aggiornaVoce(v.id, patch)}
                    onElimina={() => setVoci(calc.voci.filter((x) => x.id !== v.id))}
                    onAggiungi={() => aggiungi(nuovoBlocco('valore', { fonte: v.id }))}
                  />
                ))}
            </div>
            <div className="quad-chips is-catalogo">
              {proposte
                .filter((g) => g.tipo === 'fissa')
                .map((g) => (
                  <button
                    key={g.nome}
                    type="button"
                    className="quad-chip is-piu"
                    title={`Aggiungi ${g.nome} — ${g.nota}`}
                    onClick={() => aggiungiGrandezza({ ...g })}
                  >
                    <Plus size={10} weight="bold" />
                    <Nome nome={g.nome} />
                  </button>
                ))}
              <button
                type="button"
                className="quad-chip is-piu"
                title="Aggiungi una grandezza fissa tua"
                onClick={() => aggiungiGrandezza({ tipo: 'fissa' })}
              >
                <Plus size={10} weight="bold" />
                nuova
              </button>
            </div>
          </Sezione>

          <Sezione id="q-libreria" titolo="Grandezze da libreria" hint={`${derivate.length}`}>
            <ScelteLibreria
              sel={calc.selezioni}
              derivate={derivate}
              onCambia={(patch) => setCalc({ selezioni: { ...calc.selezioni, ...patch } })}
              onAggiungi={(v) => aggiungi(nuovoBlocco('valore', { fonte: v.id }))}
            />
          </Sezione>

          <Sezione id="q-formule" titolo="Operazioni preimpostate" hint={`${calc.preimpostate.length}`}>
            <div className="quad-formule">
              {calc.preimpostate.map((f) => (
                <div key={f.id} className="quad-formula">
                  <button
                    type="button"
                    className="quad-formula-usa"
                    draggable
                    onDragStart={(e) => iniziaTrascinamento(e, { tipo: 'operazione', fonte: f.id })}
                    title={`${f.nota || 'formula'} — trascina nel quaderno o tocca per aggiungerla`}
                    onClick={() => aggiungi(nuovoBlocco('operazione', { fonte: f.id }))}
                  >
                    <span className="t">
                      <Nome nome={f.nome || '—'} />
                      {f.um && <span className="u">({f.um})</span>}
                    </span>
                    <span className="x">{f.espressione}</span>
                  </button>
                  {modificaFormule && (
                    <div className="quad-formula-modifica">
                      <input
                        className="input"
                        value={f.nome}
                        aria-label="Nome del risultato"
                        placeholder="M"
                        onChange={(e) => aggiornaPre(f.id, { nome: e.target.value })}
                      />
                      <input
                        className="input"
                        value={f.espressione}
                        aria-label="Formula"
                        placeholder="q*l^2/8"
                        onChange={(e) => aggiornaPre(f.id, { espressione: e.target.value })}
                      />
                      <input
                        className="input"
                        value={f.um}
                        list="quad-elenco-unita"
                        aria-label="Unità"
                        placeholder="kNm"
                        onChange={(e) => aggiornaPre(f.id, { um: e.target.value })}
                      />
                      <input
                        className="input"
                        value={f.nota}
                        aria-label="Nota"
                        placeholder="momento in mezzeria"
                        onChange={(e) => aggiornaPre(f.id, { nota: e.target.value })}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        title="Elimina la formula"
                        onClick={() => setPre(calc.preimpostate.filter((x) => x.id !== f.id))}
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="quad-formule-barra">
              <button
                type="button"
                className={`btn ${modificaFormule ? 'btn-primary' : 'btn-secondary'}`}
                aria-pressed={modificaFormule}
                onClick={() => setModificaFormule((v) => !v)}
              >
                {modificaFormule ? <Check size={13} /> : <PencilSimple size={13} />}
                {modificaFormule ? 'Fine' : 'Edita'}
              </button>
              {calc.preimpostate.length === 0 && (
                <button type="button" className="btn btn-secondary" onClick={() => setPre(PREIMPOSTATE_DEFAULT)}>
                  <Plus size={13} />
                  Formule di serie
                </button>
              )}
            </div>

            {modificaFormule && (
              <div className="quad-formula-modifica is-nuova">
                <input
                  className="input"
                  value={nuovaPre.nome}
                  aria-label="Nome del risultato"
                  placeholder="σ"
                  onChange={(e) => setNuovaPre({ ...nuovaPre, nome: e.target.value })}
                />
                <input
                  className="input"
                  value={nuovaPre.espressione}
                  aria-label="Formula"
                  placeholder="M/W"
                  onChange={(e) => setNuovaPre({ ...nuovaPre, espressione: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      aggiungiPre();
                    }
                  }}
                />
                <input
                  className="input"
                  value={nuovaPre.um}
                  list="quad-elenco-unita"
                  aria-label="Unità"
                  placeholder="MPa"
                  onChange={(e) => setNuovaPre({ ...nuovaPre, um: e.target.value })}
                />
                <input
                  className="input"
                  value={nuovaPre.nota}
                  aria-label="Nota"
                  placeholder="tensione di flessione"
                  onChange={(e) => setNuovaPre({ ...nuovaPre, nota: e.target.value })}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-icon"
                  disabled={!nuovaPre.espressione.trim()}
                  title="Aggiungi la formula"
                  onClick={aggiungiPre}
                >
                  <Plus size={13} />
                </button>
              </div>
            )}
          </Sezione>

          <Sezione id="q-import" titolo="Import rapido da altre schede" hint={`${importi.length}`}>
            <div className="quad-import">
              {importi.map((im) => (
                <button
                  key={im.id}
                  type="button"
                  className="quad-import-riga"
                  draggable
                  onDragStart={(e) => iniziaTrascinamento(e, { tipo: 'import', fonte: im.id })}
                  title={`${im.etichetta} da ${im.scheda} — resta collegato`}
                  onClick={() => aggiungi(nuovoBlocco('import', { fonte: im.id }))}
                >
                  <span className="n">{im.etichetta}</span>
                  <span className="v">
                    {im.testo ?? (
                      <>
                        <strong>{formatta(im.valore)}</strong> {im.um}
                      </>
                    )}
                  </span>
                  <span className="s">↩ {im.scheda}</span>
                </button>
              ))}
            </div>
          </Sezione>

          <Sezione id="q-capitoli" titolo="Capitoli da altre schede" hint={`${capitoliDentro.size} sul foglio`}>
            <p className="note" style={{ margin: '0 0 6px' }}>
              Un capitolo intero, come lo scriveva la vecchia scheda Esporta: entra nel foglio dove lo
              metti e si aggiorna con la sua scheda.
            </p>
            <div className="quad-chips">
              {CAPITOLI.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`quad-chip${capitoliDentro.has(c.id) ? ' is-dentro' : ''}`}
                  draggable
                  onDragStart={(e) => iniziaTrascinamento(e, { tipo: 'capitolo', fonte: c.id })}
                  title={`Porta il capitolo ${c.titolo} nel foglio`}
                  onClick={() => aggiungi(nuovoBlocco('capitolo', { fonte: c.id }))}
                >
                  {capitoliDentro.has(c.id) ? <Check size={10} weight="bold" /> : <Plus size={10} weight="bold" />}
                  {c.titolo}
                </button>
              ))}
            </div>
          </Sezione>

          <Sezione id="q-tastierino" titolo="Tastierino">
            <p className="note" style={{ margin: '0 0 6px' }}>
              Scrive nella formula toccata per ultima: comodo su cellulare, dove la γ e la ^ non ci sono.
            </p>
            <div className="quad-tasti">
              {TASTI.map((k) => (
                <button
                  key={k.t}
                  type="button"
                  className={`calc-tasto${k.classe ? ` ${k.classe}` : ''}`}
                  title={k.titolo}
                  onClick={() => inserisci(k.ins ?? k.t)}
                >
                  {k.t === '⌫' ? <Backspace size={16} /> : k.t}
                </button>
              ))}
            </div>
          </Sezione>
        </aside>
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── un blocco sul foglio ─────────────────────── */

const TASTI: { t: string; ins?: string; classe?: string; titolo?: string }[] = [
  { t: '7', ins: '7' },
  { t: '8', ins: '8' },
  { t: '9', ins: '9' },
  { t: '÷', ins: '/', classe: 'is-op' },
  { t: '4', ins: '4' },
  { t: '5', ins: '5' },
  { t: '6', ins: '6' },
  { t: '×', ins: '*', classe: 'is-op' },
  { t: '1', ins: '1' },
  { t: '2', ins: '2' },
  { t: '3', ins: '3' },
  { t: '−', ins: '-', classe: 'is-op' },
  { t: '0', ins: '0' },
  { t: ',', ins: ',' },
  { t: '(', ins: '(' },
  { t: '+', ins: '+', classe: 'is-op' },
  { t: '√', ins: 'sqrt(' },
  { t: 'x²', ins: '^2' },
  { t: ')', ins: ')' },
  { t: '^', ins: '^' },
  { t: 'π', ins: 'pi' },
  { t: 'γ', ins: 'γ', titolo: 'Iniziale dei pesi di volume: γC, γS, γT' },
  { t: ';', ins: ';', titolo: 'Separatore degli argomenti: min(3;5)' },
  { t: 'ans', ins: 'ans', titolo: 'Ultimo risultato' },
];

/**
 * Un blocco sul foglio. I blocchi di calcolo mostrano la riga come la si
 * scriverebbe a mano — `nome = formula = risultato unità` — con l'unità che si
 * può cambiare: il numero si converte, il valore che gira nelle formule no.
 */
function BloccoCard({
  b,
  campoRef,
  onAggiorna,
  onElimina,
  capitolo,
}: {
  b: BloccoCalcolato;
  campoRef: { current: HTMLInputElement | null };
  onAggiorna: (patch: Partial<BloccoQuaderno>) => void;
  onElimina: () => void;
  /** Blocchi di relazione, per i blocchi capitolo. */
  capitolo?: { titolo: string; righe: string[] }[];
}) {
  const bl = b.blocco;
  const fileRef = useRef<HTMLInputElement>(null);

  const incolla = (dati: DataTransfer | null) => {
    const f = immagineDa(dati);
    if (f) void leggiImmagine(f).then((img) => onAggiorna({ img }));
  };

  return (
    <div className={`quad-blocco${b.pieno ? ' is-pieno' : ''}${b.errore ? ' is-errore' : ''}`}>
      <div className="quad-blocco-testa">
        <span className="passo">{b.passo}</span>
        <span className={`tipo is-${bl.tipo}`}>{b.etichetta}</span>
        {b.collegato && (
          <span className="link" title="Collegato alla sua fonte: si aggiorna da solo">
            <LinkIcon size={11} />
          </span>
        )}
        {b.provenienza && bl.tipo === 'import' && <span className="fonte">↩ {b.provenienza}</span>}
        <button type="button" className="chiudi" title="Togli dal quaderno" onClick={onElimina}>
          <X size={12} weight="bold" />
        </button>
      </div>

      {/* ── nota ── */}
      {bl.tipo === 'nota' && (
        <textarea
          className="quad-nota"
          value={bl.testo}
          rows={2}
          placeholder="Scrivi una nota…"
          aria-label="Nota"
          onChange={(e) => onAggiorna({ testo: e.target.value })}
        />
      )}

      {/* ── screenshot ── */}
      {bl.tipo === 'immagine' && (
        <div
          className="quad-img"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            incolla(e.dataTransfer);
          }}
          onPaste={(e) => {
            e.stopPropagation();
            incolla(e.clipboardData);
          }}
        >
          {bl.img ? (
            <>
              <img src={bl.img} alt={bl.testo || 'schema'} />
              <div className="quad-img-azioni">
                <input
                  className="input"
                  value={bl.testo}
                  placeholder="Didascalia (facoltativa)"
                  aria-label="Didascalia dello schema"
                  onChange={(e) => onAggiorna({ testo: e.target.value })}
                />
                <button type="button" className="btn btn-secondary btn-icon" title="Togli l’immagine" onClick={() => onAggiorna({ img: '' })}>
                  <Trash size={13} />
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="quad-img-vuota" onClick={() => fileRef.current?.click()}>
              <ImageIcon size={22} />
              <strong>Trascina qui uno screenshot o un disegno</strong>
              <span>oppure incollalo con Ctrl+V, o tocca per sceglierlo</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void leggiImmagine(f).then((img) => onAggiorna({ img }));
              e.target.value = '';
            }}
          />
        </div>
      )}

      {/* ── capitolo ripreso da un'altra scheda ── */}
      {bl.tipo === 'capitolo' && (
        <div className="quad-cap">
          <h2>{titoloCapitolo(bl.fonte)}</h2>
          {(capitolo ?? []).map((s) => (
            <div className="quad-cap-blocco" key={s.titolo}>
              <h3>{s.titolo}</h3>
              <ul>
                {s.righe.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* ── riga di calcolo ── */}
      {!b.pieno && (
        <div className="quad-calcolo">
          {bl.tipo === 'formula' ? (
            <div className="quad-formula-riga">
              <input
                className="input quad-in-nome"
                value={bl.nome}
                placeholder="σ"
                aria-label="Nome del risultato"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => onAggiorna({ nome: e.target.value })}
              />
              <span className="uguale">=</span>
              <input
                className={`input quad-in-espr${b.errore ? ' is-error' : ''}`}
                value={bl.espressione}
                placeholder="M/W   ·   q*l^2/8   ·   b*h*γC"
                aria-label="Formula"
                autoComplete="off"
                spellCheck={false}
                data-blocco={bl.id}
                ref={(el) => {
                  if (el && document.activeElement === el) campoRef.current = el;
                }}
                onFocus={(e) => {
                  campoRef.current = e.currentTarget;
                }}
                onChange={(e) => onAggiorna({ espressione: e.target.value })}
              />
            </div>
          ) : (
            <div className="quad-riga">
              {b.nome && (
                <span className="nome">
                  <Nome nome={b.nome} />
                </span>
              )}
              {b.espressione && !SOLO_NUMERO.test(b.espressione) && <span className="espr">{b.espressione}</span>}
            </div>
          )}

          <div className="quad-esito">
            {b.errore ? (
              <span className="quad-errore" title={b.errore}>
                <WarningCircle size={12} /> {b.errore}
              </span>
            ) : b.mancanti.length ? (
              <span className="quad-manca">manca {b.mancanti.join(', ')}</span>
            ) : b.testo ? (
              <strong>{b.testo}</strong>
            ) : (
              <>
                <span className="uguale">=</span>
                <strong>{formatta(b.valore)}</strong>
                <UnitaBlocco b={b} onAggiorna={onAggiorna} />
              </>
            )}
          </div>

          {b.nomeIgnorato && (
            <div className="quad-avviso">
              Il nome {b.nome} è già usato più su: questo blocco si calcola, ma per le formule più in
              basso {b.nome} resta il primo.
            </div>
          )}
          {b.nota && !b.errore && <div className="quad-nota-riga">{b.nota}</div>}
        </div>
      )}
    </div>
  );
}

/**
 * Il selettore dell'unità di un blocco: le sole unità con cui quel risultato si
 * può leggere, più «auto». Cambiandola il numero si converte — è il punto in
 * cui «lo voglio in kg/cmq» diventa un numero diverso.
 *
 * Un dato scritto a mano (un numero, non un'operazione) non si converte: lì
 * l'unità dice in che unità è scritto il numero, e si scrive a mano.
 */
function UnitaBlocco({
  b,
  onAggiorna,
}: {
  b: BloccoCalcolato;
  onAggiorna: (patch: Partial<BloccoQuaderno>) => void;
}) {
  if (b.dato || b.umAmmesse.length === 0) {
    return (
      <input
        className="input quad-um-libera"
        value={b.blocco.um || b.um}
        list="quad-elenco-unita"
        placeholder="unità"
        aria-label="Unità del valore"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onAggiorna({ um: e.target.value })}
      />
    );
  }
  const scelta = b.blocco.um.trim();
  return (
    <select
      className="input quad-um"
      value={scelta && b.umAmmesse.includes(scelta) ? scelta : ''}
      aria-label="Unità con cui leggere il risultato"
      title={`Unità con cui leggere il risultato: cambiala e il numero si converte${
        b.umFonte ? ` — di serie ${b.umFonte}, dalla formula` : b.umAuto ? ` — di serie ${b.umAuto}, ricavata dall’operazione` : ''
      }`}
      onChange={(e) => onAggiorna({ um: e.target.value })}
    >
      {/* la prima voce è l'unità di serie: quella della formula, o quella
          ricavata dall'operazione. Il resto sono i modi di leggere lo stesso
          valore — sceglierne uno converte il numero. */}
      <option value="">{b.umFonte || b.umAuto || 'auto'}</option>
      {b.umAmmesse.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}

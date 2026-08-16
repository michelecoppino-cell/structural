import { useRef, type ReactNode } from 'react';
import { CaretDown, CaretUp, BookOpenText, ArrowUUpLeft } from '@phosphor-icons/react';
import { useStore } from '../state/store';
import type { TabId } from '../state/store';

/* ─────────────────────────── dettaglio di campo ─────────────────────────── */

export interface Dettaglio {
  formula: string;
  ref: string;
  coeffs?: { k: string; v: string }[];
  /** Tabella normativa completa, per campi che scelgono una riga da una tabella NTC. */
  tabella?: { intestazioni: string[]; righe: (string | number)[][]; evidenzia?: number };
}

export function DettaglioPanel({ dettaglio }: { dettaglio: Dettaglio }) {
  return (
    <div className="field-detail">
      <div className="kicker">Formula</div>
      <div className="formula">{dettaglio.formula}</div>
      {!!dettaglio.coeffs?.length && (
        <div className="coeffs">
          {dettaglio.coeffs.map((c) => (
            <span className="coeff" key={c.k}>
              <span className="k">{c.k}</span>
              <span className="v">{c.v}</span>
            </span>
          ))}
        </div>
      )}
      {dettaglio.tabella && (
        <div className="table-scroll" style={{ marginTop: 8 }}>
          <table className="table">
            <thead>
              <tr>
                {dettaglio.tabella.intestazioni.map((h) => (
                  <th key={h} className={h === dettaglio.tabella!.intestazioni[0] ? undefined : 'num'}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dettaglio.tabella.righe.map((riga, i) => (
                <tr key={i} style={i === dettaglio.tabella!.evidenzia ? { color: 'var(--color-accent-300)' } : undefined}>
                  {riga.map((cella, j) => (
                    <td key={j} className={j === 0 ? undefined : 'num'}>
                      {cella}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="ref">
        <BookOpenText size={13} />
        {dettaglio.ref}
      </div>
    </div>
  );
}

/* ─────────────────────────── provenienza del valore ─────────────────────── */

/**
 * Badge accanto all'etichetta che dice da dove arriva il numero.
 * Con `onClick` diventa un pulsante: serve a scollegare il valore ripreso.
 */
export function Origine({
  testo,
  titolo,
  ripreso = false,
  onClick,
}: {
  testo: string;
  titolo?: string;
  /** true = valore ripreso da un'altra scheda (marcato con ↩). */
  ripreso?: boolean;
  onClick?: () => void;
}) {
  const contenuto = (
    <>
      {ripreso && <ArrowUUpLeft size={10} weight="bold" />}
      {testo}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        className={`field-origin${ripreso ? '' : ' is-manuale'}`}
        title={titolo}
        onClick={onClick}
      >
        {contenuto}
      </button>
    );
  }
  return (
    <span className={`field-origin${ripreso ? '' : ' is-manuale'}`} title={titolo}>
      {contenuto}
    </span>
  );
}

/* ─────────────────────────── campo espandibile ─────────────────────────── */

interface FieldProps {
  id: string;
  tab: TabId;
  label: string;
  unit?: string;
  dettaglio?: Dettaglio;
  /** Messaggio di errore: il campo si marca e l'esito a valle si blocca. */
  errore?: string;
  /** Badge di provenienza del valore, accanto all'etichetta. */
  origine?: ReactNode;
  children: ReactNode;
}

/**
 * Riga compatta etichetta + controllo + unità; il pannello con formula,
 * coefficienti e riferimento normativo compare tutto insieme con l'(i) della
 * barra in testa alla scheda — un bottone per campo occupava troppo spazio.
 */
export function Field({ id, tab, label, unit = '', dettaglio, errore, origine, children }: FieldProps) {
  const { state } = useStore();
  const aperto = state.ui.allDetails[tab];

  return (
    <div>
      <div className="field-row">
        <label htmlFor={id}>
          {label}
          {origine}
        </label>
        <div>
          <div className="field-control">
            {children}
            {unit && <span className="field-unit">{unit}</span>}
          </div>
          {errore && (
            <div className="field-error" id={`${id}-errore`}>
              {errore}
            </div>
          )}
        </div>
      </div>
      {aperto && dettaglio && (
        <div id={`${id}-detail`}>
          <DettaglioPanel dettaglio={dettaglio} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── input numerico / select ────────────────────── */

export function NumInput({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  errore,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** true = valore fuori dai limiti ammessi. */
  errore?: boolean;
}) {
  return (
    <input
      id={id}
      className={`input num${errore ? ' is-error' : ''}`}
      type="text"
      inputMode="decimal"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      aria-invalid={errore || undefined}
      aria-describedby={errore && id ? `${id}-errore` : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Select({
  id,
  value,
  options,
  onChange,
}: {
  id?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/* ─────────────────────────── accordion ─────────────────────────── */

export function Accordion({
  id,
  title,
  hint,
  icon,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const { state, dispatch } = useStore();
  const aperto = !!state.ui.open[id];

  return (
    <section className="panel">
      <button
        type="button"
        className="panel-head"
        aria-expanded={aperto}
        aria-controls={`${id}-body`}
        onClick={() => dispatch({ type: 'toggleOpen', id })}
      >
        {icon && <span className="icon">{icon}</span>}
        <span className="title">{title}</span>
        {/* a pannello aperto il riepilogo è ridondante: si toglie invece di
            comparire troncato accanto a un titolo lungo */}
        <span className="hint">{aperto ? '' : hint}</span>
        <span className="caret">{aperto ? <CaretUp size={15} /> : <CaretDown size={15} />}</span>
      </button>
      {aperto && (
        <div className="panel-body" id={`${id}-body`}>
          <hr className="rule" />
          {children}
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────── blocco output ─────────────────────────── */

export interface VoceOutput {
  k: string;
  v: string;
  u?: string;
}

export function Output({ voci, titolo = 'Output' }: { voci: VoceOutput[]; titolo?: string }) {
  return (
    <div className="output">
      <div className="kicker">{titolo}</div>
      <div className="output-grid">
        {voci.map((o) => (
          <div className="output-item" key={o.k}>
            <span className="k">{o.k}</span>
            <span className="v">
              {o.v}
              {o.u ? <span className="u">{o.u}</span> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── controllo segmentato ───────────────────────── */

export interface OpzioneSeg<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
  /** Testo secondario (es. lo sfruttamento della verifica). */
  nota?: string;
}

/**
 * Con `ruolo="tabs"` è una vera navigazione a schede: role tablist/tab,
 * aria-selected, tabindex mobile e spostamento con le frecce.
 * Con `ruolo="group"` resta un gruppo di pulsanti a stato (aria-pressed).
 */
export function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
  ruolo = 'group',
  idPannello,
}: {
  value: T;
  options: OpzioneSeg<T>[];
  onChange: (v: T) => void;
  label: string;
  ruolo?: 'group' | 'tabs';
  idPannello?: string;
}) {
  const tabs = ruolo === 'tabs';
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (!tabs) return;
    let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % options.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + options.length) % options.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = options.length - 1;
    if (j < 0) return;
    e.preventDefault();
    onChange(options[j].id);
    refs.current[j]?.focus();
  };

  return (
    <div className="seg" role={tabs ? 'tablist' : 'group'} aria-label={label}>
      {options.map((o, i) => {
        const attivo = value === o.id;
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role={tabs ? 'tab' : undefined}
            id={tabs ? `tab-${o.id}` : undefined}
            className="seg-opt"
            aria-selected={tabs ? attivo : undefined}
            aria-pressed={tabs ? undefined : attivo}
            aria-controls={tabs ? idPannello : undefined}
            tabIndex={tabs ? (attivo ? 0 : -1) : undefined}
            onKeyDown={(e) => onKeyDown(e, i)}
            onClick={() => onChange(o.id)}
          >
            {o.icon}
            {o.label}
            {o.nota && <span className="seg-nota">{o.nota}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── esito verifica ─────────────────────────── */

export function Verdict({
  ok,
  margine,
  bloccato,
}: {
  ok: boolean;
  margine: number;
  /** true = dati in ingresso non validi: l'esito non viene dichiarato. */
  bloccato?: boolean;
}) {
  if (bloccato) return <span className="verdict dati">Esito non calcolabile</span>;
  const m = Number.isFinite(margine) ? margine : -100;
  return (
    <span className={`verdict ${ok ? 'ok' : 'ko'}`}>
      {ok ? 'Verificato' : 'Non verificato'}
      <strong style={{ fontWeight: 400, opacity: 0.85 }}>
        {m >= 0 ? '+' : ''}
        {m.toFixed(1)}%
      </strong>
    </span>
  );
}

export function Bar({ sfruttamento, bloccato }: { sfruttamento: number; bloccato?: boolean }) {
  if (bloccato) {
    return (
      <div className="bar dati" title="Dati in ingresso non validi">
        <span style={{ width: '100%' }} />
      </div>
    );
  }
  const s = Number.isFinite(sfruttamento) ? sfruttamento : 1;
  return (
    <div className={`bar ${s > 1 ? 'ko' : ''}`} title={`Sfruttamento ${(s * 100).toFixed(1)}%`}>
      <span style={{ width: `${Math.min(100, Math.max(0, s * 100))}%` }} />
    </div>
  );
}

import type { ReactNode } from 'react';
import { CaretDown, CaretUp, CaretUpDown, Info, BookOpenText } from '@phosphor-icons/react';
import { useStore } from '../state/store';
import type { TabId } from '../state/store';

/* ─────────────────────────── dettaglio di campo ─────────────────────────── */

export interface Dettaglio {
  formula: string;
  ref: string;
  coeffs?: { k: string; v: string }[];
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
      <div className="ref">
        <BookOpenText size={13} />
        {dettaglio.ref}
      </div>
    </div>
  );
}

/* ─────────────────────────── campo espandibile ─────────────────────────── */

interface FieldProps {
  id: string;
  tab: TabId;
  label: string;
  unit?: string;
  dettaglio?: Dettaglio;
  children: ReactNode;
}

/**
 * Riga compatta etichetta + controllo + unità + bottone info; il pannello
 * con formula, coefficienti e riferimento normativo è a scomparsa.
 */
export function Field({ id, tab, label, unit = '', dettaglio, children }: FieldProps) {
  const { state, dispatch } = useStore();
  const aperto = state.ui.allDetails[tab] || !!state.ui.exp[id];

  return (
    <div>
      <div className="field-row">
        <label htmlFor={id}>{label}</label>
        <div className="field-control">
          {children}
          <span className="field-unit">{unit}</span>
          {dettaglio ? (
            <button
              type="button"
              className="field-info"
              aria-expanded={aperto}
              aria-controls={`${id}-detail`}
              title="Formula e riferimenti"
              onClick={() => dispatch({ type: 'toggleExp', id })}
            >
              {aperto ? <CaretUpDown size={14} weight="fill" /> : <Info size={14} />}
            </button>
          ) : (
            <span className="field-info" style={{ border: 0 }} />
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
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      className="input num"
      type="text"
      inputMode="decimal"
      value={value}
      disabled={disabled}
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
        <span className="hint">{hint}</span>
        {aperto ? <CaretUp size={15} color="#9397ab" /> : <CaretDown size={15} color="#9397ab" />}
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

export function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className="seg-opt"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────── esito verifica ─────────────────────────── */

export function Verdict({ ok, margine }: { ok: boolean; margine: number }) {
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

export function Bar({ sfruttamento }: { sfruttamento: number }) {
  const s = Number.isFinite(sfruttamento) ? sfruttamento : 1;
  return (
    <div className={`bar ${s > 1 ? 'ko' : ''}`} title={`Sfruttamento ${(s * 100).toFixed(1)}%`}>
      <span style={{ width: `${Math.min(100, Math.max(0, s * 100))}%` }} />
    </div>
  );
}

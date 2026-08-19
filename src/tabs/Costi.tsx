import { ArrowSquareOut, Plus, Trash } from '@phosphor-icons/react';
import { useStore, type VoceCosto } from '../state/store';
import { num } from '../calc/azioni';
import { PREZZARI } from '../data/prezzario';

const eur = (v: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
    Number.isFinite(v) ? v : 0,
  );

const totale = (v: VoceCosto) => num(v.quantita) * num(v.prezzo);

/** Palette monocroma ocra: le fette si distinguono per luminosità, non per tinta. */
const TINTE = ['#c9932e', '#e0b25e', '#a5761d', '#f0d296', '#7d5915', '#f8e8c4'];

function Torta({ dati }: { dati: { categoria: string; valore: number }[] }) {
  const somma = dati.reduce((s, d) => s + d.valore, 0);
  if (somma <= 0) return null;

  const R = 60;
  const C = 70;
  let angolo = -Math.PI / 2;

  const fette = dati.map((d, i) => {
    const delta = (d.valore / somma) * 2 * Math.PI;
    const x1 = C + R * Math.cos(angolo);
    const y1 = C + R * Math.sin(angolo);
    angolo += delta;
    const x2 = C + R * Math.cos(angolo);
    const y2 = C + R * Math.sin(angolo);
    const largo = delta > Math.PI ? 1 : 0;
    const d1 =
      dati.length === 1
        ? `M${C},${C - R} A${R},${R} 0 1,1 ${C - 0.01},${C - R} Z`
        : `M${C},${C} L${x1},${y1} A${R},${R} 0 ${largo},1 ${x2},${y2} Z`;
    return <path key={d.categoria} d={d1} fill={TINTE[i % TINTE.length]} opacity={0.85} />;
  });

  return (
    <div className="row-wrap" style={{ alignItems: 'flex-start', gap: 18 }}>
      <svg viewBox="0 0 140 140" width={140} height={140} role="img" aria-label="Incidenza per categoria">
        {fette}
        <circle cx={C} cy={C} r={30} fill="var(--surface)" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200 }}>
        {dati.map((d, i) => (
          <div key={d.categoria} className="row-wrap" style={{ gap: 8, fontSize: 12 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: TINTE[i % TINTE.length],
                flex: 'none',
              }}
            />
            <span style={{ flex: 1 }}>{d.categoria}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
              {((d.valore / somma) * 100).toFixed(1)}%
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 92, textAlign: 'right' }}>
              {eur(d.valore)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Costi() {
  const { state, dispatch } = useStore();
  const voci = state.costi;

  const set = (id: string, patch: Partial<VoceCosto>) =>
    dispatch({ type: 'costi', voci: voci.map((v) => (v.id === id ? { ...v, ...patch } : v)) });

  const aggiungi = () =>
    dispatch({
      type: 'costi',
      voci: [
        ...voci,
        {
          id: `c${Date.now()}`,
          categoria: voci[voci.length - 1]?.categoria ?? 'Strutture in c.a.',
          codice: '',
          descrizione: '',
          um: 'm³',
          quantita: '0',
          prezzo: '0.00',
        },
      ],
    });

  const rimuovi = (id: string) => dispatch({ type: 'costi', voci: voci.filter((v) => v.id !== id) });

  const generale = voci.reduce((s, v) => s + totale(v), 0);

  const categorie = [...new Set(voci.map((v) => v.categoria))]
    .map((categoria) => ({
      categoria,
      valore: voci.filter((v) => v.categoria === categoria).reduce((s, v) => s + totale(v), 0),
    }))
    .sort((a, b) => b.valore - a.valore);

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-body" style={{ paddingTop: 12 }}>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ minWidth: 140 }}>Categoria</th>
                  <th style={{ width: 110 }}>Cod. prezzario</th>
                  <th style={{ minWidth: 240 }}>Descrizione</th>
                  <th style={{ width: 70 }}>U.m.</th>
                  <th className="num" style={{ width: 100 }}>
                    Quantità
                  </th>
                  <th className="num" style={{ width: 110 }}>
                    Prezzo unit.
                  </th>
                  <th className="num" style={{ width: 120 }}>
                    Totale
                  </th>
                  <th style={{ width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {voci.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <input
                        className="input"
                        value={v.categoria}
                        aria-label="Categoria"
                        onChange={(e) => set(v.id, { categoria: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={v.codice}
                        placeholder="—"
                        aria-label="Codice prezzario"
                        onChange={(e) => set(v.id, { codice: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={v.descrizione}
                        aria-label="Descrizione"
                        onChange={(e) => set(v.id, { descrizione: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={v.um}
                        aria-label="Unità di misura"
                        onChange={(e) => set(v.id, { um: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="input num"
                        inputMode="decimal"
                        value={v.quantita}
                        aria-label="Quantità"
                        onChange={(e) => set(v.id, { quantita: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="input num"
                        inputMode="decimal"
                        value={v.prezzo}
                        aria-label="Prezzo unitario"
                        onChange={(e) => set(v.id, { prezzo: e.target.value })}
                      />
                    </td>
                    <td className="num">{eur(totale(v))}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        title="Elimina voce"
                        onClick={() => rimuovi(v.id)}
                      >
                        <Trash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6}>Totale generale</td>
                  <td className="num">{eur(generale)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <button type="button" className="btn btn-secondary" style={{ marginTop: 10 }} onClick={aggiungi}>
            <Plus size={14} /> Aggiungi voce
          </button>

          <p className="note" style={{ marginTop: 12 }}>
            Prezzi e codici delle voci di partenza vengono dal{' '}
            <strong>prezzario FVG 2026/1</strong>; le quantità no, quelle vanno riscritte tutte. Il
            getto di c.a. è la voce «con esclusione del cassero», perché casseri e armature hanno una
            riga loro: usare la voce tutto compreso li farebbe pagare due volte. Se si cambia un
            prezzo a mano, si cambia anche il codice — o la riga racconta una bugia.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-body" style={{ paddingTop: 12 }}>
          <div className="section-title">Prezzari di riferimento</div>
          <div className="stack" style={{ gap: 8 }}>
            {PREZZARI.map((p) => (
              <div key={p.id} className="row-wrap" style={{ gap: 8, alignItems: 'baseline' }}>
                <a
                  className="btn btn-secondary"
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ flex: 'none' }}
                >
                  <ArrowSquareOut size={14} /> {p.sigla}
                </a>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 12 }}>{p.titolo}</div>
                  <div className="note" style={{ marginTop: 2 }}>
                    {p.nota}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-body" style={{ paddingTop: 12 }}>
          <div className="section-title">Incidenza per macrocategoria</div>
          <Torta dati={categorie} />
        </div>
      </section>
    </div>
  );
}

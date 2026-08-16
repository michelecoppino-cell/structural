import { useState } from 'react';
import { Waveform, Snowflake, Wind, Stack, Mountains, ListBullets } from '@phosphor-icons/react';
import { useCalcoli, useStore } from '../state/store';
import { num } from '../calc/azioni';
import { STATI_LIMITE, SUOLI, type StatoLimite } from '../calc/sismica';
import { validaAzioni } from '../calc/validazione';
import { ST, CU, ZONE_NEVE, VB0, ESPOSIZIONE, CAT, opzioniCp } from '../data/ntc2018';
import { REGIONI, comuniDi, provinceDi } from '../data/comuni';
import { Accordion, Field, NumInput, Origine, Output, Select } from '../components/ui';
import { Falda, Paramento, ProfiloVento, Spettro } from '../components/Disegni';

const fx = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

/** Etichetta della provenienza di un parametro del sito. */
const fonteDi = (manuale: boolean, fonte: string) =>
  manuale ? 'inserito a mano' : fonte === 'reticolo' ? 'reticolo' : 'zona sismica';

export default function Azioni() {
  const { state, dispatch } = useStore();
  const { azioni: r } = useCalcoli();
  const inp = state.azioni;
  const set = (patch: Partial<typeof inp>) => dispatch({ type: 'azioni', patch });
  const err = validaAzioni(inp);
  const [cpAperto, setCpAperto] = useState(false);
  /** Promemoria dei cp ordinari, con la falda calcolata sull'inclinazione data. */
  const cpOpzioni = opzioniCp(r.neve.alfa);

  const province = provinceDi(inp.regione);
  const comuni = comuniDi(inp.regione, inp.prov);

  /** Cambio di regione o provincia: si riparte dal primo comune disponibile. */
  const setRegione = (regione: string) => {
    const prov = provinceDi(regione)[0]?.sigla ?? '';
    setComune(regione, prov, comuniDi(regione, prov)[0]?.nome ?? '');
  };

  const setProvincia = (prov: string) => {
    setComune(inp.regione, prov, comuniDi(inp.regione, prov)[0]?.nome ?? '');
  };

  /** Il comune scelto è anche la località riportata in testata e in relazione. */
  const setComune = (regione: string, prov: string, comune: string) => {
    set({ regione, prov, comune });
    dispatch({ type: 'progetto', patch: { localita: `${comune} (${prov})` } });
  };

  /** Badge che dice da dove arriva il parametro sismico in uso. */
  const fonte = (manuale: boolean) => (
    <Origine
      testo={fonteDi(manuale, r.sisma.fonte)}
      titolo={manuale ? 'Valore imposto a mano: vince sul reticolo' : r.sisma.nota}
    />
  );

  return (
    <div className="stack-2col">
      <div className="col">
        {/* ── azione sismica ───────────────────────────────────────────── */}
        <Accordion
          id="sisma"
          title="Azione sismica"
          icon={<Waveform size={18} />}
          hint={`${r.sisma.sito} · zona ${r.sisma.zonaLabel ?? '—'} · ag ${fx(r.sisma.ag, 3)}g · Sd(T1) ${fx(r.sisma.Sd, 3)}g`}
        >
          <div className="panel-split">
            <div className="fields">
              <Field
                id="sisma_regione"
                tab="azioni"
                label="Regione"
                dettaglio={{
                  formula: 'Sito individuato per regione → provincia → comune sull’elenco ISTAT',
                  ref: 'Classificazione sismica nazionale — DPC, agg. 2024 (OPCM 3519/2006)',
                  coeffs: [{ k: 'comuni in provincia', v: String(comuni.length) }],
                }}
              >
                <Select
                  id="sisma_regione"
                  value={inp.regione}
                  options={REGIONI}
                  onChange={(v) => setRegione(v)}
                />
              </Field>

              <Field id="sisma_prov" tab="azioni" label="Provincia">
                <select
                  id="sisma_prov"
                  className="input"
                  value={inp.prov}
                  onChange={(e) => setProvincia(e.target.value)}
                >
                  {province.map((p) => (
                    <option key={p.sigla} value={p.sigla}>
                      {p.nome} ({p.sigla})
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                id="sisma_comune"
                tab="azioni"
                label="Comune"
                dettaglio={{
                  formula: r.sisma.nota,
                  ref: 'NTC2018 §3.2 — All. A e B, media pesata 1/d sui 4 nodi più vicini',
                  coeffs: [
                    { k: 'zona sismica', v: r.sisma.zonaLabel ?? '—' },
                    { k: 'ag/g', v: fx(r.sisma.ag, 3) },
                    { k: 'TR', v: `${fx(r.sisma.TR, 0)} anni` },
                  ],
                }}
              >
                <Select
                  id="sisma_comune"
                  value={inp.comune}
                  options={comuni.map((c) => c.nome)}
                  onChange={(v) => setComune(inp.regione, inp.prov, v)}
                />
              </Field>

              <Field
                id="sisma_sl"
                tab="azioni"
                label="Stato limite di riferimento"
                dettaglio={{
                  formula: `TR = −VR / ln(1 − PVR) = −${fx(r.sisma.VR, 0)} / ln(1 − ${fx(
                    STATI_LIMITE.find((s) => s.id === (inp.sl ?? 'SLV'))?.PVR ?? 0.1,
                  )}) = ${fx(r.sisma.TR, 0)} anni`,
                  ref: 'NTC2018 §3.2.1 — Tab. 3.2.I',
                  coeffs: r.sisma.statiLimite.map((s) => ({
                    k: s.id,
                    v: `TR ${fx(s.TR, 0)} anni · ag ${fx(s.ag, 3)} g`,
                  })),
                }}
              >
                <select
                  id="sisma_sl"
                  className="input"
                  value={inp.sl ?? 'SLV'}
                  onChange={(e) => set({ sl: e.target.value as StatoLimite })}
                >
                  {STATI_LIMITE.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                id="sisma_ag"
                tab="azioni"
                label="ag/g del sito"
                unit="g"
                origine={fonte(r.sisma.manuali.ag)}
                dettaglio={{
                  formula: r.sisma.nota,
                  ref:
                    r.sisma.fonte === 'zona'
                      ? 'OPCM 3519/2006, all. 1b — limite superiore di zona'
                      : 'NTC2018 §3.2.3 — All. B, interpolato per TR',
                  coeffs: [{ k: 'ag/g in uso', v: fx(r.sisma.ag, 3) }],
                }}
              >
                <NumInput
                  id="sisma_ag"
                  value={inp.agManuale}
                  placeholder="dal reticolo"
                  onChange={(v) => set({ agManuale: v })}
                />
              </Field>

              <Field
                id="sisma_suolo"
                tab="azioni"
                label="Categoria di sottosuolo"
                unit="SS"
                dettaglio={{
                  formula: `SS = ${fx(r.sisma.Ss)} e CC = ${fx(r.sisma.Cc)} calcolati con ag = ${fx(r.sisma.ag, 3)} g e F0 = ${fx(r.sisma.F0)}`,
                  ref: 'NTC2018 §3.2.3.2.1 — Tab. 3.2.IV',
                  coeffs: [
                    { k: 'SS', v: fx(r.sisma.Ss) },
                    { k: 'CC', v: fx(r.sisma.Cc) },
                    { k: 'sottosuolo', v: SUOLI[inp.suolo]?.descr ?? '—' },
                  ],
                }}
              >
                <Select
                  id="sisma_suolo"
                  value={inp.suolo}
                  options={Object.keys(SUOLI)}
                  onChange={(v) => set({ suolo: v })}
                />
              </Field>

              <Field
                id="sisma_topo"
                tab="azioni"
                label="Categoria topografica"
                unit="ST"
                dettaglio={{
                  formula: `S = SS · ST = ${fx(r.sisma.Ss)} · ${fx(r.sisma.St)} = ${fx(r.sisma.S)}`,
                  ref: 'NTC2018 §3.2.3.2.1 — Tab. 3.2.V',
                  coeffs: [{ k: 'ST', v: fx(r.sisma.St) }],
                }}
              >
                <Select id="sisma_topo" value={inp.topo} options={Object.keys(ST)} onChange={(v) => set({ topo: v })} />
              </Field>

              <Field
                id="sisma_vn"
                tab="azioni"
                label="Vita nominale VN"
                unit="anni"
                errore={err.vn}
                dettaglio={{
                  formula: `VR = VN · CU = ${fx(num(inp.vn), 0)} · ${fx(r.sisma.cu, 1)} = ${fx(r.sisma.VR, 0)} anni`,
                  ref: 'NTC2018 §2.4.1 — §2.4.3',
                  coeffs: [
                    { k: 'CU', v: fx(r.sisma.cu, 1) },
                    { k: 'VR', v: `${fx(r.sisma.VR, 0)} anni` },
                  ],
                }}
              >
                <NumInput id="sisma_vn" value={inp.vn} errore={!!err.vn} onChange={(v) => set({ vn: v })} />
              </Field>

              <Field
                id="sisma_cu"
                tab="azioni"
                label="Classe d'uso"
                unit="CU"
                dettaglio={{
                  formula: `VR = VN · CU = ${fx(r.sisma.VR, 0)} anni → TR (${inp.sl ?? 'SLV'}) = ${fx(r.sisma.TR, 0)} anni`,
                  ref: 'NTC2018 §2.4.2 — Tab. 2.4.II',
                  coeffs: [
                    { k: 'CU', v: fx(r.sisma.cu, 1) },
                    { k: 'VR', v: `${fx(r.sisma.VR, 0)} anni` },
                  ],
                }}
              >
                <Select id="sisma_cu" value={inp.cu} options={Object.keys(CU)} onChange={(v) => set({ cu: v })} />
              </Field>

              <Field
                id="sisma_f0"
                tab="azioni"
                label="F0"
                unit="—"
                origine={fonte(r.sisma.manuali.F0)}
                dettaglio={{
                  formula: `F0 = ${fx(r.sisma.F0, 3)} per TR = ${fx(r.sisma.TR, 0)} anni`,
                  ref: 'NTC2018 §3.2.3.2 — All. B, interpolato per TR',
                }}
              >
                <NumInput id="sisma_f0" value={inp.F0} placeholder="dal reticolo" onChange={(v) => set({ F0: v })} />
              </Field>

              <Field
                id="sisma_tcstar"
                tab="azioni"
                label="TC*"
                unit="s"
                origine={fonte(r.sisma.manuali.TCstar)}
                dettaglio={{
                  formula: `TC = CC · TC* = ${fx(r.sisma.Cc)} · ${fx(r.sisma.TCstar)} = ${fx(r.sisma.TC)} s; TB = TC/3 = ${fx(r.sisma.TB)} s; TD = 4.0·ag/g + 1.6 = ${fx(r.sisma.TD)} s`,
                  ref: 'NTC2018 §3.2.3.2.1 — eq. 3.2.5 ÷ 3.2.7',
                  coeffs: [
                    { k: 'TB', v: `${fx(r.sisma.TB)} s` },
                    { k: 'TC', v: `${fx(r.sisma.TC)} s` },
                    { k: 'TD', v: `${fx(r.sisma.TD)} s` },
                  ],
                }}
              >
                <NumInput
                  id="sisma_tcstar"
                  value={inp.TCstar}
                  placeholder="dal reticolo"
                  onChange={(v) => set({ TCstar: v })}
                />
              </Field>

              <Field
                id="sisma_q"
                tab="azioni"
                label="Fattore di comportamento q"
                unit="—"
                errore={err.q}
                dettaglio={{
                  formula: `Se plateau = ag · S · F0 = ${fx(r.sisma.ag, 3)} · ${fx(r.sisma.S)} · ${fx(r.sisma.F0)} = ${fx(r.sisma.SePlateau, 3)} g;  Sd(T1) = Se plateau / q = ${fx(r.sisma.SePlateau, 3)} / ${fx(r.sisma.q)} = ${fx(r.sisma.Sd, 3)} g`,
                  ref: 'NTC2018 §7.3.1 — §3.2.3.5',
                  coeffs: [
                    { k: 'Se plateau', v: `${fx(r.sisma.SePlateau, 3)} g` },
                    { k: 'Sd(T1)', v: `${fx(r.sisma.Sd, 3)} g` },
                  ],
                }}
              >
                <NumInput id="sisma_q" value={inp.q} errore={!!err.q} onChange={(v) => set({ q: v })} />
              </Field>
            </div>

            <div className="col-aside">
              <Spettro
                ag={r.sisma.ag}
                S={r.sisma.S}
                F0={r.sisma.F0}
                TB={r.sisma.TB}
                TC={r.sisma.TC}
                TD={r.sisma.TD}
                q={r.sisma.q}
              />

              <div className="output" style={{ marginBottom: 4 }}>
                <div className="kicker">Accelerazione di plateau — Se = ag · S · F0</div>
                <div className="output-grid">
                  <div className="output-item">
                    <span className="k">Se plateau</span>
                    <span className="v">
                      {fx(r.sisma.SePlateau, 3)}
                      <span className="u">g</span>
                    </span>
                  </div>
                  <div className="output-item">
                    <span className="k">Se plateau</span>
                    <span className="v">
                      {fx(r.sisma.SePlateauMS2, 2)}
                      <span className="u">m/s²</span>
                    </span>
                  </div>
                </div>
              </div>

              <Output
                voci={[
                  { k: 'Zona sismica', v: r.sisma.zonaLabel ?? '—' },
                  { k: 'ag/g', v: fx(r.sisma.ag, 3) },
                  { k: 'F0', v: fx(r.sisma.F0, 3) },
                  { k: 'TC*', v: fx(r.sisma.TCstar, 3), u: 's' },
                  { k: 'SS', v: fx(r.sisma.Ss) },
                  { k: 'S = SS·ST', v: fx(r.sisma.S) },
                  { k: 'TC', v: fx(r.sisma.TC), u: 's' },
                  { k: 'Se plateau', v: fx(r.sisma.SePlateau, 3), u: 'g' },
                  { k: 'Sd(T1) = Se/q', v: fx(r.sisma.Sd, 3), u: 'g' },
                  { k: 'VR', v: fx(r.sisma.VR, 0), u: 'anni' },
                  { k: `TR (${inp.sl ?? 'SLV'})`, v: fx(r.sisma.TR, 0), u: 'anni' },
                ]}
              />

              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Stato limite</th>
                      <th className="num">PVR</th>
                      <th className="num">TR</th>
                      <th className="num">ag/g</th>
                      <th className="num">F0</th>
                      <th className="num">TC*</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.sisma.statiLimite.map((s) => (
                      <tr
                        key={s.id}
                        style={s.id === (inp.sl ?? 'SLV') ? { color: 'var(--color-accent-300)' } : undefined}
                      >
                        <td title={s.label}>{s.id}</td>
                        <td className="num">
                          {fx((STATI_LIMITE.find((x) => x.id === s.id)?.PVR ?? 0) * 100, 0)}%
                        </td>
                        <td className="num">{fx(s.TR, 0)}</td>
                        <td className="num">{fx(s.ag, 3)}</td>
                        <td className="num">{fx(s.F0, 3)}</td>
                        <td className="num">{fx(s.TCstar, 3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="note">{r.sisma.nota}.</p>
            </div>
          </div>
        </Accordion>

        {/* ── neve ─────────────────────────────────────────────────────── */}
        <Accordion
          id="neve"
          title="Carico neve"
          icon={<Snowflake size={18} />}
          hint={`qsk ${fx(r.neve.qsk)} → qs ${fx(r.neve.qs)} kN/m²`}
        >
          <div className="panel-split">
            <div className="fields">
              <Field
                id="neve_zona"
                tab="azioni"
                label="Zona di carico"
                dettaglio={{
                  formula: `qsk = ${fx(ZONE_NEVE[inp.zneve]?.coef ?? 0)} · [1 + (as / ${ZONE_NEVE[inp.zneve]?.rif ?? 481})²] per as > 200 m`,
                  ref: 'NTC2018 §3.4.2 — Tab. 3.4.I',
                  coeffs: [{ k: 'qsk (as ≤ 200)', v: fx(ZONE_NEVE[inp.zneve]?.base ?? 0) }],
                }}
              >
                <Select
                  id="neve_zona"
                  value={inp.zneve}
                  options={Object.keys(ZONE_NEVE)}
                  onChange={(v) => set({ zneve: v })}
                />
              </Field>

              <Field
                id="neve_as"
                tab="azioni"
                label="Quota sul livello del mare as"
                unit="m"
                errore={err.as}
                dettaglio={{
                  formula: `qsk = ${fx(r.neve.qsk)} kN/m² per as = ${fx(num(inp.as), 0)} m`,
                  ref: 'NTC2018 §3.4.2',
                  coeffs: [{ k: 'qsk', v: `${fx(r.neve.qsk)} kN/m²` }],
                }}
              >
                <NumInput id="neve_as" value={inp.as} errore={!!err.as} onChange={(v) => set({ as: v })} />
              </Field>

              <Field
                id="neve_alfa"
                tab="azioni"
                label="Inclinazione della falda α"
                unit="°"
                errore={err.alfaNeve}
                dettaglio={{
                  formula: `μ1 = ${fx(r.neve.muSuggerito)} per α = ${fx(r.neve.alfa, 0)}° (0.80 fino a 30°, poi in calo lineare fino a 0 a 60°)`,
                  ref: 'NTC2018 §3.4.5.1 — Tab. 3.4.II',
                  coeffs: [{ k: 'μ1 da α', v: fx(r.neve.muSuggerito) }],
                }}
              >
                <NumInput
                  id="neve_alfa"
                  value={inp.alfaNeve}
                  errore={!!err.alfaNeve}
                  onChange={(v) => set({ alfaNeve: v })}
                />
              </Field>

              <Field
                id="neve_mu"
                tab="azioni"
                label="Coefficiente di forma μ1"
                unit="—"
                errore={err.mu}
                origine={
                  Math.abs(r.neve.mu - r.neve.muSuggerito) < 0.005 ? (
                    <Origine testo={`da α = ${fx(r.neve.alfa, 0)}°`} titolo="Coincide con Tab. 3.4.II" />
                  ) : (
                    <Origine
                      testo="a mano"
                      titolo={`Tab. 3.4.II darebbe μ1 = ${fx(r.neve.muSuggerito)} per α = ${fx(r.neve.alfa, 0)}°: premi per allinearlo`}
                      onClick={() => set({ mu: r.neve.muSuggerito.toFixed(2) })}
                    />
                  )
                }
                dettaglio={{
                  formula: 'μ1 = 0.80 per 0° ≤ α ≤ 30°; riduzione lineare fino a 0 per α = 60°',
                  ref: 'NTC2018 §3.4.5.1 — Tab. 3.4.II',
                  coeffs: [{ k: 'μ1 da α', v: fx(r.neve.muSuggerito) }],
                }}
              >
                <NumInput id="neve_mu" value={inp.mu} errore={!!err.mu} onChange={(v) => set({ mu: v })} />
              </Field>

              <Field
                id="neve_ce"
                tab="azioni"
                label="Coefficiente di esposizione CE"
                unit="—"
                errore={err.ceN}
                dettaglio={{
                  formula: `qs = μ1 · qsk · CE · Ct = ${fx(r.neve.mu)} · ${fx(r.neve.qsk)} · ${fx(r.neve.ce)} · ${fx(r.neve.ct)} = ${fx(r.neve.qs)} kN/m²`,
                  ref: 'NTC2018 §3.4.3 — Tab. 3.4.I',
                }}
              >
                <NumInput id="neve_ce" value={inp.ceN} errore={!!err.ceN} onChange={(v) => set({ ceN: v })} />
              </Field>

              <Field
                id="neve_ct"
                tab="azioni"
                label="Coefficiente termico Ct"
                unit="—"
                errore={err.ct}
                dettaglio={{
                  formula: 'Ct = 1.00 in assenza di studio specifico sulla trasmittanza della copertura',
                  ref: 'NTC2018 §3.4.4',
                }}
              >
                <NumInput id="neve_ct" value={inp.ct} errore={!!err.ct} onChange={(v) => set({ ct: v })} />
              </Field>
            </div>

            <div className="col-aside">
              <Falda qsk={r.neve.qsk} qs={r.neve.qs} mu={r.neve.mu} alfa={r.neve.alfa} />
              <Output
                voci={[
                  { k: 'qsk', v: fx(r.neve.qsk), u: 'kN/m²' },
                  { k: 'qs (falda)', v: fx(r.neve.qs), u: 'kN/m²' },
                  { k: 'μ1 · CE · Ct', v: fx(r.neve.mu * r.neve.ce * r.neve.ct) },
                ]}
              />
            </div>
          </div>
        </Accordion>
      </div>

      <div className="col">
        {/* ── vento ────────────────────────────────────────────────────── */}
        <Accordion
          id="vento"
          title="Azione del vento"
          icon={<Wind size={18} />}
          hint={`vb ${fx(r.vento.vb, 0)} m/s · p ${fx(r.vento.p)} kN/m²`}
        >
          <div className="panel-split">
            <div className="fields fields-1">
              <Field
                id="vento_zona"
                tab="azioni"
                label="Zona di vento"
                dettaglio={{
                  formula: 'vb = vb,0 · ca   con ca = 1 per as ≤ a0',
                  ref: 'NTC2018 §3.3.2 — Tab. 3.3.I',
                  coeffs: [{ k: 'vb,0', v: `${fx(r.vento.vb, 0)} m/s` }],
                }}
              >
                <Select id="vento_zona" value={inp.zvento} options={Object.keys(VB0)} onChange={(v) => set({ zvento: v })} />
              </Field>

              <Field
                id="vento_z"
                tab="azioni"
                label="Quota di riferimento z"
                unit="m"
                errore={err.z}
                dettaglio={{
                  formula: `qb = ½ · ρ · vb² = 0.5 · 1.25 · ${fx(r.vento.vb, 0)}² = ${fx(r.vento.qb, 3)} kN/m²`,
                  ref: 'NTC2018 §3.3.6',
                  coeffs: [
                    { k: 'ρ', v: '1.25 kg/m³' },
                    { k: 'zmin', v: `${ESPOSIZIONE[inp.espo]?.zmin ?? 5} m` },
                  ],
                }}
              >
                <NumInput id="vento_z" value={inp.z} errore={!!err.z} onChange={(v) => set({ z: v })} />
              </Field>

              <Field
                id="vento_espo"
                tab="azioni"
                label="Categoria di esposizione"
                unit="ce"
                dettaglio={{
                  formula: `ce(z) = kr² · ct · ln(z/z0) · [7 + ct · ln(z/z0)] = ${fx(r.vento.ce)}`,
                  ref: 'NTC2018 §3.3.7 — Tab. 3.3.II',
                  coeffs: [
                    { k: 'kr', v: fx(ESPOSIZIONE[inp.espo]?.kr ?? 0, 2) },
                    { k: 'z0', v: `${fx(ESPOSIZIONE[inp.espo]?.z0 ?? 0, 2)} m` },
                    { k: 'ce', v: fx(r.vento.ce) },
                  ],
                }}
              >
                <Select id="vento_espo" value={inp.espo} options={Object.keys(ESPOSIZIONE)} onChange={(v) => set({ espo: v })} />
              </Field>

              <Field
                id="vento_cp"
                tab="azioni"
                label="Coefficiente di forma cp"
                unit="—"
                dettaglio={{
                  formula: `p = qb · ce · cp · cd = ${fx(r.vento.qb, 3)} · ${fx(r.vento.ce)} · ${fx(r.vento.cp)} · ${fx(r.vento.cd)} = ${fx(r.vento.p)} kN/m²`,
                  ref: 'Circolare 2019 §C3.3.8 — casi ordinari; per il resto CNR-DT 207',
                  coeffs: cpOpzioni.map((o) => ({ k: o.label, v: o.cp.toFixed(2) })),
                }}
              >
                <NumInput id="vento_cp" value={inp.cp} onChange={(v) => set({ cp: v })} />
              </Field>

              {/* il cp resta scritto a mano: qui c'è solo il promemoria dei casi
                  ordinari, da cui si può pescare il valore con un clic */}
              <div className="campo-largo">
                <button
                  type="button"
                  className="btn btn-secondary"
                  aria-expanded={cpAperto}
                  aria-controls="vento-cp-elenco"
                  onClick={() => setCpAperto((v) => !v)}
                >
                  <ListBullets size={14} />
                  Valori di cp di uso corrente
                </button>

                {cpAperto && (
                  <div className="cp-elenco" id="vento-cp-elenco">
                    {cpOpzioni.map((o) => (
                      <button
                        key={o.label}
                        type="button"
                        className={`cp-voce${num(inp.cp) === o.cp ? ' is-attiva' : ''}`}
                        title={o.ref}
                        onClick={() => set({ cp: o.cp.toFixed(2) })}
                      >
                        <span className="v">{o.cp > 0 ? `+${o.cp.toFixed(2)}` : o.cp.toFixed(2)}</span>
                        <span className="t">{o.label}</span>
                        <span className="r">{o.ref}</span>
                      </button>
                    ))}
                    <p className="note" style={{ marginTop: 8 }}>
                      Sono i casi ordinari di edifici a pianta rettangolare. Tettoie, coperture curve,
                      corpi isolati ed effetti locali sui bordi stanno nella <strong>CNR-DT 207</strong>:
                      il valore lo scrivi tu nel campo qui sopra.
                    </p>
                  </div>
                )}
              </div>

              <Field
                id="vento_cd"
                tab="azioni"
                label="Coefficiente dinamico cd"
                unit="—"
                errore={err.cd}
                dettaglio={{
                  formula: 'cd = 1.00 per costruzioni di forma e rigidezza ordinarie',
                  ref: 'NTC2018 §3.3.8',
                }}
              >
                <NumInput id="vento_cd" value={inp.cd} errore={!!err.cd} onChange={(v) => set({ cd: v })} />
              </Field>
            </div>

            <div className="col-aside">
              <ProfiloVento
                z={num(inp.z)}
                qb={r.vento.qb}
                cp={r.vento.cp}
                cd={r.vento.cd}
                kr={ESPOSIZIONE[inp.espo]?.kr ?? 0.2}
                z0={ESPOSIZIONE[inp.espo]?.z0 ?? 0.1}
                zmin={ESPOSIZIONE[inp.espo]?.zmin ?? 5}
              />
              <Output
                voci={[
                  { k: 'vb', v: fx(r.vento.vb, 0), u: 'm/s' },
                  { k: 'qb', v: fx(r.vento.qb, 3), u: 'kN/m²' },
                  { k: 'ce(z)', v: fx(r.vento.ce) },
                  { k: 'p sopravento', v: fx(r.vento.p), u: 'kN/m²' },
                  { k: 'p sottovento', v: fx(r.vento.pSotto), u: 'kN/m²' },
                ]}
              />
            </div>
          </div>
        </Accordion>

        {/* ── carichi variabili ────────────────────────────────────────── */}
        <Accordion
          id="vari"
          title="Carichi variabili — Tab. 3.1.II"
          icon={<Stack size={18} />}
          hint={`${inp.cat} · qk ${fx(r.variabili.qk)} kN/m²`}
        >
          <div className="fields">
            <Field
              id="vari_cat"
              tab="azioni"
              label="Categoria d'uso"
              dettaglio={{
                formula: 'qk, Qk, Hk assegnati per categoria d’ambiente secondo Tab. 3.1.II',
                ref: 'NTC2018 §3.1.4 — Tab. 3.1.II',
                coeffs: [
                  { k: 'qk', v: `${fx(r.variabili.qk)} kN/m²` },
                  { k: 'Qk', v: `${fx(r.variabili.Qk)} kN` },
                  { k: 'Hk', v: `${fx(r.variabili.Hk)} kN/m` },
                ],
                tabella: {
                  intestazioni: ['Categoria', 'qk kN/m²', 'Qk kN', 'Hk kN/m', 'ψ0', 'ψ1', 'ψ2'],
                  righe: Object.entries(CAT).map(([nome, v]) => [nome, ...v]),
                  evidenzia: Object.keys(CAT).indexOf(inp.cat),
                },
              }}
            >
              <Select id="vari_cat" value={inp.cat} options={Object.keys(CAT)} onChange={(v) => set({ cat: v })} />
            </Field>

            <Field
              id="vari_psi"
              tab="azioni"
              label="Coefficienti di combinazione ψ"
              unit="—"
              dettaglio={{
                formula: `SLU: γQ · qk = 1.50 · ${fx(r.variabili.qk)} = ${fx(1.5 * r.variabili.qk)} kN/m² (azione principale)`,
                ref: 'NTC2018 §2.5.3 — Tab. 2.5.I',
                coeffs: [
                  { k: 'ψ0', v: fx(r.variabili.psi0) },
                  { k: 'ψ1', v: fx(r.variabili.psi1) },
                  { k: 'ψ2', v: fx(r.variabili.psi2) },
                ],
              }}
            >
              <input
                className="input num"
                readOnly
                value={`ψ0 ${fx(r.variabili.psi0)} · ψ2 ${fx(r.variabili.psi2)}`}
              />
            </Field>
          </div>

          <Output
            voci={[
              { k: 'qk', v: fx(r.variabili.qk), u: 'kN/m²' },
              { k: 'Qk', v: fx(r.variabili.Qk), u: 'kN' },
              { k: 'Hk', v: fx(r.variabili.Hk), u: 'kN/m' },
            ]}
          />
        </Accordion>

        {/* ── spinta delle terre ───────────────────────────────────────── */}
        <Accordion
          id="terre"
          title="Spinta delle terre"
          icon={<Mountains size={18} />}
          hint={`Ka ${fx(r.terre.ka, 3)} · Sa ${fx(r.terre.Sa, 1)} kN/m`}
        >
          <div className="panel-split">
            <div className="fields">
              <Field
                id="terre_g"
                tab="azioni"
                label="Peso di volume γ"
                unit="kN/m³"
                errore={err.gamma}
                dettaglio={{
                  formula: `Sa = ½ · γ · H² · Ka = 0.5 · ${fx(num(inp.gamma), 1)} · ${fx(num(inp.H))}² · ${fx(r.terre.ka, 3)} = ${fx(r.terre.Sa, 1)} kN/m`,
                  ref: 'NTC2018 §6.5.3 — teoria di Rankine',
                }}
              >
                <NumInput id="terre_g" value={inp.gamma} errore={!!err.gamma} onChange={(v) => set({ gamma: v })} />
              </Field>

              <Field
                id="terre_phi"
                tab="azioni"
                label="Angolo di attrito φ′"
                unit="°"
                errore={err.phi}
                dettaglio={{
                  formula: `Ka = tan²(45° − φ′/2) = tan²(45 − ${fx(num(inp.phi), 0)}/2) = ${fx(r.terre.ka, 3)}`,
                  ref: 'NTC2018 §6.5.3.1.1',
                  coeffs: [{ k: 'Ka', v: fx(r.terre.ka, 3) }],
                }}
              >
                <NumInput id="terre_phi" value={inp.phi} errore={!!err.phi} onChange={(v) => set({ phi: v })} />
              </Field>

              <Field
                id="terre_H"
                tab="azioni"
                label="Altezza del paramento H"
                unit="m"
                errore={err.H}
                dettaglio={{
                  formula: `za = H/3 = ${fx(r.terre.za)} m dal piede; Mrib = Sa · za = ${fx(r.terre.Mrib, 1)} kNm/m`,
                  ref: 'NTC2018 §6.5.3.1.2',
                }}
              >
                <NumInput id="terre_H" value={inp.H} errore={!!err.H} onChange={(v) => set({ H: v })} />
              </Field>

              <Field
                id="terre_d"
                tab="azioni"
                label="Inclinazione δ del muro"
                unit="°"
                dettaglio={{
                  formula: 'δ = 0 → spinta orizzontale; per δ ≠ 0 si applica il coefficiente di Coulomb',
                  ref: 'NTC2018 §6.5.3.1.1',
                }}
              >
                <NumInput id="terre_d" value={inp.delta} onChange={(v) => set({ delta: v })} />
              </Field>
            </div>

            <div className="col-aside">
              <Paramento H={num(inp.H)} ka={r.terre.ka} Sa={r.terre.Sa} za={r.terre.za} />
              <Output
                voci={[
                  { k: 'Ka', v: fx(r.terre.ka, 3) },
                  { k: 'Sa', v: fx(r.terre.Sa, 1), u: 'kN/m' },
                  { k: 'za', v: fx(r.terre.za), u: 'm' },
                  { k: 'Mribaltante', v: fx(r.terre.Mrib, 1), u: 'kNm/m' },
                ]}
              />
            </div>
          </div>
        </Accordion>
      </div>
    </div>
  );
}

import { Waveform, Snowflake, Wind, Stack, Mountains } from '@phosphor-icons/react';
import { useStore } from '../state/store';
import { calcolaAzioni, num } from '../calc/azioni';
import { AG, SS, ST, CU, ZONE_NEVE, VB0, ESPOSIZIONE, CAT } from '../data/ntc2018';
import { Accordion, Field, NumInput, Output, Select } from '../components/ui';

const fx = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

export default function Azioni() {
  const { state, dispatch } = useStore();
  const inp = state.azioni;
  const r = calcolaAzioni(inp);
  const set = (patch: Partial<typeof inp>) => dispatch({ type: 'azioni', patch });

  return (
    <div className="stack">
      {/* ── azione sismica ─────────────────────────────────────────────── */}
      <Accordion
        id="sisma"
        title="Azione sismica"
        icon={<Waveform size={18} />}
        hint={`ag ${fx(r.sisma.ag, 3)}g · S ${fx(r.sisma.S)} · Sd(T1) ${fx(r.sisma.Sd, 3)}g`}
      >
        <div className="fields">
          <Field
            id="sisma_loc"
            tab="azioni"
            label="Località"
            dettaglio={{
              formula: 'ag, F0, TC* interpolati dal reticolo di riferimento sui 4 nodi più vicini',
              ref: 'NTC2018 §3.2.3 — All. B',
              coeffs: [{ k: 'ag/g', v: fx(r.sisma.ag, 3) }],
            }}
          >
            <Select id="sisma_loc" value={inp.loc} options={Object.keys(AG)} onChange={(v) => set({ loc: v })} />
          </Field>

          <Field
            id="sisma_suolo"
            tab="azioni"
            label="Categoria di sottosuolo"
            unit="SS"
            dettaglio={{
              formula: `SS = ${fx(r.sisma.Ss)} da tabella, in funzione di Vs,eq`,
              ref: 'NTC2018 §3.2.3.2.1 — Tab. 3.2.IV',
              coeffs: [{ k: 'SS', v: fx(r.sisma.Ss) }],
            }}
          >
            <Select id="sisma_suolo" value={inp.suolo} options={Object.keys(SS)} onChange={(v) => set({ suolo: v })} />
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
            dettaglio={{
              formula: `VR = VN · CU = ${fx(num(inp.vn), 0)} · ${fx(r.sisma.cu, 1)} = ${fx(r.sisma.VR, 0)} anni`,
              ref: 'NTC2018 §2.4.1 — §2.4.3',
              coeffs: [
                { k: 'CU', v: fx(r.sisma.cu, 1) },
                { k: 'VR', v: `${fx(r.sisma.VR, 0)} anni` },
              ],
            }}
          >
            <NumInput id="sisma_vn" value={inp.vn} onChange={(v) => set({ vn: v })} />
          </Field>

          <Field
            id="sisma_cu"
            tab="azioni"
            label="Classe d'uso"
            unit="CU"
            dettaglio={{
              formula: `TR = −VR / ln(1 − PVR) = −${fx(r.sisma.VR, 0)} / ln(1 − 0.10) = ${fx(r.sisma.TR, 0)} anni`,
              ref: 'NTC2018 §2.4.2 — Tab. 2.4.II',
              coeffs: [
                { k: 'SL', v: 'SLV' },
                { k: 'PVR', v: '10%' },
              ],
            }}
          >
            <Select id="sisma_cu" value={inp.cu} options={Object.keys(CU)} onChange={(v) => set({ cu: v })} />
          </Field>

          <Field
            id="sisma_f0"
            tab="azioni"
            label="Fattore di amplificazione F0"
            unit="—"
            dettaglio={{
              formula: 'F0 dal reticolo di riferimento per il periodo di ritorno considerato',
              ref: 'NTC2018 §3.2.3.2 — All. B',
            }}
          >
            <NumInput id="sisma_f0" value={inp.F0} onChange={(v) => set({ F0: v })} />
          </Field>

          <Field
            id="sisma_q"
            tab="azioni"
            label="Fattore di comportamento q"
            unit="—"
            dettaglio={{
              formula: `Sd(T1) = ag · S · F0 / q = ${fx(r.sisma.ag, 3)} · ${fx(r.sisma.S)} · ${fx(r.sisma.F0)} / ${fx(r.sisma.q)} = ${fx(r.sisma.Sd, 3)} g`,
              ref: 'NTC2018 §7.3.1 — §3.2.3.5',
              coeffs: [{ k: 'Sd(T1)', v: `${fx(r.sisma.Sd, 3)} g` }],
            }}
          >
            <NumInput id="sisma_q" value={inp.q} onChange={(v) => set({ q: v })} />
          </Field>
        </div>

        <Output
          voci={[
            { k: 'ag/g', v: fx(r.sisma.ag, 3) },
            { k: 'S = SS·ST', v: fx(r.sisma.S) },
            { k: 'Sd(T1)', v: fx(r.sisma.Sd, 3), u: 'g' },
            { k: 'VR', v: fx(r.sisma.VR, 0), u: 'anni' },
            { k: 'TR (SLV)', v: fx(r.sisma.TR, 0), u: 'anni' },
          ]}
        />
      </Accordion>

      {/* ── neve ───────────────────────────────────────────────────────── */}
      <Accordion
        id="neve"
        title="Carico neve"
        icon={<Snowflake size={18} />}
        hint={`qsk ${fx(r.neve.qsk)} → qs ${fx(r.neve.qs)} kN/m²`}
      >
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
            <Select id="neve_zona" value={inp.zneve} options={Object.keys(ZONE_NEVE)} onChange={(v) => set({ zneve: v })} />
          </Field>

          <Field
            id="neve_as"
            tab="azioni"
            label="Quota sul livello del mare as"
            unit="m"
            dettaglio={{
              formula: `qsk = ${fx(r.neve.qsk)} kN/m² per as = ${fx(num(inp.as), 0)} m`,
              ref: 'NTC2018 §3.4.2',
              coeffs: [{ k: 'qsk', v: `${fx(r.neve.qsk)} kN/m²` }],
            }}
          >
            <NumInput id="neve_as" value={inp.as} onChange={(v) => set({ as: v })} />
          </Field>

          <Field
            id="neve_mu"
            tab="azioni"
            label="Coefficiente di forma μ1"
            unit="—"
            dettaglio={{
              formula: 'μ1 = 0.80 per 0° ≤ α ≤ 30°; riduzione lineare fino a 0 per α = 60°',
              ref: 'NTC2018 §3.4.5.1 — Tab. 3.4.II',
            }}
          >
            <NumInput id="neve_mu" value={inp.mu} onChange={(v) => set({ mu: v })} />
          </Field>

          <Field
            id="neve_ce"
            tab="azioni"
            label="Coefficiente di esposizione CE"
            unit="—"
            dettaglio={{
              formula: `qs = μ1 · qsk · CE · Ct = ${fx(r.neve.mu)} · ${fx(r.neve.qsk)} · ${fx(r.neve.ce)} · ${fx(r.neve.ct)} = ${fx(r.neve.qs)} kN/m²`,
              ref: 'NTC2018 §3.4.3 — Tab. 3.4.I',
            }}
          >
            <NumInput id="neve_ce" value={inp.ceN} onChange={(v) => set({ ceN: v })} />
          </Field>

          <Field
            id="neve_ct"
            tab="azioni"
            label="Coefficiente termico Ct"
            unit="—"
            dettaglio={{
              formula: 'Ct = 1.00 in assenza di studio specifico sulla trasmittanza della copertura',
              ref: 'NTC2018 §3.4.4',
            }}
          >
            <NumInput id="neve_ct" value={inp.ct} onChange={(v) => set({ ct: v })} />
          </Field>
        </div>

        <Output
          voci={[
            { k: 'qsk', v: fx(r.neve.qsk), u: 'kN/m²' },
            { k: 'qs (falda)', v: fx(r.neve.qs), u: 'kN/m²' },
            { k: 'μ1 · CE · Ct', v: fx(r.neve.mu * r.neve.ce * r.neve.ct) },
          ]}
        />
      </Accordion>

      {/* ── vento ──────────────────────────────────────────────────────── */}
      <Accordion
        id="vento"
        title="Azione del vento"
        icon={<Wind size={18} />}
        hint={`vb ${fx(r.vento.vb, 0)} m/s · p ${fx(r.vento.p)} kN/m²`}
      >
        <div className="fields">
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
            dettaglio={{
              formula: `qb = ½ · ρ · vb² = 0.5 · 1.25 · ${fx(r.vento.vb, 0)}² = ${fx(r.vento.qb, 3)} kN/m²`,
              ref: 'NTC2018 §3.3.6',
              coeffs: [
                { k: 'ρ', v: '1.25 kg/m³' },
                { k: 'zmin', v: `${ESPOSIZIONE[inp.espo]?.zmin ?? 5} m` },
              ],
            }}
          >
            <NumInput id="vento_z" value={inp.z} onChange={(v) => set({ z: v })} />
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
              ref: 'NTC2018 §3.3.4 — All. C',
              coeffs: [
                { k: 'sopravento', v: '+0.80' },
                { k: 'sottovento', v: '−0.40' },
              ],
            }}
          >
            <NumInput id="vento_cp" value={inp.cp} onChange={(v) => set({ cp: v })} />
          </Field>

          <Field
            id="vento_cd"
            tab="azioni"
            label="Coefficiente dinamico cd"
            unit="—"
            dettaglio={{
              formula: 'cd = 1.00 per costruzioni di forma e rigidezza ordinarie',
              ref: 'NTC2018 §3.3.8',
            }}
          >
            <NumInput id="vento_cd" value={inp.cd} onChange={(v) => set({ cd: v })} />
          </Field>
        </div>

        <Output
          voci={[
            { k: 'vb', v: fx(r.vento.vb, 0), u: 'm/s' },
            { k: 'qb', v: fx(r.vento.qb, 3), u: 'kN/m²' },
            { k: 'ce(z)', v: fx(r.vento.ce) },
            { k: 'p sopravento', v: fx(r.vento.p), u: 'kN/m²' },
            { k: 'p sottovento', v: fx(r.vento.pSotto), u: 'kN/m²' },
          ]}
        />
      </Accordion>

      {/* ── carichi variabili ──────────────────────────────────────────── */}
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

      {/* ── spinta delle terre ─────────────────────────────────────────── */}
      <Accordion
        id="terre"
        title="Spinta delle terre"
        icon={<Mountains size={18} />}
        hint={`Ka ${fx(r.terre.ka, 3)} · Sa ${fx(r.terre.Sa, 1)} kN/m`}
      >
        <div className="fields">
          <Field
            id="terre_g"
            tab="azioni"
            label="Peso di volume γ"
            unit="kN/m³"
            dettaglio={{
              formula: `Sa = ½ · γ · H² · Ka = 0.5 · ${fx(num(inp.gamma), 1)} · ${fx(num(inp.H))}² · ${fx(r.terre.ka, 3)} = ${fx(r.terre.Sa, 1)} kN/m`,
              ref: 'NTC2018 §6.5.3 — teoria di Rankine',
            }}
          >
            <NumInput id="terre_g" value={inp.gamma} onChange={(v) => set({ gamma: v })} />
          </Field>

          <Field
            id="terre_phi"
            tab="azioni"
            label="Angolo di attrito φ′"
            unit="°"
            dettaglio={{
              formula: `Ka = tan²(45° − φ′/2) = tan²(45 − ${fx(num(inp.phi), 0)}/2) = ${fx(r.terre.ka, 3)}`,
              ref: 'NTC2018 §6.5.3.1.1',
              coeffs: [{ k: 'Ka', v: fx(r.terre.ka, 3) }],
            }}
          >
            <NumInput id="terre_phi" value={inp.phi} onChange={(v) => set({ phi: v })} />
          </Field>

          <Field
            id="terre_H"
            tab="azioni"
            label="Altezza del paramento H"
            unit="m"
            dettaglio={{
              formula: `za = H/3 = ${fx(r.terre.za)} m dal piede; Mrib = Sa · za = ${fx(r.terre.Mrib, 1)} kNm/m`,
              ref: 'NTC2018 §6.5.3.1.2',
            }}
          >
            <NumInput id="terre_H" value={inp.H} onChange={(v) => set({ H: v })} />
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

        <Output
          voci={[
            { k: 'Ka', v: fx(r.terre.ka, 3) },
            { k: 'Sa', v: fx(r.terre.Sa, 1), u: 'kN/m' },
            { k: 'za', v: fx(r.terre.za), u: 'm' },
            { k: 'Mribaltante', v: fx(r.terre.Mrib, 1), u: 'kNm/m' },
          ]}
        />
      </Accordion>
    </div>
  );
}

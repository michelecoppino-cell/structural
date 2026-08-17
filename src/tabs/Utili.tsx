import { useMemo, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { ComandiScheda } from '../components/ComandiScheda';
import { TABELLA_ARMATURE } from '../data/armature';
import { BULLONI, CLASSI_BULLONE, TAGLIE_BULLONE } from '../data/bulloni';
import { ACCIAI, CLS, COEFF_DEFAULT, SIGLE_ACCIAIO, ecmCLS, fctkCLS, fctmCLS } from '../data/materiali';
import {
  TIPI_PROFILO,
  proprietaProfilo,
  taglieDisponibili,
  type TipoProfilo,
} from '../data/profili-acciaio';

const fx = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

const normalizza = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Una tabella della libreria: intestazione, righe e — dietro alle quinte — il
 * testo su cui lavora la ricerca, così una tabella che non c'entra sparisce
 * invece di restare vuota.
 */
function Tabella({
  titolo,
  sotto,
  colonne,
  righe,
  testo = 1,
  nota,
}: {
  titolo: string;
  sotto?: string;
  colonne: string[];
  righe: { chiave: string; celle: string[] }[];
  /** Quante colonne di testa sono testo: le altre vanno in colonna, a destra. */
  testo?: number;
  nota?: React.ReactNode;
}) {
  if (!righe.length) return null;
  return (
    <section className="panel">
      <div className="panel-body" style={{ paddingTop: 12 }}>
        <div className="calc-colonna-testa">
          <span className="t">{titolo}</span>
          {sotto && <span className="d">{sotto}</span>}
        </div>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                {colonne.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {righe.map((r) => (
                <tr key={r.chiave}>
                  {r.celle.map((c, i) => (
                    <td key={colonne[i]} className={i < testo ? undefined : 'num'}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {nota && <p className="note">{nota}</p>}
      </div>
    </section>
  );
}

export default function Utili() {
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState<TipoProfilo>('IPE');

  const chiavi = normalizza(q).split(/\s+/).filter(Boolean);
  /** Una riga resta se tutte le parole cercate compaiono nel suo testo. */
  const filtra = <T extends { chiave: string; celle: string[] }>(righe: T[], titolo: string): T[] => {
    if (!chiavi.length) return righe;
    if (chiavi.every((k) => normalizza(titolo).includes(k))) return righe;
    return righe.filter((r) => {
      const t = normalizza(`${r.chiave} ${r.celle.join(' ')}`);
      return chiavi.every((k) => t.includes(k));
    });
  };

  const armature = TABELLA_ARMATURE.map((r) => ({
    chiave: `⌀${r.fi} fi${r.fi} barra ferro armatura`,
    celle: [`⌀${r.fi}`, fx(r.area, 1), fx(r.peso, 3), fx(r.mandrino, 0), fx(r.raggio, 0)],
  }));

  const profili = useMemo(
    () =>
      taglieDisponibili(tipo).flatMap((taglia) => {
        const p = proprietaProfilo(tipo, taglia);
        if (!p) return [];
        // le taglie a tabella portano già la sigla (`IPE 200`), quelle di tubi
        // e angolari no (`100x6`): la si mette solo dove manca
        const nome = taglia.startsWith(tipo) ? taglia : `${tipo} ${taglia}`;
        return [
          {
            chiave: `${nome} ${taglia}`,
            celle: [
              nome,
              fx(p.h, 1),
              fx(p.b, 1),
              fx(p.A, 2),
              fx(p.Ix, 0),
              fx(p.Wx, 1),
              fx(p.Iy, 0),
              fx(p.Wy, 1),
              fx(p.Avz, 2),
            ],
          },
        ];
      }),
    [tipo],
  );

  const bulloni = TAGLIE_BULLONE.map((m) => {
    const b = BULLONI[m];
    return {
      chiave: `${m} bullone vite`,
      celle: [m, fx(b.d, 0), fx(b.passo, 2), fx(b.A, 1), fx(b.Ares, 1), fx(b.chiave, 0), fx(b.d0, 0)],
    };
  });

  const classiBullone = Object.entries(CLASSI_BULLONE).map(([c, v]) => ({
    chiave: `${c} classe bullone`,
    celle: [
      c,
      fx(v.fyb, 0),
      fx(v.ftb, 0),
      fx(v.fyb / COEFF_DEFAULT.gammaM2, 0),
      fx(v.ftb / COEFF_DEFAULT.gammaM2, 0),
    ],
  }));

  const calcestruzzi = Object.entries(CLS).map(([sigla, c]) => ({
    chiave: `${sigla} calcestruzzo cls`,
    celle: [
      sigla,
      fx(c.fck, 0),
      fx(c.rck, 0),
      fx((COEFF_DEFAULT.alfacc * c.fck) / COEFF_DEFAULT.gammaC, 2),
      fx(fctmCLS(c.fck), 2),
      fx(fctkCLS(c.fck) / COEFF_DEFAULT.gammaC, 2),
      fx(ecmCLS(c.fck), 0),
    ],
  }));

  const acciai = SIGLE_ACCIAIO.map((s) => {
    const a = ACCIAI[s];
    return {
      chiave: `${s} ${a.famiglia} acciaio`,
      celle: [
        s,
        a.famiglia,
        fx(a.fyk, 0),
        fx(a.ftk, 0),
        fx(a.fyk / a.gammaY, 1),
        fx(a.ftk / a.gammaU, 1),
      ],
    };
  });

  const tabelle = [
    filtra(armature, 'armature ferri barre diametri pesi mandrino piega raggio curvatura'),
    filtra(profili, `profilario acciaio ${tipo} sagomario profili`),
    filtra(bulloni, 'bulloni viti profilario metrica aree fori chiavi'),
    filtra(classiBullone, 'classi bulloni resistenza'),
    filtra(calcestruzzi, 'calcestruzzo cls classi resistenza'),
    filtra(acciai, 'acciai resistenze fyd ftd'),
  ];
  const trovate = tabelle.reduce((s, t) => s + t.length, 0);

  return (
    <div className="stack">
      <ComandiScheda>
        <div className="norma-ricerca">
          <MagnifyingGlass size={14} />
          <input
            className="input"
            type="search"
            value={q}
            placeholder="Cerca nelle tabelle (⌀16, IPE 200, M12, C25/30, S355…)"
            aria-label="Cerca nelle tabelle utili"
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {q.trim() && (
          <span className="calc-conteggio">
            {trovate} {trovate === 1 ? 'riga' : 'righe'}
          </span>
        )}
      </ComandiScheda>

      <Tabella
        titolo="Armature"
        sotto="diametri commerciali, peso, piega"
        colonne={['⌀', 'Area (mm²)', 'Peso (kg/m)', 'Mandrino ⌀m (mm)', 'Raggio interno (mm)']}
        righe={tabelle[0]}
        nota={
          <>
            Il peso è quello dell’acciaio, 7850 kg/m³. Il mandrino è il minimo di EC2 §8.3 Tab.
            8.1N — <strong>4⌀</strong> fino a ⌀16, <strong>7⌀</strong> oltre — e il raggio interno di
            curvatura è metà del mandrino. Per le pieghe con l’ancoraggio a contatto del
            calcestruzzo, o con i ferri fitti, il mandrino va verificato caso per caso.
          </>
        }
      />

      <section className="panel">
        <div className="panel-body" style={{ paddingTop: 12 }}>
          <div className="calc-colonna-testa">
            <span className="t">Profilario acciaio</span>
            <span className="d">lo stesso sagomario delle Sollecitazioni</span>
          </div>
          <div className="calc-catalogo" style={{ margin: '8px 0' }}>
            {TIPI_PROFILO.map((tp) => (
              <button
                key={tp.id}
                type="button"
                className="calc-catalogo-chip"
                aria-pressed={tipo === tp.id}
                style={tipo === tp.id ? { borderStyle: 'solid', borderColor: 'var(--color-accent)' } : undefined}
                onClick={() => setTipo(tp.id)}
              >
                {tp.label}
              </button>
            ))}
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  {['Profilo', 'h (mm)', 'b (mm)', 'A (cm²)', 'Ix (cm⁴)', 'Wx (cm³)', 'Iy (cm⁴)', 'Wy (cm³)', 'Avz (cm²)'].map(
                    (c) => (
                      <th key={c}>{c}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {tabelle[1].map((r) => (
                  <tr key={r.chiave}>
                    {r.celle.map((c, i) => (
                      <td key={i} className={i === 0 ? undefined : 'num'}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tabelle[1].length === 0 && <p className="note">Nessun profilo di questo tipo corrisponde alla ricerca.</p>}
          <p className="note">
            x è l’asse forte, y quello debole: ruotare il profilo di 90° vuol dire scambiare le due
            colonne. IPE, HEA, HEB e UPN sono a tabella (EN 10365); angolari e tubi si ricavano dalla
            geometria esatta della taglia, quindi coprono qualunque misura commerciale.
          </p>
        </div>
      </section>

      <Tabella
        titolo="Profilario bulloni"
        sotto="filettatura metrica grossa, ISO 261/262"
        colonne={['Vite', 'd (mm)', 'Passo (mm)', 'A lorda (mm²)', 'Ares (mm²)', 'Chiave (mm)', 'Foro d0 (mm)']}
        righe={tabelle[2]}
        nota={
          <>
            <strong>Ares</strong> è l’area resistente della parte filettata: si usa quando il piano
            di taglio attraversa la filettatura, che è il caso ordinario. Il foro d0 è quello con
            gioco normale, il riferimento per passi e distanze dai bordi (NTC2018 §4.2.8.1).
          </>
        }
      />

      <Tabella
        titolo="Classi di resistenza dei bulloni"
        sotto="NTC2018 Tab. 11.3.XII"
        colonne={['Classe', 'fyb (N/mm²)', 'ftb (N/mm²)', 'fyb/γM2', 'ftb/γM2']}
        righe={tabelle[3]}
        nota={<>γM2 = {COEFF_DEFAULT.gammaM2} per i collegamenti e le sezioni indebolite.</>}
      />

      <Tabella
        titolo="Calcestruzzo"
        sotto="classi di resistenza e valori di progetto"
        colonne={['Classe', 'fck (N/mm²)', 'Rck (N/mm²)', 'fcd', 'fctm', 'fctd', 'Ecm (N/mm²)']}
        righe={tabelle[4]}
        nota={
          <>
            fcd = αcc·fck/γC con αcc = {COEFF_DEFAULT.alfacc} e γC = {COEFF_DEFAULT.gammaC}; fctm =
            0.30·fck^⅔ (fino a C50/60); fctd = 0.7·fctm/γC; Ecm = 22000·[(fck+8)/10]^0.3.
          </>
        }
      />

      <Tabella
        titolo="Acciai"
        sotto="carpenteria, armatura e classi dei bulloni"
        colonne={['Sigla', 'Famiglia', 'fyk (N/mm²)', 'ftk (N/mm²)', 'fyd', 'ftd']}
        righe={tabelle[5]}
        testo={2}
        nota={
          <>
            fyd e ftd con i γ della famiglia: carpenteria γM0 = {COEFF_DEFAULT.gammaM0} e γM2 ={' '}
            {COEFF_DEFAULT.gammaM2}, armatura γS = {COEFF_DEFAULT.gammaS}, bulloni γM2 ={' '}
            {COEFF_DEFAULT.gammaM2}. Sono le stesse sigle della tendina «Acciaio» del Quaderno.
          </>
        }
      />

      {q.trim() && trovate === 0 && (
        <section className="panel">
          <div className="panel-body">
            <p className="note" style={{ margin: 0 }}>
              Nessuna riga corrisponde a «{q.trim()}».
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

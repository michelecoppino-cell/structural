import { useMemo, useState, type ReactNode } from 'react';
import { CaretDown, CaretUp, MagnifyingGlass } from '@phosphor-icons/react';
import { ComandiScheda } from '../components/ComandiScheda';
import { DisposizioneFori, PiegaArmatura, SpaziChiave } from '../components/Disegni';
import { TABELLA_ARMATURE } from '../data/armature';
import { BULLONI, CLASSI_BULLONE, TAGLIE_BULLONE } from '../data/bulloni';
import { SPAZI_CHIAVI } from '../data/chiavi';
import { DISTANZE_FORI } from '../data/distanze-fori';
import { ACCIAI, CLS, COEFF_DEFAULT, SIGLE_ACCIAIO, ecmCLS, fctkCLS, fctmCLS } from '../data/materiali';
import {
  TIPI_PROFILO,
  pesoProfilo,
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
 * Una scheda della libreria: si apre e si chiude, così sul tavolo resta solo
 * la tabella che si sta consultando. Il titolo dice sempre quante righe ci
 * sono sotto, anche da chiusa.
 *
 * Si parte tutte chiuse: la libreria si apre sull'indice delle tabelle, e si
 * srotola solo quella che serve. Durante una ricerca invece le schede si
 * aprono da sole, altrimenti le righe trovate resterebbero nascoste.
 */
function Scheda({
  id,
  titolo,
  sotto,
  conta,
  ricerca = false,
  children,
}: {
  id: string;
  titolo: string;
  sotto?: string;
  /** Righe contenute: si legge anche a scheda chiusa. */
  conta: number;
  /** C'è una ricerca in corso: la scheda mostra comunque quello che ha trovato. */
  ricerca?: boolean;
  children: ReactNode;
}) {
  const [aperta, setAperta] = useState(false);
  const mostra = aperta || ricerca;
  return (
    <section className="panel utili-scheda">
      <button
        type="button"
        className="utili-testa"
        aria-expanded={mostra}
        aria-controls={`${id}-corpo`}
        onClick={() => setAperta((v) => !v)}
      >
        <span className="t">{titolo}</span>
        {sotto && <span className="d">{sotto}</span>}
        <span className="n">
          {conta} {conta === 1 ? 'riga' : 'righe'}
        </span>
        <span className="caret">{mostra ? <CaretUp size={14} /> : <CaretDown size={14} />}</span>
      </button>
      {mostra && (
        <div className="panel-body utili-corpo" id={`${id}-corpo`}>
          {children}
        </div>
      )}
    </section>
  );
}

/**
 * Una tabella della libreria: intestazione, righe e — dietro alle quinte — il
 * testo su cui lavora la ricerca, così una tabella che non c'entra sparisce
 * invece di restare vuota.
 */
function Tabella({
  id,
  titolo,
  sotto,
  colonne,
  righe,
  testo = 1,
  ricerca = false,
  sopra,
  nota,
}: {
  id: string;
  titolo: string;
  sotto?: string;
  colonne: string[];
  righe: { chiave: string; celle: string[] }[];
  /** Quante colonne di testa sono testo: le altre sono numeri, centrati. */
  testo?: number;
  ricerca?: boolean;
  /** Disegno o legenda che precede la tabella e ne spiega le colonne. */
  sopra?: React.ReactNode;
  nota?: React.ReactNode;
}) {
  if (!righe.length) return null;
  return (
    <Scheda id={id} titolo={titolo} sotto={sotto} conta={righe.length} ricerca={ricerca}>
      {sopra}
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              {colonne.map((c, i) => (
                <th key={c} className={i < testo ? undefined : 'num'}>
                  {c}
                </th>
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
    </Scheda>
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
              // il peso al metro: quello che si ordina e che pesa sulla struttura
              fx(pesoProfilo(p), 1),
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

  const chiavi_manovra = SPAZI_CHIAVI.map((r) => ({
    chiave: `${r.vite} chiave forchetta poligonale manovra serraggio`,
    celle: [r.vite, fx(r.S, 0), fx(r.f, 1), fx(r.g, 1), fx(r.h, 2), fx(r.k, 1)],
  }));

  const distanze = DISTANZE_FORI.map((r) => ({
    chiave: `${r.sigla} ${r.descrizione} distanza bordo interasse passo foro`,
    celle: [r.sigla, r.descrizione, r.minimo, r.maxEsposte, r.maxNonEsposte, r.maxCorten],
  }));

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
    filtra(chiavi_manovra, 'chiavi spazi manovra forchetta poligonali serraggio bulloni'),
    filtra(distanze, 'distanze interassi bordi fori passi bulloni chiodi unioni'),
    filtra(classiBullone, 'classi bulloni resistenza'),
    filtra(calcestruzzi, 'calcestruzzo cls classi resistenza'),
    filtra(acciai, 'acciai resistenze fyd ftd'),
  ];
  const trovate = tabelle.reduce((s, t) => s + t.length, 0);

  return (
    <div className="stack utili">
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
        id="utili-armature"
        titolo="Armature"
        sotto="diametri commerciali, peso, piega"
        colonne={['⌀', 'Area (mm²)', 'Peso (kg/m)', 'Mandrino ⌀m (mm)', 'Raggio curvatura (mm)']}
        righe={tabelle[0]}
        ricerca={!!q.trim()}
        sopra={<PiegaArmatura />}
        nota={
          <>
            Il ferro si piega avvolgendolo sul mandrino, un rullo di diametro ⌀m: la faccia interna
            della barra ne copia la superficie, così il <strong>raggio di curvatura</strong> è il
            raggio del mandrino, ⌀m/2. Il <strong>⌀</strong> invece è il diametro della barra, quello
            che si legge nello spessore del ferro. Il peso è quello dell’acciaio, 7850 kg/m³. Il
            mandrino è il minimo di EC2 §8.3 Tab. 8.1N — <strong>4⌀</strong> fino a ⌀16,{' '}
            <strong>7⌀</strong> oltre. Per le pieghe con l’ancoraggio a contatto del calcestruzzo, o
            con i ferri fitti, il mandrino va verificato caso per caso.
          </>
        }
      />

      <Scheda
        id="utili-profili"
        titolo="Profilario acciaio"
        sotto="lo stesso sagomario delle Sollecitazioni"
        conta={tabelle[1].length}
        ricerca={!!q.trim()}
      >
        <div className="calc-catalogo" style={{ margin: '2px 0 8px' }}>
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
                {[
                  'Profilo',
                  'h (mm)',
                  'b (mm)',
                  'A (cm²)',
                  'Peso (kg/m)',
                  'Ix (cm⁴)',
                  'Wx (cm³)',
                  'Iy (cm⁴)',
                  'Wy (cm³)',
                  'Avz (cm²)',
                ].map((c, i) => (
                  <th key={c} className={i === 0 ? undefined : 'num'}>
                    {c}
                  </th>
                ))}
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
          Il peso al metro è l’area per 7850 kg/m³. x è l’asse forte, y quello debole: ruotare il
          profilo di 90° vuol dire scambiare le due colonne. IPE, HEA, HEB e UPN sono a tabella
          (EN 10365); angolari e tubi si ricavano dalla geometria esatta della taglia, quindi coprono
          qualunque misura commerciale.
        </p>
      </Scheda>

      <Tabella
        id="utili-bulloni"
        titolo="Profilario bulloni"
        sotto="filettatura metrica grossa, ISO 261/262"
        ricerca={!!q.trim()}
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
        id="utili-chiavi"
        titolo="Spazi di manovra per le chiavi"
        sotto="quanto posto serve intorno al bullone per serrarlo"
        ricerca={!!q.trim()}
        colonne={[
          'Vite',
          'Apertura S (mm)',
          'Forchetta f (mm)',
          'Forchetta g (mm)',
          'Poligonale h (mm)',
          'Poligonale k (mm)',
        ]}
        righe={tabelle[3]}
        sopra={<SpaziChiave />}
        nota={
          <>
            <strong>f</strong> e <strong>h</strong> sono la distanza minima fra l’asse del bullone e
            un ostacolo laterale — una parete, un’ala, un altro elemento — mentre{' '}
            <strong>g</strong> e <strong>k</strong> sono l’interasse minimo fra due bulloni contigui
            perché la chiave passi in mezzo. La forchetta chiede più posto della poligonale: nei nodi
            fitti si serra di poligonale. L’apertura <strong>S</strong> è quella dei bulloni
            strutturali ad alta resistenza (UNI 5712 / EN 14399), più grande di quella ISO 4014 del
            profilario qui sopra. Sono vincoli di montaggio: valgono <em>insieme</em> ai minimi
            normativi di passo e distanza dal bordo, non al loro posto.
          </>
        }
      />

      <Tabella
        id="utili-distanze-fori"
        titolo="Distanze e interassi dei fori"
        sotto="NTC2018 §4.2.8.1, Fig. 4.2.5"
        ricerca={!!q.trim()}
        testo={6}
        colonne={[
          'Distanza',
          'Che cos’è',
          'Minimo',
          'Max — esposte a corrosione',
          'Max — non esposte',
          'Max — acciaio EN 10025-5',
        ]}
        righe={tabelle[4]}
        sopra={<DisposizioneFori />}
        nota={
          <>
            <strong>d0</strong> è il diametro del foro (colonna «Foro d0» del profilario bulloni),{' '}
            <strong>t</strong> lo spessore minimo degli elementi esterni collegati. I minimi servono
            al rifollamento — davanti al bullone ci vuole materiale — i massimi a tenere i piatti a
            contatto: contro l’instabilità locale e, all’aperto, contro l’acqua fra le lamiere.
            L’instabilità locale del piatto fra i bulloni non va considerata se p1/t &lt; 9·(235/fy)
            <sup>0,5</sup>; in caso contrario si assume una lunghezza libera di inflessione pari a
            0,6·p1.
          </>
        }
      />

      <Tabella
        id="utili-classi-bulloni"
        titolo="Classi di resistenza dei bulloni"
        sotto="NTC2018 Tab. 11.3.XII"
        ricerca={!!q.trim()}
        colonne={['Classe', 'fyb (N/mm²)', 'ftb (N/mm²)', 'fyb/γM2', 'ftb/γM2']}
        righe={tabelle[5]}
        nota={<>γM2 = {COEFF_DEFAULT.gammaM2} per i collegamenti e le sezioni indebolite.</>}
      />

      <Tabella
        id="utili-cls"
        titolo="Calcestruzzo"
        sotto="classi di resistenza e valori di progetto"
        ricerca={!!q.trim()}
        colonne={['Classe', 'fck (N/mm²)', 'Rck (N/mm²)', 'fcd', 'fctm', 'fctd', 'Ecm (N/mm²)']}
        righe={tabelle[6]}
        nota={
          <>
            fcd = αcc·fck/γC con αcc = {COEFF_DEFAULT.alfacc} e γC = {COEFF_DEFAULT.gammaC}; fctm =
            0.30·fck^⅔ (fino a C50/60); fctd = 0.7·fctm/γC; Ecm = 22000·[(fck+8)/10]^0.3.
          </>
        }
      />

      <Tabella
        id="utili-acciai"
        titolo="Acciai"
        sotto="carpenteria, armatura e classi dei bulloni"
        ricerca={!!q.trim()}
        colonne={['Sigla', 'Famiglia', 'fyk (N/mm²)', 'ftk (N/mm²)', 'fyd', 'ftd']}
        righe={tabelle[7]}
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

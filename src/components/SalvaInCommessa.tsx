/**
 * «Salva in commessa»: il JSON del progetto va nella cartella dei calcoli della
 * commessa su OneDrive, dove stanno gli altri file — e dove lo legge anche una
 * chat collegata al OneDrive. Si sceglie la commessa da un elenco; il nome del
 * file è lo stesso dell'esportazione.
 */
import { useState } from 'react';
import { CloudArrowUp } from '@phosphor-icons/react';
import { ServeAccesso } from '../cloud/auth';
import { CARTELLA_COMMESSE, SOTTOCARTELLA_CALCOLO } from '../cloud/config';
import { commessaProposta, ordinaCommesse } from '../cloud/commesse';
import { elencaCartelle, scriviInCartella, type CartellaRemota } from '../cloud/onedrive';
import { normalizza } from '../base/schede';
import type { Progetto } from '../state/store';

type Stato =
  | { fase: 'chiuso' }
  | { fase: 'carico' }
  | { fase: 'scelta'; cartelle: CartellaRemota[]; proposta: string | null }
  | { fase: 'scrivo'; cartella: string }
  | { fase: 'errore'; messaggio: string };

const messaggio = (e: unknown) =>
  e instanceof ServeAccesso
    ? 'Serve un nuovo accesso a Microsoft: ricarica l’app e rientra.'
    : e instanceof Error
      ? e.message
      : String(e);

export default function SalvaInCommessa({
  progetto,
  nomeFile,
  contenuto,
  onSalvato,
}: {
  progetto: Progetto;
  nomeFile: string;
  /** Il JSON, chiesto al momento di scrivere: dentro c'è già la cartella scelta. */
  contenuto: (cartella: string) => string;
  onSalvato: (cartella: string, percorso: string) => void;
}) {
  const [stato, setStato] = useState<Stato>({ fase: 'chiuso' });
  const [q, setQ] = useState('');

  const apri = async () => {
    if (stato.fase !== 'chiuso') return setStato({ fase: 'chiuso' });
    setQ('');
    setStato({ fase: 'carico' });
    try {
      const trovate = await elencaCartelle(CARTELLA_COMMESSE);
      if (trovate === null) {
        return setStato({ fase: 'errore', messaggio: `Su OneDrive non c'è la cartella «${CARTELLA_COMMESSE}».` });
      }
      const cartelle = ordinaCommesse(trovate);
      setStato({ fase: 'scelta', cartelle, proposta: commessaProposta(cartelle, progetto) });
    } catch (e) {
      setStato({ fase: 'errore', messaggio: messaggio(e) });
    }
  };

  const salva = async (commessa: string) => {
    const cartella = `${CARTELLA_COMMESSE}/${commessa}/${SOTTOCARTELLA_CALCOLO}`;
    setStato({ fase: 'scrivo', cartella: commessa });
    try {
      const testo = contenuto(commessa);
      let esito = await scriviInCartella(cartella, nomeFile, testo, 'application/json');
      if (esito === 'esiste') {
        if (!window.confirm(`In «${commessa}/${SOTTOCARTELLA_CALCOLO}» c'è già ${nomeFile}.\n\nSovrascriverlo?`)) {
          return setStato({ fase: 'chiuso' });
        }
        esito = await scriviInCartella(cartella, nomeFile, testo, 'application/json', { sovrascrivi: true });
      }
      setStato({ fase: 'chiuso' });
      onSalvato(commessa, `${commessa}/${SOTTOCARTELLA_CALCOLO}/${nomeFile}`);
    } catch (e) {
      setStato({ fase: 'errore', messaggio: messaggio(e) });
    }
  };

  const voci =
    stato.fase === 'scelta'
      ? stato.cartelle.filter((c) => normalizza(c.nome).includes(normalizza(q))).slice(0, 60)
      : [];

  return (
    <div className="salva-commessa">
      <button
        type="button"
        className="btn btn-secondary"
        aria-expanded={stato.fase !== 'chiuso'}
        title={`Salva il JSON nella cartella ${SOTTOCARTELLA_CALCOLO} della commessa, su OneDrive`}
        onClick={() => void apri()}
      >
        <CloudArrowUp size={14} />
        <span>Salva in commessa</span>
      </button>
      {stato.fase !== 'chiuso' && (
        <div className="base-pannello base-scelta salva-commessa-pannello">
          {stato.fase === 'carico' && <p className="vuoto">Leggo le commesse su OneDrive…</p>}
          {stato.fase === 'scrivo' && <p className="vuoto">Salvo in «{stato.cartella}»…</p>}
          {stato.fase === 'errore' && <p className="salva-commessa-errore">{stato.messaggio}</p>}
          {stato.fase === 'scelta' && (
            <>
              <div className="sotto">
                {nomeFile} → <em>commessa</em>/{SOTTOCARTELLA_CALCOLO}
              </div>
              {stato.proposta && (
                <button type="button" className="btn btn-primary" onClick={() => void salva(stato.proposta!)}>
                  Salva in «{stato.proposta}»
                </button>
              )}
              <input
                className="input"
                autoFocus={!stato.proposta}
                value={q}
                placeholder="Cerca la commessa…"
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && voci[0]) {
                    e.preventDefault();
                    void salva(voci[0].nome);
                  }
                  if (e.key === 'Escape') setStato({ fase: 'chiuso' });
                }}
              />
              <ul>
                {voci.map((c) => (
                  <li key={c.nome}>
                    <button type="button" onClick={() => void salva(c.nome)}>
                      <span>{c.nome}</span>
                    </button>
                  </li>
                ))}
                {voci.length === 0 && <li className="vuoto">Nessuna commessa che corrisponda.</li>}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

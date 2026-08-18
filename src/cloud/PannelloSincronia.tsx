/**
 * Il pannello «Libreria personale» in fondo alla scheda Normativa: dice dove
 * stanno i dati, e in due bottoni collega o stacca OneDrive.
 *
 * È scritto per rispondere alla domanda che uno si fa davanti a un'app che
 * tocca i suoi file: *cosa esce da qui, e dove va a finire*. Per questo il
 * pannello nomina la cartella e il file, e dice cosa **non** viene toccato.
 */
import { ArrowsClockwise, CloudCheck, CloudSlash, CloudWarning } from '@phosphor-icons/react';
import { CARTELLA, FILE_LIBRERIA } from './config';
import { useSincronia } from './useSincronia';

export default function PannelloSincronia() {
  const { stato, utente, ultimo, dettaglio, sincronizza, collega, scollega } = useSincronia();

  if (stato === 'spenta') {
    return (
      <section className="panel">
        <div className="panel-body sincronia">
          <span className="norma-sigla">
            <CloudSlash size={15} />
            Libreria personale — solo su questo dispositivo
          </span>
          <p className="note">
            Norme aggiunte a mano, unità di misura e formule preimpostate restano nella memoria di
            questo browser: sopravvivono a «Svuota tutto», ma non si vedono sugli altri dispositivi e
            se ne vanno se cancelli i dati del sito. Per portarle su OneDrive serve l’ID
            dell’applicazione Microsoft (<code>VITE_MS_CLIENT_ID</code>): la procedura è scritta in
            <code> src/cloud/config.ts</code>.
          </p>
        </div>
      </section>
    );
  }

  const icona =
    stato === 'in-pari' ? <CloudCheck size={15} /> : stato === 'scollegata' ? <CloudSlash size={15} /> : <CloudWarning size={15} />;

  const riga: Record<typeof stato, string> = {
    scollegata: 'Collega OneDrive per ritrovare la libreria su tutti i dispositivi',
    'in-corso': 'Sincronizzazione in corso…',
    'in-pari': ultimo ? `In pari con OneDrive — ultimo controllo alle ${ultimo}` : 'In pari con OneDrive',
    scaduta: 'L’accesso Microsoft è scaduto: ricollegati per riprendere',
    errore: 'OneDrive non raggiungibile: si continua in locale, riproverà da solo',
  };

  return (
    <section className="panel">
      <div className="panel-body sincronia">
        <div className="norma-testa">
          <span>
            <span className="norma-sigla">
              {icona}
              Libreria personale
            </span>
            <span className="norma-titolo">{riga[stato]}</span>
          </span>
          <div className="sincronia-bottoni">
            {stato === 'scollegata' || stato === 'scaduta' ? (
              <button type="button" className="btn btn-primary" onClick={() => void collega()}>
                Collega OneDrive
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={stato === 'in-corso'}
                  onClick={() => void sincronizza()}
                >
                  <ArrowsClockwise size={14} />
                  Sincronizza ora
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => void scollega()}>
                  Scollega
                </button>
              </>
            )}
          </div>
        </div>

        {!!dettaglio && (stato === 'errore' || stato === 'scaduta') && (
          <p className="field-error">
            Microsoft ha risposto: <code>{dettaglio}</code>
          </p>
        )}

        <p className="note">
          {utente && (
            <>
              Collegato come <strong>{utente}</strong>.{' '}
            </>
          )}
          Sul tuo OneDrive va un solo file, <code>{CARTELLA}/{FILE_LIBRERIA}</code>: norme e link
          aggiunti a mano, unità di misura, formule preimpostate. <strong>La commessa non esce di
          qui</strong> — azioni, sollecitazioni, verifiche, computo e quaderno restano su questo
          dispositivo e si portano via con «Esporta JSON». L’app legge e scrive solo la sua cartella
          per conto tuo, dal browser: non c’è nessun server in mezzo. Il permesso si revoca quando
          vuoi da <em>account.microsoft.com → Privacy → App e servizi</em>.
        </p>
      </div>
    </section>
  );
}

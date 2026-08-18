import { BookOpenText, Table } from '@phosphor-icons/react';
import { useStore } from '../state/store';
import { Seg } from '../components/ui';
import Normativa from './Normativa';
import Utili from './Utili';
import type { useSincronia } from '../cloud/useSincronia';

/** I due fogli della libreria: l'indice delle norme e le tabelle di lavoro. */
type Foglio = 'norme' | 'utili';

const FOGLI: { id: Foglio; label: string; icon: React.ReactNode }[] = [
  { id: 'norme', label: 'Norme', icon: <BookOpenText size={14} /> },
  { id: 'utili', label: 'Utili', icon: <Table size={14} /> },
];

/**
 * Scheda Libreria: sopra la scelta del foglio, sotto il foglio scelto.
 * Il foglio attivo sta nello stato dell'interfaccia, così tornando alla scheda
 * si riapre dov'era — le tabelle si consultano avanti e indietro.
 */
export default function Libreria({ sincronia }: { sincronia: ReturnType<typeof useSincronia> }) {
  const { state, dispatch } = useStore();
  const foglio: Foglio = state.ui.open['libreria-utili'] ? 'utili' : 'norme';

  return (
    <div className="stack">
      <div className="libreria-fogli">
        <Seg
          value={foglio}
          options={FOGLI}
          label="Foglio della libreria"
          ruolo="tabs"
          idPannello="libreria-corpo"
          onChange={(f) => {
            if (f !== foglio) dispatch({ type: 'toggleOpen', id: 'libreria-utili' });
          }}
        />
      </div>

      <div id="libreria-corpo">{foglio === 'utili' ? <Utili /> : <Normativa sincronia={sincronia} />}</div>
    </div>
  );
}

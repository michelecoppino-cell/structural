/**
 * Apre un link della libreria — al primo tentativo nell'app desktop di
 * OneDrive, se è installata, altrimenti sul web.
 *
 * Non esiste un modo di sapere con certezza se OneDrive è installato: si
 * tenta lo schema `odopen:`, che è quello che il client desktop registra per
 * aprire i file sincronizzati, passandogli l'indirizzo web. Se il sistema
 * operativo lo riconosce, lancia l'app e la pagina perde il focus; se non
 * succede entro un breve istante — l'app non c'è — si apre semplicemente il
 * link web in una scheda nuova, il comportamento di sempre. È un tentativo
 * fatto in buona fede, non una garanzia: alcuni indirizzi (o combinazioni di
 * sistema operativo e client) possono non rispondere allo schema, e in quel
 * caso non succede niente di peggio che il link web, aperto comunque.
 */
export function apriLink(url: string): void {
  const onedrive = /(^|\.)onedrive\.live\.com$|(^|\.)sharepoint\.com$/i;
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    return; // indirizzo non valido: niente da aprire
  }

  const apriSulWeb = () => window.open(url, '_blank', 'noopener,noreferrer');

  if (!onedrive.test(host)) {
    apriSulWeb();
    return;
  }

  let intercettato = false;
  const suFocusPerso = () => {
    intercettato = true;
  };
  window.addEventListener('blur', suFocusPerso, { once: true });

  const tentativo = document.createElement('iframe');
  tentativo.style.display = 'none';
  tentativo.src = `odopen://sync/?url=${encodeURIComponent(url)}`;
  document.body.appendChild(tentativo);

  window.setTimeout(() => {
    window.removeEventListener('blur', suFocusPerso);
    tentativo.remove();
    if (!intercettato) apriSulWeb();
  }, 700);
}

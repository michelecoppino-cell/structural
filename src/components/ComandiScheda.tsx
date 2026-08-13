import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * La riga in testa alla scheda non ripete più il nome della voce di menù:
 * ospita i comandi della scheda attiva (materiale, verifica visibile, …).
 * Ogni scheda li dichiara dove le è comodo e finiscono nella barra.
 */

const SlotContext = createContext<HTMLElement | null>(null);

export const SlotProvider = SlotContext.Provider;

export function ComandiScheda({ children }: { children: ReactNode }) {
  const slot = useContext(SlotContext);
  if (!slot) return null;
  return createPortal(children, slot);
}

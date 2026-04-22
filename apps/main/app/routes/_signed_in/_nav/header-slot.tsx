import { createContext, useContext } from "react";
import { createPortal } from "react-dom";

export const HeaderSlotContext = createContext<HTMLElement | null>(null);

export function HeaderSlot({ children }: { children: React.ReactNode }) {
  const el = useContext(HeaderSlotContext);
  if (!el) return null;
  return createPortal(children, el);
}

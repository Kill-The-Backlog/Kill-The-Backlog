import { createContext, use } from "react";

const NonceContext = createContext("");

export const NonceProvider = NonceContext.Provider;

export function useNonce() {
  return use(NonceContext);
}

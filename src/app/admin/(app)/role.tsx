"use client";

import { createContext, useContext, type ReactNode } from "react";

// Rôle de l'utilisateur dans le back-office, pour masquer les actions réservées aux administrateurs.
// Ce n'est qu'un confort d'affichage : les droits sont vérifiés dans les Server Actions et en base (RLS).
const RoleContext = createContext(false);

export function RoleProvider({ isAdmin, children }: { isAdmin: boolean; children: ReactNode }) {
  return <RoleContext.Provider value={isAdmin}>{children}</RoleContext.Provider>;
}

export function useIsAdmin() {
  return useContext(RoleContext);
}

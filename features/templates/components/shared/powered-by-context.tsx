"use client";

import React, { createContext, useContext } from "react";

/**
 * Controls the Veltex footer logo across every page of every template.
 *
 * Defaults to `false` so any render path that does not know the owner's plan
 * (the public /demo-proposal page) renders a clean, logo-free document. The
 * real render paths — TemplateRenderer and PrintTemplateSwitcher — always mount
 * a provider explicitly.
 */
const PoweredByContext = createContext<boolean>(false);

export function PoweredByProvider({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <PoweredByContext.Provider value={show}>
      {children}
    </PoweredByContext.Provider>
  );
}

export function usePoweredByVisible(): boolean {
  return useContext(PoweredByContext);
}

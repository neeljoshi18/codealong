"use client";

import { useEffect } from "react";
import { useStudio } from "@/lib/store";

export function useAppearance() {
  const appearance = useStudio((s) => s.appearance);
  const setAppearance = useStudio((s) => s.setAppearance);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("codealong-theme");
      if (stored === "light" || stored === "dark") setAppearance(stored);
      else if (document.documentElement.dataset.theme === "light") setAppearance("light");
    } catch {
      /* ignore */
    }
  }, [setAppearance]);

  return { appearance, setAppearance };
}

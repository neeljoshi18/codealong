"use client";

import { useEffect } from "react";

/**
 * YouTube's iframe eats keyboard events once it has focus.
 * Keep the parent window focused so hotkeys actually fire.
 * Never steal focus from inputs / Monaco.
 */
export function useIframeKeyRescue() {
  useEffect(() => {
    const release = () => {
      const el = document.activeElement;
      if (!(el instanceof HTMLIFrameElement)) return;
      el.blur();
      window.focus();
    };

    const onWindowBlur = () => {
      window.setTimeout(release, 0);
    };

    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("pointerup", release, true);
    const id = window.setInterval(release, 350);

    return () => {
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("pointerup", release, true);
      window.clearInterval(id);
    };
  }, []);
}

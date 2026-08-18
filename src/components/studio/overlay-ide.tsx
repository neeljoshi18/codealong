"use client";

import { useEffect, useState } from "react";

/**
 * One try at "reach into the video": only while Alt/⌥ is held, a catcher
 * sits on the typical code region. Click opens the workbench.
 * Without Alt the iframe is a normal YouTube watch — nothing on top.
 */
export function ReachCatcher({ onReach }: { onReach: () => void }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.altKey) setArmed(true);
    };
    const up = (e: KeyboardEvent) => {
      if (!e.altKey) setArmed(false);
    };
    const blur = () => setArmed(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  if (!armed) return null;

  return (
    <button
      type="button"
      aria-label="Open code at this moment"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onReach();
      }}
      className="absolute cursor-text rounded-sm ring-1 ring-white/25"
      style={{
        left: "38%",
        right: "4%",
        top: "10%",
        bottom: "14%",
        background: "transparent",
      }}
    />
  );
}

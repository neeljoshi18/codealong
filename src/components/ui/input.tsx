import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-paper placeholder:text-mute/70 outline-none focus:border-brass/50 focus:ring-2 focus:ring-brass/20",
        className,
      )}
      {...props}
    />
  );
}

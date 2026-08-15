"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ModeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The server cannot know the stored theme, so *everything* that depends on it
  // — icon and label alike — has to stay neutral until after hydration.
  // Deriving only the icon from `resolvedTheme` still mismatches on aria-label,
  // which React reports as a hydration error.
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const label = mounted
    ? `Switch to ${isDark ? "light" : "dark"} theme`
    : "Switch theme";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* suppressHydrationWarning: the icon is intentionally neutral on the
          server and correct on the client. */}
      <span suppressHydrationWarning>
        {mounted && !isDark ? <Moon /> : <Sun />}
      </span>
    </Button>
  );
}

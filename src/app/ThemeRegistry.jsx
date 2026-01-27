"use client";

import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider, CssBaseline, createTheme } from "@mui/material";

const STORAGE_KEY = "vado:colorMode";
const COOKIE_KEY = "vado_colorMode";

const ColorModeContext = React.createContext({
  mode: "light",
  toggleColorMode: () => {},
  setMode: (_mode) => {},
});

export function useColorMode() {
  return React.useContext(ColorModeContext);
}

function readLocalStorageMode() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

function writeCookieMode(mode) {
  try {
    document.cookie = `${COOKIE_KEY}=${mode}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {}
}

export default function ThemeRegistry({ children, initialMode = "light" }) {
  const [mode, setMode] = React.useState(
    initialMode === "dark" ? "dark" : "light"
  );

  React.useEffect(() => {
    const saved = readLocalStorageMode();
    if (saved) {
      setMode(saved);
      return;
    }

    const prefersDark =
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;

    const fallback = prefersDark ? "dark" : "light";
    setMode(fallback);
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {}

    writeCookieMode(mode);
  }, [mode]);

  React.useEffect(() => {
    const onStorage = (e) => {
      if (
        e.key === STORAGE_KEY &&
        (e.newValue === "light" || e.newValue === "dark")
      ) {
        setMode(e.newValue);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleColorMode = React.useCallback(() => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const theme = React.useMemo(() => {
    return createTheme({
      palette: { mode },
    });
  }, [mode]);

  const ctxValue = React.useMemo(
    () => ({ mode, toggleColorMode, setMode }),
    [mode, toggleColorMode]
  );

  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ColorModeContext.Provider value={ctxValue}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </ColorModeContext.Provider>
    </AppRouterCacheProvider>
  );
}

"use client";

import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider, CssBaseline, createTheme } from "@mui/material";

const STORAGE_KEY = "vado:colorMode";

const ColorModeContext = React.createContext({
  mode: "light",
  toggleColorMode: () => {},
  setMode: (_mode) => {},
});

export function useColorMode() {
  return React.useContext(ColorModeContext);
}

function getInitialMode() {
  if (typeof window === "undefined") return "light";

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;

  const prefersDark =
    window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;

  return prefersDark ? "dark" : "light";
}

export default function ThemeRegistry({ children }) {
  const [mode, setMode] = React.useState(getInitialMode);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  }, [mode]);

  const toggleColorMode = React.useCallback(() => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const theme = React.useMemo(() => {
    return createTheme({
      palette: {
        mode,
      },
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

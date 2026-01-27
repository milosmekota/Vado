"use client";

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Tooltip,
} from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useColorMode } from "@/app/ThemeRegistry";

export default function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const hideNavbar = pathname === "/login";

  const { mode, toggleColorMode } = useColorMode();

  useEffect(() => {
    if (hideNavbar) return;

    const load = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) {
          setUser(null);
          return;
        }
        const data = await res.json().catch(() => ({}));
        setUser(data.user || null);
      } catch {
        setUser(null);
      }
    };

    load();
  }, [hideNavbar]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });

    window.location.href = "/login";
  };

  const handleGoHome = () => {
    window.dispatchEvent(new Event("vado:goHome"));
    router.push("/");
  };

  return (
    <>
      {!hideNavbar && (
        <AppBar position="static">
          <Toolbar>
            <Button
              color="inherit"
              onClick={handleGoHome}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                fontSize: "1.1rem",
                px: 0,
                minWidth: "auto",
              }}
            >
              Vado
            </Button>

            <Box sx={{ flexGrow: 1 }} />

            {/* přepínač tématu */}
            <Tooltip
              title={
                mode === "dark"
                  ? "Přepnout na denní režim"
                  : "Přepnout na noční režim"
              }
            >
              <IconButton
                color="inherit"
                onClick={toggleColorMode}
                aria-label="Přepnout téma"
                data-testid="theme-toggle"
                sx={{ mr: 1 }}
              >
                {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {user?.email ? (
              <Typography variant="body1" sx={{ mr: 2 }}>
                {user.email}
              </Typography>
            ) : null}

            {user ? (
              <Button color="inherit" onClick={handleLogout}>
                Odhlásit
              </Button>
            ) : null}
          </Toolbar>
        </AppBar>
      )}

      {children}
    </>
  );
}

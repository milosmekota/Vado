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
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useColorMode } from "@/app/ThemeRegistry";

export default function AppShell({ children, initialUser = null }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState(initialUser);
  const hideNavbar = pathname === "/login";

  const { mode, toggleColorMode } = useColorMode();

  useEffect(() => {
    const next = initialUser ?? null;
    const prev = user ?? null;

    const prevKey = prev
      ? `${prev.id ?? ""}|${prev.email ?? ""}|${prev.role ?? ""}`
      : "";
    const nextKey = next
      ? `${next.id ?? ""}|${next.email ?? ""}|${next.role ?? ""}`
      : "";

    if (prevKey !== nextKey) {
      setUser(next);
    }
  }, [initialUser]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });

    setUser(null);
    window.location.href = "/login";
  };

  const handleGoHome = () => {
    window.dispatchEvent(new Event("vado:goHome"));
    router.push("/");
  };

  return (
    <>
      {!hideNavbar && (
        <>
          <AppBar position="fixed">
            <Toolbar>
              <Tooltip title="Přejít na hlavní stránku">
                <Button
                  color="inherit"
                  variant="outlined"
                  startIcon={<HomeRoundedIcon />}
                  onClick={handleGoHome}
                  aria-label="Přejít na hlavní stránku Vado"
                  sx={{
                    minWidth: "auto",
                    px: { xs: 1, sm: 1.5 },
                    py: 0.5,
                    borderRadius: 2,
                    borderColor: "rgba(255, 255, 255, 0.6)",
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                    color: "common.white",
                    fontWeight: 700,
                    textTransform: "none",
                    "& .MuiButton-startIcon": {
                      mr: 0.6,
                      "& .MuiSvgIcon-root": { fontSize: 19 },
                    },
                    "&:hover": {
                      borderColor: "common.white",
                      bgcolor: "rgba(255, 255, 255, 0.2)",
                    },
                  }}
                >
                  Vado
                </Button>
              </Tooltip>

              <Box sx={{ flexGrow: 1 }} />

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

          <Toolbar />
        </>
      )}

      {children}
    </>
  );
}

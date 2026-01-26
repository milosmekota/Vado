"use client";

import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState(null);

  const hideNavbar = pathname === "/login";

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

  return (
    <>
      {!hideNavbar && (
        <AppBar position="static">
          <Toolbar>
            <Button
              color="inherit"
              onClick={() => router.push("/")}
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

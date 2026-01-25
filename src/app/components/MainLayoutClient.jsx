"use client";

import { AppBar, Toolbar, Typography, Button, Container } from "@mui/material";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import CustomerCard from "./CustomerCard";

export default function MainLayoutClient({ initialUser, initialCustomers }) {
  const router = useRouter();
  const user = initialUser;

  const [customers, setCustomers] = useState(initialCustomers ?? []);

  const handleUpdateCustomer = useCallback((index, updatedData) => {
    setCustomers((prev) => {
      const next = prev.slice();
      next[index] = updatedData;
      return next;
    });
  }, []);

  const handleDeleteCustomer = useCallback((deleteIndex) => {
    setCustomers((prev) => prev.filter((_, idx) => idx !== deleteIndex));
  }, []);

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
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Vado App
          </Typography>

          <Typography variant="body1" sx={{ mr: 2 }}>
            {user.email}
          </Typography>

          <Button color="inherit" onClick={handleLogout}>
            Odhlásit
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Seznam zákazníků
        </Typography>

        <Container sx={{ mt: 2, mb: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.push("/customers/new")}
          >
            Přidat zákazníka
          </Button>
        </Container>

        {customers.map((c, i) => (
          <CustomerCard
            key={c._id}
            customer={c}
            index={i}
            user={user}
            onUpdate={handleUpdateCustomer}
            onDelete={() => handleDeleteCustomer(i)}
          />
        ))}
      </Container>
    </>
  );
}

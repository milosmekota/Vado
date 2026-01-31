"use client";

import { Typography, Button, Container, Box } from "@mui/material";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import CustomerCard from "./CustomerCard";

export default function MainLayoutClient({ initialUser, initialCustomers }) {
  const router = useRouter();
  const user = initialUser;

  const [customers, setCustomers] = useState(initialCustomers ?? []);

  const [expandedId, setExpandedId] = useState(null);

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

  useEffect(() => {
    const closeExpanded = () => setExpandedId(null);
    window.addEventListener("vado:goHome", closeExpanded);
    return () => window.removeEventListener("vado:goHome", closeExpanded);
  }, []);

  return (
    <>
      <Container sx={{ mt: 4 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "row", sm: "column" },
            alignItems: { xs: "center", sm: "flex-start" },
            justifyContent: { xs: "space-between", sm: "flex-start" },
            gap: { xs: 2, sm: 1 },
            mb: 2,
          }}
        >
          <Typography variant="h5" sx={{ mb: 0, lineHeight: 1.2 }}>
            Seznam zákazníků
          </Typography>

          <Button
            variant="contained"
            color="primary"
            onClick={() => router.push("/customers/new")}
            aria-label="Přidat zákazníka"
            sx={{
              alignSelf: { xs: "auto", sm: "flex-start" },
              minWidth: { xs: 44, sm: "auto" },
              px: { xs: 1.5, sm: 2 },
              flexShrink: 0,
            }}
          >
            <Box
              component="span"
              sx={{ display: { xs: "inline", sm: "none" } }}
            >
              +
            </Box>
            <Box
              component="span"
              sx={{ display: { xs: "none", sm: "inline" } }}
            >
              Přidat zákazníka
            </Box>
          </Button>
        </Box>

        {customers.map((c, i) => {
          const id = c?._id?.toString?.() ?? String(c?._id ?? "");
          const isExpanded = expandedId === id;

          return (
            <CustomerCard
              key={id}
              customer={c}
              index={i}
              user={user}
              onUpdate={handleUpdateCustomer}
              onDelete={() => handleDeleteCustomer(i)}
              expanded={isExpanded}
              onExpandedChange={(nextExpanded) => {
                setExpandedId(nextExpanded ? id : null);
              }}
            />
          );
        })}
      </Container>
    </>
  );
}

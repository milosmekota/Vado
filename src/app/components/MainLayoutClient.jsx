"use client";

import {
  Typography,
  Button,
  Container,
  Box,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
} from "@mui/material";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import CustomerCard from "./CustomerCard";

function normalizeStr(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

function getDisplayNameForSort(customer) {
  const fn = normalizeStr(customer?.firstName);
  const ln = normalizeStr(customer?.lastName);
  const full = `${fn} ${ln}`.trim();

  // prioritně jméno + příjmení
  if (full) return full;

  // fallback podobně jako title v CustomerCard
  const sn = normalizeStr(customer?.serialNumber);
  if (sn) return `sn:${sn}`;

  const email = normalizeStr(customer?.email);
  if (email) return `email:${email}`;

  return "(bez jmena)";
}

function matchesQuery(customer, q) {
  if (!q) return true;

  const hay = [
    customer?.firstName,
    customer?.lastName,
    customer?.email,
    customer?.serialNumber,
    customer?.address,
    customer?.manufacturer,
    customer?.type,
    customer?.phone,
  ]
    .map(normalizeStr)
    .filter(Boolean)
    .join(" ");

  return hay.includes(q);
}

export default function MainLayoutClient({ initialUser, initialCustomers }) {
  const router = useRouter();
  const user = initialUser;

  const [customers, setCustomers] = useState(initialCustomers ?? []);

  // ✅ jediný otevřený accordion
  const [expandedId, setExpandedId] = useState(null);

  // ✅ filtr + řazení
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState("asc"); // asc | desc

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

  // ✅ klik "Vado" zavře accordion
  useEffect(() => {
    const closeExpanded = () => setExpandedId(null);
    window.addEventListener("vado:goHome", closeExpanded);
    return () => window.removeEventListener("vado:goHome", closeExpanded);
  }, []);

  const filteredAndSortedCustomers = useMemo(() => {
    const q = normalizeStr(query);

    const filtered = customers.filter((c) => matchesQuery(c, q));

    // stabilní řazení: když shodný klíč, dorovnáme podle _id
    const dir = sortDir === "desc" ? -1 : 1;

    return filtered.slice().sort((a, b) => {
      const ka = getDisplayNameForSort(a);
      const kb = getDisplayNameForSort(b);

      if (ka < kb) return -1 * dir;
      if (ka > kb) return 1 * dir;

      const ida = String(a?._id ?? "");
      const idb = String(b?._id ?? "");
      if (ida < idb) return -1;
      if (ida > idb) return 1;
      return 0;
    });
  }, [customers, query, sortDir]);

  return (
    <>
      <Container sx={{ mt: 4 }}>
        {/* Header: mobil řádek, desktop sloupec */}
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

        {/* Filtr + řazení */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <TextField
            fullWidth
            label="Filtrovat (jméno, email, SN, adresa...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <ToggleButtonGroup
            value={sortDir}
            exclusive
            onChange={(_, v) => {
              if (v === "asc" || v === "desc") setSortDir(v);
            }}
            aria-label="Řazení podle jména"
            sx={{ flexShrink: 0, alignSelf: { xs: "stretch", sm: "center" } }}
          >
            <ToggleButton value="asc" aria-label="A až Z">
              A→Z
            </ToggleButton>
            <ToggleButton value="desc" aria-label="Z až A">
              Z→A
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {filteredAndSortedCustomers.map((c) => {
          const id = c?._id?.toString?.() ?? String(c?._id ?? "");
          const isExpanded = expandedId === id;

          return (
            <CustomerCard
              key={id}
              customer={c}
              index={customers.findIndex((x) => String(x?._id ?? "") === id)}
              user={user}
              onUpdate={handleUpdateCustomer}
              onDelete={() => {
                // najdeme index v původním array (protože teď renderujeme seřazené)
                const realIndex = customers.findIndex(
                  (x) => String(x?._id ?? "") === id
                );
                if (realIndex >= 0) handleDeleteCustomer(realIndex);
              }}
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

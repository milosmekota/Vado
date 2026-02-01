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
  Divider,
} from "@mui/material";
import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useDeferredValue,
} from "react";
import { useRouter } from "next/navigation";
import CustomerCard from "./CustomerCard";

function normalizeStr(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

function buildSearchIndex(customer) {
  return [
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
}

function withSearchIndex(customer) {
  if (!customer) return customer;
  return { ...customer, __q: buildSearchIndex(customer) };
}

function getDisplayNameForSort(customer) {
  const fn = normalizeStr(customer?.firstName);
  const ln = normalizeStr(customer?.lastName);
  const full = `${fn} ${ln}`.trim();

  if (full) return full;

  const sn = normalizeStr(customer?.serialNumber);
  if (sn) return `sn:${sn}`;

  const email = normalizeStr(customer?.email);
  if (email) return `email:${email}`;

  return "(bez jmena)";
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function getServiceBucket(lastServiceValue) {
  const raw =
    typeof lastServiceValue === "string" ? lastServiceValue.trim() : "";

  if (!raw) return "missing";

  const last = new Date(raw);
  if (Number.isNaN(last.getTime())) return "missing";

  const now = new Date();
  const before12 = addMonths(now, -12);
  const before24 = addMonths(now, -24);

  if (last >= before12) return "ok";
  if (last >= before24) return "dueSoon";
  return "overdue";
}

export default function MainLayoutClient({
  initialUser,
  initialCustomers,
  initialServiceFilter = "all",
}) {
  const router = useRouter();
  const user = initialUser;

  const [customers, setCustomers] = useState(() =>
    Array.isArray(initialCustomers)
      ? initialCustomers.map(withSearchIndex)
      : [],
  );

  const [expandedId, setExpandedId] = useState(null);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const [sortDir, setSortDir] = useState("asc"); // asc | desc

  const [serviceFilter, setServiceFilter] = useState(() => {
    const v = String(initialServiceFilter ?? "all").trim();
    return v === "ok" || v === "dueSoon" || v === "overdue" || v === "missing"
      ? v
      : "all";
  });

  const handleUpdateCustomer = useCallback((index, updatedData) => {
    if (typeof index !== "number" || index < 0) return;

    setCustomers((prev) => {
      if (!prev[index]) return prev;
      const next = prev.slice();
      next[index] = withSearchIndex(updatedData);
      return next;
    });
  }, []);

  const handleDeleteCustomer = useCallback((deleteIndex) => {
    if (typeof deleteIndex !== "number" || deleteIndex < 0) return;
    setCustomers((prev) => prev.filter((_, idx) => idx !== deleteIndex));
  }, []);

  useEffect(() => {
    const closeExpanded = () => setExpandedId(null);
    window.addEventListener("vado:goHome", closeExpanded);
    return () => window.removeEventListener("vado:goHome", closeExpanded);
  }, []);

  const idToIndex = useMemo(() => {
    const m = new Map();
    for (let i = 0; i < customers.length; i++) {
      const id = String(customers[i]?._id ?? "");
      if (id) m.set(id, i);
    }
    return m;
  }, [customers]);

  const filteredAndSortedCustomers = useMemo(() => {
    const q = normalizeStr(deferredQuery);

    let list = !q
      ? customers
      : customers.filter((c) => (c?.__q ?? "").includes(q));

    if (serviceFilter !== "all") {
      list = list.filter(
        (c) => getServiceBucket(c?.lastService) === serviceFilter,
      );
    }

    const dir = sortDir === "desc" ? -1 : 1;

    return list.slice().sort((a, b) => {
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
  }, [customers, deferredQuery, sortDir, serviceFilter]);

  const handleServiceFilterChange = (_, v) => {
    if (!v) return;

    if (
      v === "all" ||
      v === "ok" ||
      v === "dueSoon" ||
      v === "overdue" ||
      v === "missing"
    ) {
      setServiceFilter(v);

      if (v === "all") {
        router.replace("/customers");
      } else {
        router.replace(`/customers?service=${encodeURIComponent(v)}`);
      }
    }
  };

  return (
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
          <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
            +
          </Box>
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
            Přidat zákazníka
          </Box>
        </Button>
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
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

      <Divider sx={{ mb: 2 }} />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
        >
          Filtr servisů:
        </Typography>

        <ToggleButtonGroup
          value={serviceFilter}
          exclusive
          onChange={handleServiceFilterChange}
          aria-label="Filtr servisů"
          sx={{ flexWrap: "wrap" }}
        >
          <ToggleButton value="all" aria-label="Vše">
            Vše
          </ToggleButton>
          <ToggleButton value="overdue" aria-label="Po termínu">
            🔴 Po termínu
          </ToggleButton>
          <ToggleButton value="dueSoon" aria-label="Blížící se">
            🟡 Blížící se
          </ToggleButton>
          <ToggleButton value="ok" aria-label="OK">
            🟢 OK
          </ToggleButton>
          <ToggleButton value="missing" aria-label="Bez servisu">
            ❓ Bez servisu
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {filteredAndSortedCustomers.map((c) => {
        const id = c?._id?.toString?.() ?? String(c?._id ?? "");
        const isExpanded = expandedId === id;

        const realIndex = idToIndex.get(id) ?? -1;

        return (
          <CustomerCard
            key={id}
            customer={c}
            index={realIndex}
            user={user}
            onUpdate={handleUpdateCustomer}
            onDelete={() => {
              const idx = idToIndex.get(id);
              if (typeof idx === "number") handleDeleteCustomer(idx);
            }}
            expanded={isExpanded}
            onExpandedChange={(nextExpanded) => {
              setExpandedId(nextExpanded ? id : null);
            }}
          />
        );
      })}
    </Container>
  );
}

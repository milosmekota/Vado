"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

const ACTION_LABELS = {
  customer_created: "Založení zákazníka",
  customer_updated: "Úprava zákazníka",
  customer_deleted: "Smazání zákazníka",
  comment_added: "Přidání komentáře",
  comment_updated: "Úprava komentáře",
  comment_deleted: "Smazání komentáře",
  location_updated: "Úprava polohy",
  service_created: "Naplánování servisu",
  service_moved: "Přesun servisu",
  service_deleted: "Smazání servisu",
};

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function HistoryClient() {
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async (nextPage = 1, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/history?page=${nextPage}&limit=100`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Nepodařilo se načíst historii");
      }

      const nextEntries = Array.isArray(data?.entries) ? data.entries : [];
      setEntries((current) => (append ? [...current, ...nextEntries] : nextEntries));
      setPage(Number(data?.page) || nextPage);
      setPages(Number(data?.pages) || 0);
      setTotal(Number(data?.total) || 0);
    } catch (err) {
      setError(err?.message || "Nepodařilo se načíst historii");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5">Historie změn</Typography>
          <Typography variant="body2" color="text.secondary">
            Zaznamenaných událostí: {total}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => loadHistory(1, false)}
          disabled={loading}
        >
          Obnovit
        </Button>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : entries.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            Historie je zatím prázdná. Nové změny se zde začnou zobrazovat automaticky.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {entries.map((entry) => (
            <Paper key={entry._id} variant="outlined" sx={{ p: 2 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={1}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {entry.summary}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Zákazník: {entry.customerName} · Provedl: {entry.actor?.email || "—"}
                  </Typography>
                </Box>
                <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }} spacing={0.75}>
                  <Chip
                    size="small"
                    label={ACTION_LABELS[entry.action] || entry.action}
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatTimestamp(entry.createdAt)}
                  </Typography>
                </Stack>
              </Stack>

              {entry.changes?.length ? (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack spacing={0.75}>
                    {entry.changes.map((change, index) => (
                      <Typography
                        key={`${entry._id}-${change.field}-${index}`}
                        variant="body2"
                        sx={{ overflowWrap: "anywhere" }}
                      >
                        <Box component="span" sx={{ fontWeight: 600 }}>
                          {change.label}:
                        </Box>{" "}
                        {change.from} → {change.to}
                      </Typography>
                    ))}
                  </Stack>
                </>
              ) : null}
            </Paper>
          ))}

          {page < pages ? (
            <Button
              variant="outlined"
              onClick={() => loadHistory(page + 1, true)}
              disabled={loadingMore}
            >
              {loadingMore ? "Načítám…" : "Načíst starší záznamy"}
            </Button>
          ) : null}
        </Stack>
      )}
    </Container>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

function formatCzechDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Prague",
  }).format(d);
}

function customerLabel(c) {
  const fn = String(c?.firstName ?? "").trim();
  const ln = String(c?.lastName ?? "").trim();
  const full = `${fn} ${ln}`.trim();
  if (full) return full;
  if (c?.serialNumber) return `SN: ${String(c.serialNumber).trim()}`;
  if (c?.email) return String(c.email).trim();
  return "(bez jména)";
}

function getEventId(ev) {
  const a = ev?.id?.toString?.();
  if (a) return a;

  const b = String(ev?.id ?? "").trim();
  if (b) return b;

  const c = ev?._id?.toString?.();
  if (c) return c;

  const d = String(ev?._id ?? "").trim();
  if (d) return d;

  return "";
}

function getCustomerIdFromEvent(ev) {
  const a = ev?.customerId?.toString?.();
  if (a) return a;

  const b = String(ev?.customerId ?? "").trim();
  if (b) return b;

  // fallback kdyby backend někdy posílal customer: { id: ... }
  const c = ev?.customer?.id?.toString?.();
  if (c) return c;

  const d = String(ev?.customer?.id ?? "").trim();
  if (d) return d;

  return "";
}

export default function CalendarClient() {
  const [customers, setCustomers] = useState([]);
  const [events, setEvents] = useState([]);

  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [errorCustomers, setErrorCustomers] = useState("");
  const [errorEvents, setErrorEvents] = useState("");

  const [filterCustomerId, setFilterCustomerId] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [deletingIds, setDeletingIds] = useState(() => new Set());

  const [form, setForm] = useState({
    customerId: "",
    title: "Servis",
    start: "",
    end: "",
    notes: "",
  });

  useEffect(() => {
    let mounted = true;

    const loadCustomers = async () => {
      setLoadingCustomers(true);
      setErrorCustomers("");

      try {
        const res = await fetch("/api/customers", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(data?.message || "Nepodařilo se načíst zákazníky");

        if (!mounted) return;
        setCustomers(Array.isArray(data?.customers) ? data.customers : []);
      } catch (e) {
        if (!mounted) return;
        setErrorCustomers(e?.message || "Chyba při načítání zákazníků");
      } finally {
        if (!mounted) return;
        setLoadingCustomers(false);
      }
    };

    loadCustomers();
    return () => {
      mounted = false;
    };
  }, []);

  const loadEvents = async (customerId) => {
    setLoadingEvents(true);
    setErrorEvents("");

    try {
      const qs = new URLSearchParams();
      if (customerId) qs.set("customerId", customerId);

      const url = qs.toString()
        ? `/api/service-events?${qs.toString()}`
        : "/api/service-events";

      const res = await fetch(url, {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          data?.message || "Nepodařilo se načíst servisní eventy",
        );

      setEvents(Array.isArray(data?.events) ? data.events : []);
    } catch (e) {
      setErrorEvents(e?.message || "Chyba při načítání eventů");
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadEvents(filterCustomerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCustomerId]);

  const customersById = useMemo(() => {
    const m = new Map();
    for (const c of customers) {
      const id = c?._id?.toString?.() ?? String(c?._id ?? "");
      const sid = String(id ?? "").trim();
      if (sid) m.set(sid, c);
    }
    return m;
  }, [customers]);

  const openCreate = () => {
    setCreateError("");
    setForm((prev) => ({
      ...prev,
      customerId: filterCustomerId || prev.customerId || "",
      start: "",
      end: "",
      title: prev.title || "Servis",
      notes: prev.notes || "",
    }));
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (creating) return;
    setCreateOpen(false);
  };

  const submitCreate = async () => {
    setCreateError("");

    const payload = {
      customerId: String(form.customerId ?? "").trim(),
      title: String(form.title ?? "").trim(),
      start: String(form.start ?? "").trim(),
      end: String(form.end ?? "").trim(),
      notes: String(form.notes ?? "").trim(),
    };

    if (!payload.customerId) {
      setCreateError("Vyber zákazníka.");
      return;
    }
    if (!payload.title) {
      setCreateError("Vyplň název.");
      return;
    }
    if (!payload.start) {
      setCreateError("Vyplň datum a čas začátku.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/service-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.message || "Nepodařilo se vytvořit event");

      setCreateOpen(false);
      await loadEvents(filterCustomerId);
    } catch (e) {
      setCreateError(e?.message || "Chyba při vytváření eventu");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (ev) => {
    setErrorEvents("");

    const eventId = getEventId(ev);
    const customerId = getCustomerIdFromEvent(ev);

    if (!eventId || !customerId) {
      setErrorEvents("Chybí customerId nebo eventId – nelze smazat.");
      return;
    }

    const ok = window.confirm(
      `Smazat "${ev?.title ?? "Servis"}" (${formatCzechDateTime(ev?.start)})?`,
    );
    if (!ok) return;

    // optimistic remove
    const prevEvents = events;

    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.add(eventId);
      return next;
    });

    setEvents((prev) => prev.filter((x) => getEventId(x) !== eventId));

    try {
      const qs = new URLSearchParams();
      qs.set("customerId", customerId);
      qs.set("eventId", eventId);

      const res = await fetch(`/api/service-events?${qs.toString()}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Nepodařilo se smazat event");
      }
    } catch (e) {
      // rollback
      setEvents(prevEvents);
      setErrorEvents(e?.message || "Chyba při mazání eventu");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  };

  return (
    <Container sx={{ mt: 4, maxWidth: 900 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Typography variant="h5">Kalendář servisů</Typography>
        <Button variant="contained" onClick={openCreate}>
          Přidat servis
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Eventy jsou uložené v databázi a můžeš je filtrovat podle zákazníka.
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ sm: "center" }}
        >
          <FormControl fullWidth>
            <InputLabel id="filter-customer-label">Filtr zákazníka</InputLabel>
            <Select
              labelId="filter-customer-label"
              label="Filtr zákazníka"
              value={filterCustomerId}
              onChange={(e) =>
                setFilterCustomerId(String(e.target.value ?? ""))
              }
            >
              <MenuItem value="">Všichni zákazníci</MenuItem>
              {customers
                .slice()
                .sort((a, b) =>
                  customerLabel(a).localeCompare(customerLabel(b), "cs"),
                )
                .map((c) => {
                  const id = c?._id?.toString?.() ?? String(c?._id ?? "");
                  return (
                    <MenuItem key={id} value={id}>
                      {customerLabel(c)}
                    </MenuItem>
                  );
                })}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            onClick={() => loadEvents(filterCustomerId)}
            disabled={loadingEvents}
          >
            Obnovit
          </Button>
        </Stack>

        {loadingCustomers ? (
          <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Načítám zákazníky…
            </Typography>
          </Box>
        ) : errorCustomers ? (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {errorCustomers}
          </Alert>
        ) : null}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Seznam eventů
        </Typography>

        {loadingEvents ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Načítám eventy…
            </Typography>
          </Box>
        ) : errorEvents ? (
          <Alert severity="warning">{errorEvents}</Alert>
        ) : events.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Zatím žádné eventy.
          </Typography>
        ) : (
          <List>
            {events.map((ev) => {
              const eventId = getEventId(ev);
              const cid = getCustomerIdFromEvent(ev);
              const c = cid ? customersById.get(cid) : null;
              const deleting = Boolean(eventId && deletingIds.has(eventId));

              return (
                <ListItem
                  key={eventId || `${cid}-${String(ev?.start ?? "")}`}
                  divider
                  secondaryAction={
                    <Tooltip title="Smazat">
                      <span>
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleDelete(ev)}
                          disabled={deleting}
                          aria-label="Smazat event"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  }
                >
                  <ListItemText
                    primary={`${ev?.title ?? "Servis"} — ${formatCzechDateTime(ev?.start)}`}
                    secondary={
                      <>
                        <span>
                          Zákazník:{" "}
                          {c ? customerLabel(c) : cid ? `(${cid})` : "—"}
                        </span>
                        {ev?.notes ? (
                          <span>
                            {" · "}
                            {String(ev.notes)}
                          </span>
                        ) : null}
                        {deleting ? (
                          <span>
                            {" · "}
                            <em>Mažu…</em>
                          </span>
                        ) : null}
                      </>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>

      <Dialog open={createOpen} onClose={closeCreate} fullWidth maxWidth="sm">
        <DialogTitle>Přidat servisní event</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="create-customer-label">Zákazník</InputLabel>
              <Select
                labelId="create-customer-label"
                label="Zákazník"
                value={form.customerId}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    customerId: String(e.target.value ?? ""),
                  }))
                }
              >
                {customers
                  .slice()
                  .sort((a, b) =>
                    customerLabel(a).localeCompare(customerLabel(b), "cs"),
                  )
                  .map((c) => {
                    const id = c?._id?.toString?.() ?? String(c?._id ?? "");
                    return (
                      <MenuItem key={id} value={id}>
                        {customerLabel(c)}
                      </MenuItem>
                    );
                  })}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Název"
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
            />

            <TextField
              fullWidth
              label="Začátek"
              type="datetime-local"
              value={form.start}
              onChange={(e) =>
                setForm((p) => ({ ...p, start: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Konec (volitelné)"
              type="datetime-local"
              value={form.end}
              onChange={(e) => setForm((p) => ({ ...p, end: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Poznámka (volitelné)"
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
            />

            {createError ? (
              <Alert severity="warning">{createError}</Alert>
            ) : null}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeCreate} disabled={creating}>
            Zrušit
          </Button>
          <Button
            variant="contained"
            onClick={submitCreate}
            disabled={creating}
          >
            {creating ? "Ukládám…" : "Vytvořit"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";

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

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deletingIds, setDeletingIds] = useState(() => new Set());

  const [form, setForm] = useState({
    customerId: "",
    title: "Servis",
    date: "",
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

  const fcEvents = useMemo(() => {
    return events
      .map((ev) => {
        const id = getEventId(ev);
        const customerId = getCustomerIdFromEvent(ev);
        const title = String(ev?.title ?? "Servis").trim() || "Servis";
        const start = String(ev?.date ?? ev?.start ?? "").trim(); // YYYY-MM-DD z API

        if (!id || !start) return null;

        return {
          id,
          title,
          start,
          allDay: true,
          extendedProps: {
            customerId,
            customerName: String(ev?.customerName ?? "").trim(),
            note: String(ev?.note ?? ev?.notes ?? "").trim(),
            status: ev?.status,
            type: ev?.type,
            source: ev?.source,
          },
        };
      })
      .filter(Boolean);
  }, [events]);

  const openCreate = (prefill = {}) => {
    setCreateError("");
    setForm((prev) => ({
      customerId:
        prefill.customerId ?? filterCustomerId ?? prev.customerId ?? "",
      title: prev.title || "Servis",
      date: prefill.date ?? "",
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
      date: String(form.date ?? "").trim(), // YYYY-MM-DD
      notes: String(form.notes ?? "").trim(),
    };

    if (!payload.customerId) return setCreateError("Vyber zákazníka.");
    if (!payload.title) return setCreateError("Vyplň název.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date))
      return setCreateError("Vyplň datum (YYYY-MM-DD).");

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

  const handleDeleteByRawEvent = async (rawEvent) => {
    setErrorEvents("");

    const eventId = getEventId(rawEvent);
    const customerId = getCustomerIdFromEvent(rawEvent);

    if (!eventId || !customerId) {
      setErrorEvents("Chybí customerId nebo eventId – nelze smazat.");
      return;
    }

    const ok = window.confirm(
      `Smazat "${rawEvent?.title ?? "Servis"}" (${rawEvent?.date ?? rawEvent?.start ?? ""})?`,
    );
    if (!ok) return;

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

  const handleEventDrop = async (info) => {
    const eventId = String(info?.event?.id ?? "").trim();
    const customerId = String(
      info?.event?.extendedProps?.customerId ?? "",
    ).trim();
    const date = String(info?.event?.startStr ?? "").slice(0, 10); // YYYY-MM-DD

    if (!eventId || !customerId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      info.revert();
      return;
    }

    try {
      const res = await fetch("/api/service-events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ customerId, eventId, date }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.message || "Nepodařilo se přesunout event");

      await loadEvents(filterCustomerId);
    } catch (e) {
      setErrorEvents(e?.message || "Chyba při přesunu eventu");
      info.revert();
    }
  };

  return (
    <Container sx={{ mt: 4, maxWidth: 1100 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Typography variant="h5">Kalendář servisů</Typography>
        <Button variant="contained" onClick={() => openCreate()}>
          Přidat servis
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Klikni do dne pro vytvoření. Event můžeš přetáhnout na jiný den.
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
        {loadingEvents ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Načítám eventy…
            </Typography>
          </Box>
        ) : errorEvents ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {errorEvents}
          </Alert>
        ) : null}

        <FullCalendar
          eventDisplay="block"
          eventBorderColor="transparent"
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            listPlugin,
            interactionPlugin,
          ]}
          initialView="dayGridMonth"
          height="auto"
          timeZone="Europe/Prague"
          locale="cs"
          firstDay={1}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          weekends
          editable
          selectable
          selectMirror
          dayMaxEvents
          events={fcEvents}
          dateClick={(arg) => {
            openCreate({ date: arg.dateStr });
          }}
          eventClick={(arg) => {
            setSelectedEvent(arg.event);
          }}
          eventDrop={handleEventDrop}
        />
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
              label="Datum"
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
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

      <Dialog
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Detail eventu</DialogTitle>
        <DialogContent>
          {selectedEvent ? (
            <Stack spacing={1.25} sx={{ mt: 1 }}>
              <Typography variant="subtitle1">
                {selectedEvent.title || "Servis"}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Datum: {String(selectedEvent.startStr ?? "").slice(0, 10)}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Zákazník:{" "}
                {selectedEvent.extendedProps?.customerId
                  ? customersById.get(
                      String(selectedEvent.extendedProps.customerId),
                    )?.firstName
                    ? customerLabel(
                        customersById.get(
                          String(selectedEvent.extendedProps.customerId),
                        ),
                      )
                    : selectedEvent.extendedProps?.customerName ||
                      `(${selectedEvent.extendedProps.customerId})`
                  : "—"}
              </Typography>

              {selectedEvent.extendedProps?.note ? (
                <Typography variant="body2">
                  Poznámka: {String(selectedEvent.extendedProps.note)}
                </Typography>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Box>
            <Tooltip title="Smazat">
              <span>
                <IconButton
                  color="error"
                  onClick={() => {
                    const raw = {
                      id: selectedEvent?.id,
                      title: selectedEvent?.title,
                      date: String(selectedEvent?.startStr ?? "").slice(0, 10),
                      customerId: selectedEvent?.extendedProps?.customerId,
                    };
                    setSelectedEvent(null);
                    handleDeleteByRawEvent(raw);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          <Button onClick={() => setSelectedEvent(null)}>Zavřít</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

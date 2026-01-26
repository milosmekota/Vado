"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  TextField,
  Button,
  Stack,
  Typography,
  Divider,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const formatCzechDate = (isoDate) => {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return String(isoDate);

  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

const formatCzechDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Prague",
  }).format(d);
};

const FIELD_META = [
  { key: "firstName", label: "Jméno", type: "text" },
  { key: "lastName", label: "Příjmení", type: "text" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Telefon", type: "text" },
  { key: "address", label: "Adresa", type: "text" },
  { key: "manufacturer", label: "Výrobce", type: "text" },
  { key: "serialNumber", label: "Výrobní číslo", type: "text" },
  { key: "type", label: "Typ", type: "text" },
  { key: "installYear", label: "Rok instalace", type: "number" },
  { key: "online", label: "Online", type: "checkbox" },
  { key: "lastService", label: "Poslední servis", type: "date" },
];

export default function CustomerCard({
  customer,
  index,
  onUpdate,
  user,
  onDelete,
}) {
  const [editMode, setEditMode] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState({
    ...customer,
    comments: customer.comments || [],
  });
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    setData({
      ...customer,
      comments: customer.comments || [],
    });
  }, [customer]);

  useEffect(() => {
    const handleCloseAll = () => {
      setExpanded(false);
      setEditMode(false);
    };

    window.addEventListener("vado:goHome", handleCloseAll);
    return () => window.removeEventListener("vado:goHome", handleCloseAll);
  }, []);

  const title = useMemo(() => {
    const fn = String(data.firstName ?? "").trim();
    const ln = String(data.lastName ?? "").trim();
    const full = `${fn} ${ln}`.trim();

    if (full) return full;
    if (data.serialNumber) return `SN: ${String(data.serialNumber).trim()}`;
    if (data.email) return String(data.email).trim();
    return "(bez jména)";
  }, [data.firstName, data.lastName, data.serialNumber, data.email]);

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const payload = {
        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        address: data.address ?? "",
        manufacturer: data.manufacturer ?? "",
        serialNumber: data.serialNumber ?? "",
        type: data.type ?? "",
        installYear:
          data.installYear === "" || data.installYear == null
            ? null
            : Number(data.installYear),
        online: Boolean(data.online),
        lastService: data.lastService ?? "",
      };

      const res = await fetch(`/api/customers/${customer._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Save failed");
      }

      const { customer: updatedCustomer } = await res.json();

      setData(updatedCustomer);
      onUpdate(index, updatedCustomer);
      setEditMode(false);
    } catch (err) {
      console.error(err);
      alert("Nepodařilo se uložit zákazníka");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const res = await fetch(`/api/customers/${customer._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: newComment }),
      });

      if (!res.ok) throw new Error("Failed to save comment");

      const { customer: updatedCustomer } = await res.json();
      setData(updatedCustomer);
      onUpdate(index, updatedCustomer);
      setNewComment("");
    } catch (err) {
      console.error(err);
      alert("Nepodařilo se uložit komentář");
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm(`Opravdu chceš smazat zákazníka "${title}"?`);
    if (!ok) return;

    const customerId =
      customer?._id?.toString?.() ?? String(customer?._id ?? "").trim();

    if (!customerId) {
      alert("Chybí customer id – nelze smazat.");
      return;
    }

    try {
      const res = await fetch(
        `/api/customers/${encodeURIComponent(customerId)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Delete failed");
      }

      onDelete?.(index);
    } catch (err) {
      console.error(err);
      alert("Nepodařilo se smazat zákazníka");
    }
  };

  const renderViewValue = (meta) => {
    const value = data?.[meta.key];

    if (meta.type === "checkbox") return value ? "Ano" : "Ne";
    if (meta.type === "date") return formatCzechDate(value);

    if (meta.key === "installYear") {
      return value == null || value === "" ? "" : String(value);
    }

    return String(value ?? "");
  };

  const renderEditField = (meta) => {
    const value = data?.[meta.key];

    if (meta.type === "checkbox") {
      return (
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(value)}
              onChange={(e) => handleChange(meta.key, e.target.checked)}
            />
          }
          label={meta.label}
        />
      );
    }

    if (meta.type === "date") {
      const dateValue =
        typeof value === "string" ? value.split("T")[0] ?? "" : "";
      return (
        <TextField
          fullWidth
          label={meta.label}
          type="date"
          value={dateValue}
          onChange={(e) => handleChange(meta.key, e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      );
    }

    if (meta.type === "number") {
      return (
        <TextField
          fullWidth
          label={meta.label}
          type="number"
          value={value ?? ""}
          onChange={(e) => handleChange(meta.key, e.target.value)}
          inputProps={{ min: 1900, max: 3000 }}
        />
      );
    }

    return (
      <TextField
        fullWidth
        label={meta.label}
        type={meta.type || "text"}
        value={value ?? ""}
        onChange={(e) => handleChange(meta.key, e.target.value)}
      />
    );
  };

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>{title}</Typography>
      </AccordionSummary>

      <AccordionDetails>
        {editMode ? (
          <>
            <List>
              {FIELD_META.map((meta) => (
                <ListItem key={meta.key} sx={{ alignItems: "flex-start" }}>
                  {renderEditField(meta)}
                </ListItem>
              ))}
            </List>

            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button variant="contained" onClick={handleSave}>
                Uložit
              </Button>
              <Button variant="outlined" onClick={() => setEditMode(false)}>
                Zrušit
              </Button>
              <Button variant="outlined" color="error" onClick={handleDelete}>
                Smazat
              </Button>
            </Stack>
          </>
        ) : (
          <>
            <List dense disablePadding>
              {FIELD_META.map((meta) => {
                const value = renderViewValue(meta);
                const displayValue = String(value ?? "").trim() || "—";

                return (
                  <ListItem
                    key={meta.key}
                    disableGutters
                    sx={{
                      py: 0.8,
                    }}
                  >
                    <ListItemText
                      primary={displayValue}
                      primaryTypographyProps={{
                        fontSize: "1rem",
                        lineHeight: 1.2,
                      }}
                      secondary={meta.label}
                      secondaryTypographyProps={{
                        fontSize: "0.75rem",
                        lineHeight: 1.1,
                        color: "text.secondary",
                      }}
                      sx={{ my: 0 }}
                    />
                  </ListItem>
                );
              })}
            </List>

            <Button
              variant="outlined"
              sx={{ mt: 1 }}
              onClick={() => setEditMode(true)}
            >
              Editovat
            </Button>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6">Komentáře</Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label="Přidat komentář"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <Button variant="contained" onClick={handleAddComment}>
                Přidat
              </Button>
            </Stack>

            {data.comments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Zatím žádné komentáře.
              </Typography>
            ) : (
              <List>
                {data.comments.map((c, i) => (
                  <ListItem
                    key={i}
                    sx={{
                      flexDirection: "column",
                      alignItems: "flex-start",
                      border: "1px solid #ddd",
                      borderRadius: 2,
                      mb: 1,
                      p: 1,
                    }}
                  >
                    <Typography>{c.text}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.user} — {formatCzechDateTime(c.date)}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

"use client";
import React, { useEffect, useMemo, useState } from "react";
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
  Box,
  Tooltip,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorIcon from "@mui/icons-material/Error";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";

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

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function getServiceStatus(lastServiceValue) {
  const raw =
    typeof lastServiceValue === "string" ? lastServiceValue.trim() : "";
  if (!raw)
    return { level: "warning", tooltip: "Poslední servis není vyplněný" };

  const last = new Date(raw);
  if (Number.isNaN(last.getTime()))
    return { level: "warning", tooltip: "Poslední servis má neplatné datum" };

  const now = new Date();
  const before12 = addMonths(now, -12);
  const before24 = addMonths(now, -24);

  if (last >= before12)
    return { level: "success", tooltip: "Servis v posledních 12 měsících" };
  if (last >= before24)
    return { level: "warning", tooltip: "Servis starý 12–24 měsíců" };
  return { level: "error", tooltip: "Servis starší než 24 měsíců" };
}

function StatusIcon({ level }) {
  if (level === "success")
    return <CheckCircleIcon fontSize="small" sx={{ color: "success.main" }} />;
  if (level === "error")
    return <ErrorIcon fontSize="small" sx={{ color: "error.main" }} />;
  return <WarningAmberIcon fontSize="small" sx={{ color: "warning.main" }} />;
}

function normalizeEmail(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

function CustomerCardInner({
  customer,
  index,
  onUpdate,
  user,
  onDelete,
  expanded = false,
  onExpandedChange,
}) {
  const [editMode, setEditMode] = useState(false);

  const [data, setData] = useState({
    ...customer,
    comments: customer.comments || [],
  });

  const [newComment, setNewComment] = useState("");

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    setData({
      ...customer,
      comments: customer.comments || [],
    });
  }, [customer]);

  useEffect(() => {
    const handleCloseAll = () => setEditMode(false);
    window.addEventListener("vado:goHome", handleCloseAll);
    return () => window.removeEventListener("vado:goHome", handleCloseAll);
  }, []);

  useEffect(() => {
    if (!expanded) {
      setEditMode(false);
      setEditingCommentId(null);
      setEditingText("");
    }
  }, [expanded]);

  const title = useMemo(() => {
    const fn = String(data.firstName ?? "").trim();
    const ln = String(data.lastName ?? "").trim();
    const full = `${fn} ${ln}`.trim();

    if (full) return full;
    if (data.serialNumber) return `SN: ${String(data.serialNumber).trim()}`;
    if (data.email) return String(data.email).trim();
    return "(bez jména)";
  }, [data.firstName, data.lastName, data.serialNumber, data.email]);

  const serviceStatus = useMemo(
    () => getServiceStatus(data?.lastService),
    [data?.lastService],
  );

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

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body?.message || "Failed to save comment");
      }

      const updatedCustomer = body.customer;
      setData(updatedCustomer);
      onUpdate(index, updatedCustomer);
      setNewComment("");
    } catch (err) {
      console.error(err);
      alert("Nepodařilo se uložit komentář");
    }
  };

  const startEditComment = (comment) => {
    const cid = String(comment?.id ?? "").trim();
    if (!cid) return;
    setEditingCommentId(cid);
    setEditingText(String(comment?.text ?? ""));
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingText("");
  };

  const saveEditComment = async () => {
    const cid = String(editingCommentId ?? "").trim();
    const text = String(editingText ?? "").trim();
    if (!cid || !text) return;

    try {
      const res = await fetch(
        `/api/customers/${customer._id}/comments/${encodeURIComponent(cid)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text }),
        },
      );

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403) {
          alert("Tenhle komentář nemůžeš upravit (není tvůj).");
          return;
        }
        throw new Error(body?.message || "Failed to update comment");
      }

      const updatedCustomer = body.customer;
      setData(updatedCustomer);
      onUpdate(index, updatedCustomer);
      cancelEditComment();
    } catch (err) {
      console.error(err);
      alert("Nepodařilo se upravit komentář");
    }
  };

  const deleteComment = async (comment) => {
    const cid = String(comment?.id ?? "").trim();
    if (!cid) return;

    const ok = window.confirm("Opravdu chceš smazat tento komentář?");
    if (!ok) return;

    try {
      const res = await fetch(
        `/api/customers/${customer._id}/comments/${encodeURIComponent(cid)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403) {
          alert("Tenhle komentář nemůžeš smazat (není tvůj).");
          return;
        }
        throw new Error(body?.message || "Failed to delete comment");
      }

      const updatedCustomer = body.customer;
      setData(updatedCustomer);
      onUpdate(index, updatedCustomer);

      if (editingCommentId === cid) cancelEditComment();
    } catch (err) {
      console.error(err);
      alert("Nepodařilo se smazat komentář");
    }
  };

  const handleDeleteCustomer = async () => {
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
        },
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
    if (meta.key === "installYear")
      return value == null || value === "" ? "" : String(value);
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
        typeof value === "string" ? (value.split("T")[0] ?? "") : "";
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

  const myEmail = normalizeEmail(user?.email);

  return (
    <Accordion
      expanded={Boolean(expanded)}
      onChange={(_, isExpanded) => onExpandedChange?.(isExpanded)}
      TransitionProps={{ unmountOnExit: true, timeout: 150 }}
      slotProps={{ transition: { unmountOnExit: true, timeout: 150 } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ flexGrow: 1 }}>{title}</Typography>

        <Tooltip title={serviceStatus.tooltip} arrow>
          <Box sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}>
            <StatusIcon level={serviceStatus.level} />
          </Box>
        </Tooltip>
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
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteCustomer}
              >
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
                  <ListItem key={meta.key} disableGutters sx={{ py: 0.8 }}>
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
              <Button
                variant="contained"
                onClick={handleAddComment}
                disabled={Boolean(editingCommentId)}
              >
                Přidat
              </Button>
            </Stack>

            {data.comments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Zatím žádné komentáře.
              </Typography>
            ) : (
              <List>
                {data.comments.map((c) => {
                  const cid = String(c?.id ?? "").trim();
                  const isMine = normalizeEmail(c?.user) === myEmail;
                  const isAdmin = user?.role === "admin";
                  const canManage = (isMine || isAdmin) && Boolean(cid);
                  const isEditing = cid && editingCommentId === cid;

                  return (
                    <ListItem
                      key={cid || `${c.user}-${c.date}`}
                      sx={{
                        position: "relative",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        border: "1px solid #ddd",
                        borderRadius: 2,
                        mb: 1,
                        p: 1.25,
                        width: "100%",
                        pr: canManage ? 6 : 1.25,
                      }}
                    >
                      {canManage ? (
                        <>
                          <Box
                            sx={{
                              position: "absolute",
                              top: 4,
                              right: 4,
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.25,
                              alignItems: "center",
                            }}
                          >
                            {isEditing ? (
                              <Tooltip title="Uložit" arrow>
                                <IconButton
                                  size="small"
                                  onClick={saveEditComment}
                                  aria-label="Uložit komentář"
                                >
                                  <SaveIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="Upravit" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => startEditComment(c)}
                                  aria-label="Upravit komentář"
                                  disabled={Boolean(editingCommentId)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>

                          <Box
                            sx={{
                              position: "absolute",
                              bottom: 4,
                              right: 4,
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.25,
                              alignItems: "center",
                            }}
                          >
                            {isEditing ? (
                              <Tooltip title="Zrušit" arrow>
                                <IconButton
                                  size="small"
                                  onClick={cancelEditComment}
                                  aria-label="Zrušit úpravu"
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="Smazat" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => deleteComment(c)}
                                  aria-label="Smazat komentář"
                                  disabled={Boolean(editingCommentId)}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </>
                      ) : null}

                      {isEditing ? (
                        <TextField
                          fullWidth
                          multiline
                          minRows={2}
                          label="Upravit komentář"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                        />
                      ) : (
                        <Typography sx={{ whiteSpace: "pre-wrap" }}>
                          {c.text}
                        </Typography>
                      )}

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        {c.user} — {formatCzechDateTime(c.date)}
                      </Typography>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

const CustomerCard = React.memo(CustomerCardInner, (prev, next) => {
  const prevId = String(prev.customer?._id ?? "");
  const nextId = String(next.customer?._id ?? "");
  if (prevId !== nextId) return false;
  if (prev.expanded !== next.expanded) return false;

  if (prev.customer !== next.customer) return false;

  return true;
});

export default CustomerCard;

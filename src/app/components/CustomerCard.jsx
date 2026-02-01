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
    if (!expanded) setEditMode(false);
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

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const res = await fetch(`/api/customers/${customer._id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text: newComment }),
    });

    if (!res.ok) return alert("Nepodařilo se uložit komentář");

    const { customer: updatedCustomer } = await res.json();
    setData(updatedCustomer);
    onUpdate(index, updatedCustomer);
    setNewComment("");
  };

  const handleEditComment = (c) => {
    setEditingCommentId(c.id);
    setEditingText(c.text);
  };

  const handleSaveComment = async (commentId) => {
    const res = await fetch(
      `/api/customers/${customer._id}/comments/${commentId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: editingText }),
      },
    );

    if (!res.ok) return alert("Nepodařilo se upravit komentář");

    const { customer: updatedCustomer } = await res.json();
    setData(updatedCustomer);
    onUpdate(index, updatedCustomer);
    setEditingCommentId(null);
    setEditingText("");
  };

  const handleDeleteComment = async (commentId) => {
    const ok = window.confirm("Opravdu chceš smazat tento komentář?");
    if (!ok) return;

    const res = await fetch(
      `/api/customers/${customer._id}/comments/${commentId}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );

    if (!res.ok) return alert("Nepodařilo se smazat komentář");

    const { customer: updatedCustomer } = await res.json();
    setData(updatedCustomer);
    onUpdate(index, updatedCustomer);
  };

  return (
    <Accordion expanded={expanded} onChange={(_, e) => onExpandedChange(e)}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ flexGrow: 1 }}>{title}</Typography>
        <Tooltip title={serviceStatus.tooltip}>
          <Box sx={{ display: "inline-flex", alignItems: "center" }}>
            <StatusIcon level={serviceStatus.level} />
          </Box>
        </Tooltip>
      </AccordionSummary>

      <AccordionDetails>
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

        <List>
          {data.comments.map((c) => {
            const isOwner = c.user === user?.email;
            const isEditing = editingCommentId === c.id;

            return (
              <ListItem
                key={c.id}
                sx={{
                  border: "1px solid #ddd",
                  borderRadius: 2,
                  mb: 1,
                  alignItems: "stretch",
                }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                    />
                  ) : (
                    <>
                      <Typography>{c.text}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.user} — {formatCzechDateTime(c.date)}
                      </Typography>
                    </>
                  )}
                </Box>

                {isOwner && (
                  <Stack
                    direction="column"
                    spacing={0.5}
                    sx={{ ml: 1, alignItems: "flex-end" }}
                  >
                    {isEditing ? (
                      <>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleSaveComment(c.id)}
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>

                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setEditingCommentId(null)}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleEditComment(c)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>

                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteComment(c.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </Stack>
                )}
              </ListItem>
            );
          })}
        </List>
      </AccordionDetails>
    </Accordion>
  );
}

export default React.memo(CustomerCardInner);

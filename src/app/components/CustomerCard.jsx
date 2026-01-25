"use client";
import { useEffect, useState } from "react";
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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const formatCzechDate = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

export default function CustomerCard({ customer, index, onUpdate, user }) {
  const [editMode, setEditMode] = useState(false);
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

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: data.name,
        phone: data.phone,
        address: data.address,
        pump: data.pump,
        install: data.install,
        lastService: data.lastService,
      };

      const res = await fetch(`/api/customers/${customer._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Save failed");

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

  const visibleFields = (obj) =>
    Object.entries(obj).filter(
      ([key]) => !["_id", "__v", "comments"].includes(key)
    );

  const isDateField = (key) => ["install", "lastService"].includes(key);

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>{data.name}</Typography>
      </AccordionSummary>

      <AccordionDetails>
        {editMode ? (
          <>
            <List>
              {visibleFields(data).map(([key, value]) => (
                <ListItem key={key}>
                  <TextField
                    fullWidth
                    label={key}
                    type={isDateField(key) ? "date" : "text"}
                    value={
                      isDateField(key)
                        ? value?.split("T")[0] ?? ""
                        : value ?? ""
                    }
                    onChange={(e) => handleChange(key, e.target.value)}
                  />
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
            </Stack>
          </>
        ) : (
          <>
            <List>
              {visibleFields(data).map(([key, value]) => (
                <ListItem key={key}>
                  <ListItemText
                    primary={key}
                    secondary={
                      isDateField(key)
                        ? formatCzechDate(value)
                        : String(value ?? "")
                    }
                    sx={{ textTransform: "capitalize" }}
                  />
                </ListItem>
              ))}
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
                      {c.user} —{" "}
                      {(() => {
                        if (!c.date) return "";
                        const ts = Date.parse(c.date);
                        if (Number.isNaN(ts)) return String(c.date);
                        return new Date(ts).toLocaleString("cs-CZ");
                      })()}
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

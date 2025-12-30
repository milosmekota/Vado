"use client";
import { useState } from "react";
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

export default function CustomerCard({ customer, index, onUpdate, user }) {
  const [editMode, setEditMode] = useState(false);
  const [data, setData] = useState({
    ...customer,
    comments: customer.comments || [],
  });
  const [newComment, setNewComment] = useState("");

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/customers/${customer._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Save failed");
      }

      const result = await res.json();
      const updatedCustomer = result.customer;

      // 🔴 KLÍČOVÉ OPRAVY
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

    const commentObj = {
      text: newComment,
      user: user.email,
      date: new Date().toLocaleString(),
    };

    try {
      const res = await fetch(`/api/customers/${customer._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          comments: [commentObj, ...(data.comments || [])],
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save comment");
      }

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
                    value={value ?? ""}
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
                    secondary={String(value ?? "")}
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
                      {c.user} — {c.date}
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

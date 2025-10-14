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
  const [data, setData] = useState(customer);
  const [comments, setComments] = useState(customer.comments || []);
  const [newComment, setNewComment] = useState("");

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onUpdate(index, { ...data, comments });
    setEditMode(false);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const commentObj = {
      text: newComment,
      user: user.email,
      date: new Date().toLocaleString(),
    };
    const updatedComments = [commentObj, ...comments];
    setComments(updatedComments);
    setNewComment("");
    onUpdate(index, { ...data, comments: updatedComments });
  };

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>{data.name}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {editMode ? (
          <>
            <List>
              {Object.entries(data)
                .filter(([key]) => key !== "comments")
                .map(([key, value]) => (
                  <ListItem key={key}>
                    <TextField
                      fullWidth
                      label={key}
                      value={value}
                      onChange={(e) => handleChange(key, e.target.value)}
                    />
                  </ListItem>
                ))}
            </List>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button variant="contained" color="primary" onClick={handleSave}>
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
              {Object.entries(data)
                .filter(([key]) => key !== "comments")
                .map(([key, value]) => (
                  <ListItem key={key}>
                    <ListItemText
                      primary={key}
                      secondary={value}
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

            {/* KOMENTÁŘE */}
            <Typography variant="h6" sx={{ mb: 1 }}>
              Komentáře
            </Typography>
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

            {comments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Zatím žádné komentáře.
              </Typography>
            ) : (
              <List>
                {comments.map((c, i) => (
                  <ListItem
                    key={i}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      border: "1px solid #ddd",
                      borderRadius: 2,
                      mb: 1,
                      p: 1,
                    }}
                  >
                    <Typography variant="body1">{c.text}</Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
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

"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export default function AiChatClient() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Napiš, co chceš zjistit. Umím číst zákazníky a navrhnout krátkodobé i dlouhodobé úkoly. Zkus třeba: „Co teď hoří?“ nebo „Najdi Nováka“.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [previousResponseId, setPreviousResponseId] = useState(null);

  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: nextMessages,
          previous_response_id: previousResponseId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data?.message || "AI chyba" },
        ]);
        return;
      }

      setPreviousResponseId(data?.response_id || null);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data?.answer || "(bez odpovědi)" },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Server nedostupný" },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", mt: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        AI asistent (read-only)
      </Typography>

      <Paper sx={{ p: 2, mb: 2, height: 520, overflow: "auto" }}>
        <Stack spacing={1.5}>
          {messages.map((m, i) => (
            <Box
              key={i}
              sx={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
              }}
            >
              <Paper
                variant="outlined"
                sx={{
                  p: 1.25,
                  whiteSpace: "pre-wrap",
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 0.5 }}
                >
                  {m.role === "user" ? "Ty" : "AI"}
                </Typography>
                <Typography variant="body1">{m.content}</Typography>
              </Paper>
            </Box>
          ))}
          {sending ? (
            <Typography variant="body2" color="text.secondary">
              AI přemýšlí…
            </Typography>
          ) : null}
          <div ref={bottomRef} />
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          fullWidth
          label="Zpráva"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          multiline
          minRows={1}
          maxRows={4}
        />
        <Button variant="contained" onClick={send} disabled={sending}>
          Odeslat
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap" }}>
        <Button
          size="small"
          onClick={() =>
            setInput("Co teď hoří? Vypiš krátkodobé úkoly a priority.")
          }
        >
          Co hoří
        </Button>
        <Button
          size="small"
          onClick={() =>
            setInput("Vypiš servisní úkoly a dlouhodobé zlepšení.")
          }
        >
          Úkoly
        </Button>
        <Button size="small" onClick={() => setInput("Najdi zákazníka: Novak")}>
          Hledat
        </Button>
      </Stack>
    </Box>
  );
}

"use client";
import { useState } from "react";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";

const REGISTRATION_ENABLED =
  process.env.NEXT_PUBLIC_ALLOW_REGISTRATION === "true";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Chyba");
        return;
      }

      login(data.user);
    } catch {
      setError("Server nedostupný");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 10 }}>
        <Typography variant="h5" gutterBottom>
          {isRegister ? "Registrace" : "Přihlášení"}
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            margin="normal"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <TextField
            fullWidth
            margin="normal"
            label="Heslo"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isRegister ? "new-password" : "current-password"}
          />

          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            disabled={submitting}
          >
            {submitting
              ? "Odesílám..."
              : isRegister
              ? "Registrovat"
              : "Přihlásit"}
          </Button>

          {REGISTRATION_ENABLED && (
            <Button
              fullWidth
              sx={{ mt: 1 }}
              onClick={() => setIsRegister(!isRegister)}
              disabled={submitting}
            >
              {isRegister ? "Už mám účet" : "Nemám účet – registrace"}
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

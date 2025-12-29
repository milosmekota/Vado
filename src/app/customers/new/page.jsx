"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Container, TextField, Button, Typography, Paper } from "@mui/material";

export default function NewCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    pump: "",
    install: "",
    lastService: "",
    comments: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCancel = () => {
    router.push("/");
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Chyba při ukládání");
        setLoading(false);
        return;
      }

      router.push("/");
    } catch (err) {
      setError("Server nedostupný");
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Přidat nového zákazníka
        </Typography>

        <TextField
          fullWidth
          label="Jméno"
          name="name"
          value={form.name}
          onChange={handleChange}
          sx={{ mt: 2 }}
        />
        <TextField
          fullWidth
          label="Telefon"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          sx={{ mt: 2 }}
        />
        <TextField
          fullWidth
          label="Adresa"
          name="address"
          value={form.address}
          onChange={handleChange}
          sx={{ mt: 2 }}
        />
        <TextField
          fullWidth
          label="Pumpa"
          name="pump"
          value={form.pump}
          onChange={handleChange}
          sx={{ mt: 2 }}
        />
        <TextField
          fullWidth
          label="Instalace"
          name="install"
          type="date"
          value={form.install}
          onChange={handleChange}
          sx={{ mt: 2 }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          label="Poslední servis"
          name="lastService"
          type="date"
          value={form.lastService}
          onChange={handleChange}
          sx={{ mt: 2 }}
          InputLabelProps={{ shrink: true }}
        />

        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}

        <Button
          variant="contained"
          color="primary"
          sx={{ mt: 3, mr: 2 }}
          onClick={handleSave}
          disabled={loading}
        >
          Uložit
        </Button>
        <Button
          variant="outlined"
          sx={{ mt: 3 }}
          onClick={handleCancel}
          disabled={loading}
        >
          Zrušit
        </Button>
      </Paper>
    </Container>
  );
}

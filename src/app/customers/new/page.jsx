"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Stack,
  FormControlLabel,
  Checkbox,
} from "@mui/material";

export default function NewCustomerPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    manufacturer: "",
    serialNumber: "",
    type: "",
    installYear: "",
    online: false,
    lastService: "",
    comments: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    router.push("/");
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");

    const payload = {
      ...form,
      installYear:
        form.installYear === "" || form.installYear == null
          ? null
          : Number(form.installYear),
      online: Boolean(form.online),
    };

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || "Chyba při ukládání");
        setLoading(false);
        return;
      }

      router.push("/");
    } catch (err) {
      console.error(err);
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
          name="firstName"
          value={form.firstName}
          onChange={handleChange}
          sx={{ mt: 2 }}
        />

        <TextField
          fullWidth
          label="Příjmení"
          name="lastName"
          value={form.lastName}
          onChange={handleChange}
          sx={{ mt: 2 }}
        />

        <TextField
          fullWidth
          label="Email"
          name="email"
          type="email"
          value={form.email}
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
          label="Výrobce"
          name="manufacturer"
          value={form.manufacturer}
          onChange={handleChange}
          sx={{ mt: 2 }}
        />

        <TextField
          fullWidth
          label="Výrobní číslo"
          name="serialNumber"
          value={form.serialNumber}
          onChange={handleChange}
          sx={{ mt: 2 }}
        />

        <TextField
          fullWidth
          label="Typ"
          name="type"
          value={form.type}
          onChange={handleChange}
          sx={{ mt: 2 }}
        />

        <TextField
          fullWidth
          label="Rok instalace"
          name="installYear"
          type="number"
          value={form.installYear}
          onChange={handleChange}
          sx={{ mt: 2 }}
          inputProps={{ min: 1900, max: 3000 }}
        />

        <FormControlLabel
          sx={{ mt: 2 }}
          control={
            <Checkbox
              checked={Boolean(form.online)}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, online: e.target.checked }))
              }
            />
          }
          label="Online"
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

        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={loading}
          >
            Uložit
          </Button>
          <Button variant="outlined" onClick={handleCancel} disabled={loading}>
            Zrušit
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Typography,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";

import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SettingsIcon from "@mui/icons-material/Settings";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorIcon from "@mui/icons-material/Error";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function getServiceBucket(lastServiceValue) {
  const raw =
    typeof lastServiceValue === "string" ? lastServiceValue.trim() : "";

  if (!raw) return "missing";

  const last = new Date(raw);
  if (Number.isNaN(last.getTime())) return "missing";

  const now = new Date();
  const before12 = addMonths(now, -12);
  const before24 = addMonths(now, -24);

  if (last >= before12) return "ok";
  if (last >= before24) return "dueSoon";
  return "overdue";
}

function DashCard({ title, subtitle, icon, onClick, disabled = false }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardActionArea
        onClick={disabled ? undefined : onClick}
        sx={{ height: "100%" }}
        disabled={disabled}
      >
        <CardContent sx={{ height: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1 }}>
            {icon}
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              {title}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function StatCard({ label, value, icon, onClick, subtitle }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardActionArea onClick={onClick} sx={{ height: "100%" }}>
        <CardContent sx={{ height: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
            {icon}
            <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }}>
              {label}
            </Typography>
          </Box>

          <Typography variant="h4" sx={{ lineHeight: 1.1, mb: 0.5 }}>
            {value}
          </Typography>

          {subtitle ? (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function DashboardClient() {
  const router = useRouter();

  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customersError, setCustomersError] = useState("");
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoadingCustomers(true);
      setCustomersError("");

      try {
        const res = await fetch("/api/customers", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.message || "Nepodařilo se načíst zákazníky");
        }

        if (!mounted) return;
        setCustomers(Array.isArray(data?.customers) ? data.customers : []);
      } catch (e) {
        if (!mounted) return;
        setCustomersError(e?.message || "Chyba při načítání zákazníků");
      } finally {
        if (!mounted) return;
        setLoadingCustomers(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const out = {
      total: 0,
      ok: 0,
      dueSoon: 0,
      overdue: 0,
      missing: 0,
    };

    if (!Array.isArray(customers)) return out;

    out.total = customers.length;

    for (const c of customers) {
      const bucket = getServiceBucket(c?.lastService);
      if (bucket === "ok") out.ok += 1;
      else if (bucket === "dueSoon") out.dueSoon += 1;
      else if (bucket === "overdue") out.overdue += 1;
      else out.missing += 1;
    }

    return out;
  }, [customers]);

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Dashboard
      </Typography>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Moduly
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <DashCard
            title="Zákazníci"
            subtitle="Seznam zákazníků, servisní data a komentáře"
            icon={<PeopleAltIcon />}
            onClick={() => router.push("/customers")}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <DashCard
            title="Kalendář"
            subtitle="Plán servisů (doděláme později)"
            icon={<CalendarMonthIcon />}
            onClick={() => router.push("/calendar")}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <DashCard
            title="AI asistent"
            subtitle="Dotazy nad databází a návrhy akcí (doděláme později)"
            icon={<SmartToyIcon />}
            onClick={() => router.push("/ai")}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <DashCard
            title="Nastavení"
            subtitle="Uživatelé, role, preference (rezerva)"
            icon={<SettingsIcon />}
            onClick={() => router.push("/settings")}
          />
        </Grid>
      </Grid>

      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Statistiky servisů
        </Typography>

        {loadingCustomers ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Načítám zákazníky…
            </Typography>
          </Box>
        ) : customersError ? (
          <Alert severity="warning">{customersError}</Alert>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                label="Zákazníků celkem"
                value={stats.total}
                icon={<PeopleAltIcon />}
                subtitle="Klikni pro zobrazení všech"
                onClick={() => router.push("/customers")}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                label="Servis po termínu"
                value={stats.overdue}
                icon={<ErrorIcon sx={{ color: "error.main" }} />}
                subtitle="> 24 měsíců"
                onClick={() => router.push("/customers?service=overdue")}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                label="Blížící se servis"
                value={stats.dueSoon}
                icon={<WarningAmberIcon sx={{ color: "warning.main" }} />}
                subtitle="12–24 měsíců"
                onClick={() => router.push("/customers?service=dueSoon")}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                label="Servis OK"
                value={stats.ok}
                icon={<CheckCircleIcon sx={{ color: "success.main" }} />}
                subtitle="< 12 měsíců"
                onClick={() => router.push("/customers?service=ok")}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                label="Bez vyplněného servisu"
                value={stats.missing}
                icon={<HelpOutlineIcon sx={{ color: "text.secondary" }} />}
                subtitle="chybí / neplatné datum"
                onClick={() => router.push("/customers?service=missing")}
              />
            </Grid>
          </Grid>
        )}
      </Box>
    </Container>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Typography,
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
import MapIcon from "@mui/icons-material/Map";
import HistoryIcon from "@mui/icons-material/History";

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

function DashCard({
  title,
  icon,
  onClick,
  disabled = false,
  color = "primary",
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderRadius: 3,
        overflow: "hidden",
        transition: "transform 160ms ease, box-shadow 160ms ease",
        "@media (hover: hover)": {
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: 4,
          },
        },
      }}
    >
      <CardActionArea
        onClick={disabled ? undefined : onClick}
        sx={{ height: "100%" }}
        disabled={disabled}
      >
        <CardContent
          sx={{
            height: "100%",
            minHeight: { xs: 112, sm: 120 },
            p: { xs: 1.5, sm: 2 },
            display: "flex",
            flexDirection: "column",
            alignItems: { xs: "center", sm: "flex-start" },
            textAlign: { xs: "center", sm: "left" },
            "&:last-child": { pb: { xs: 1.5, sm: 2 } },
          }}
        >
          <Box
            sx={(theme) => {
              const paletteColor = theme.palette[color] || theme.palette.primary;
              return {
                width: 44,
                height: 44,
                mb: 1.25,
                borderRadius: 2.5,
                display: "grid",
                placeItems: "center",
                color: paletteColor.main,
                bgcolor: `${paletteColor.main}18`,
                "& .MuiSvgIcon-root": { fontSize: 25 },
              };
            }}
          >
            {icon}
          </Box>

          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, lineHeight: 1.25 }}
          >
            {title}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function StatCard({
  label,
  value,
  icon,
  onClick,
  subtitle,
  color = "primary",
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderRadius: 3,
        overflow: "hidden",
        transition: "transform 160ms ease, box-shadow 160ms ease",
        "@media (hover: hover)": {
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: 4,
          },
        },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: "100%" }}>
        <CardContent
          sx={{
            height: "100%",
            minHeight: { xs: 132, sm: 142 },
            p: { xs: 1.5, sm: 2 },
            display: "flex",
            flexDirection: "column",
            "&:last-child": { pb: { xs: 1.5, sm: 2 } },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Box
              sx={(theme) => {
                const paletteColor =
                  theme.palette[color] || theme.palette.primary;
                return {
                  width: 32,
                  height: 32,
                  flex: "0 0 auto",
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  color: paletteColor.main,
                  bgcolor: `${paletteColor.main}18`,
                  "& .MuiSvgIcon-root": { fontSize: 20 },
                };
              }}
            >
              {icon}
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, lineHeight: 1.2 }}
            >
              {label}
            </Typography>
          </Box>

          <Typography
            variant="h4"
            sx={{ fontWeight: 500, lineHeight: 1, mb: 0.75 }}
          >
            {value}
          </Typography>

          {subtitle ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: "auto", lineHeight: 1.25 }}
            >
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
      <Typography variant="h6" sx={{ mb: 1 }}>
        Moduly
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(3, minmax(0, 1fr))",
            lg: "repeat(6, minmax(0, 1fr))",
          },
          gap: { xs: 1.25, sm: 2 },
          mb: 3,
        }}
      >
        <Box>
          <DashCard
            title="Zákazníci"
            icon={<PeopleAltIcon />}
            onClick={() => router.push("/customers")}
            color="primary"
          />
        </Box>

        <Box>
          <DashCard
            title="Kalendář"
            icon={<CalendarMonthIcon />}
            onClick={() => router.push("/calendar")}
            color="warning"
          />
        </Box>

        <Box>
          <DashCard
            title="AI asistent"
            icon={<SmartToyIcon />}
            onClick={() => router.push("/ai")}
            color="secondary"
          />
        </Box>

        <Box>
          <DashCard
            title="Mapa"
            icon={<MapIcon />}
            onClick={() => router.push("/map")}
            color="success"
          />
        </Box>

        <Box>
          <DashCard
            title="Nastavení"
            icon={<SettingsIcon />}
            onClick={() => router.push("/settings")}
            color="info"
          />
        </Box>

        <Box>
          <DashCard
            title="Historie"
            icon={<HistoryIcon />}
            onClick={() => router.push("/history")}
            color="info"
          />
        </Box>
      </Box>

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
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                sm: "repeat(3, minmax(0, 1fr))",
                lg: "repeat(5, minmax(0, 1fr))",
              },
              gap: { xs: 1.25, sm: 2 },
            }}
          >
            <Box>
              <StatCard
                label="Zákazníků celkem"
                value={stats.total}
                icon={<PeopleAltIcon />}
                subtitle="Klikni pro zobrazení všech"
                onClick={() => router.push("/customers")}
                color="primary"
              />
            </Box>

            <Box>
              <StatCard
                label="Servis po termínu"
                value={stats.overdue}
                icon={<ErrorIcon />}
                subtitle="> 24 měsíců"
                onClick={() => router.push("/customers?service=overdue")}
                color="error"
              />
            </Box>

            <Box>
              <StatCard
                label="Blížící se servis"
                value={stats.dueSoon}
                icon={<WarningAmberIcon />}
                subtitle="12–24 měsíců"
                onClick={() => router.push("/customers?service=dueSoon")}
                color="warning"
              />
            </Box>

            <Box>
              <StatCard
                label="Servis OK"
                value={stats.ok}
                icon={<CheckCircleIcon />}
                subtitle="< 12 měsíců"
                onClick={() => router.push("/customers?service=ok")}
                color="success"
              />
            </Box>

            <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>
              <StatCard
                label="Bez vyplněného servisu"
                value={stats.missing}
                icon={<HelpOutlineIcon />}
                subtitle="chybí / neplatné datum"
                onClick={() => router.push("/customers?service=missing")}
                color="info"
              />
            </Box>
          </Box>
        )}
      </Box>
    </Container>
  );
}

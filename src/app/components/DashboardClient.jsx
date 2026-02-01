"use client";

import { useRouter } from "next/navigation";
import {
  Container,
  Typography,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Box,
} from "@mui/material";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SettingsIcon from "@mui/icons-material/Settings";

function DashCard({ title, subtitle, icon, onClick }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardActionArea onClick={onClick} sx={{ height: "100%" }}>
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

export default function DashboardClient() {
  const router = useRouter();

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Dashboard
      </Typography>

      <Grid container spacing={2}>
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
    </Container>
  );
}

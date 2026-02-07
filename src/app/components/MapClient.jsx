"use client";

import dynamic from "next/dynamic";
import { Box, CircularProgress } from "@mui/material";

const MapLeafletClient = dynamic(() => import("./MapLeafletClient"), {
  ssr: false,
  loading: () => (
    <Box sx={{ mt: 4, display: "flex", alignItems: "center", gap: 1 }}>
      <CircularProgress size={18} />
      Načítám mapu…
    </Box>
  ),
});

export default function MapClient() {
  return <MapLeafletClient />;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Stack,
} from "@mui/material";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const DEFAULT_CENTER = [50.0286, 15.2027];

function fixLeafletIcons() {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

function customerLabel(c) {
  const fn = String(c?.firstName ?? "").trim();
  const ln = String(c?.lastName ?? "").trim();
  return `${fn} ${ln}`.trim() || String(c?.email ?? "").trim() || "(bez jména)";
}

function getCustomerId(c) {
  const a = c?._id?.toString?.();
  if (a) return a;
  return String(c?._id ?? "").trim();
}

export default function MapLeafletClient() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState("");

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/customers", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.message || "Nepodařilo se načíst zákazníky");

      setCustomers(Array.isArray(data?.customers) ? data.customers : []);
    } catch (e) {
      setError(e?.message || "Chyba při načítání zákazníků");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const markers = useMemo(() => {
    return customers
      .filter(
        (c) =>
          Number.isFinite(c?.location?.lat) &&
          Number.isFinite(c?.location?.lng),
      )
      .map((c) => ({
        id: getCustomerId(c),
        name: customerLabel(c),
        address: String(c?.address ?? "").trim(),
        pos: [c.location.lat, c.location.lng],
      }));
  }, [customers]);

  const center = useMemo(() => {
    if (markers.length === 1) return markers[0].pos;

    if (markers.length > 1) {
      const avgLat =
        markers.reduce((sum, m) => sum + m.pos[0], 0) / markers.length;
      const avgLng =
        markers.reduce((sum, m) => sum + m.pos[1], 0) / markers.length;
      return [avgLat, avgLng];
    }

    return DEFAULT_CENTER;
  }, [markers]);

  const zoom = useMemo(() => {
    if (markers.length === 1) return 13;
    if (markers.length > 1) return 10;
    return 11;
  }, [markers.length]);

  const customersNeedingGeocode = useMemo(() => {
    return customers.filter((c) => {
      const addr = String(c?.address ?? "").trim();
      const lat = c?.location?.lat;
      const lng = c?.location?.lng;
      return addr && !(Number.isFinite(lat) && Number.isFinite(lng));
    });
  }, [customers]);

  const geocodeMissing = async () => {
    setError("");
    setGeocodeMsg("");
    setGeocoding(true);

    try {
      const list = customersNeedingGeocode.slice(0, 20);
      let ok = 0;
      let fail = 0;

      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        const id = getCustomerId(c);
        const address = String(c?.address ?? "").trim();

        if (!id || !address) {
          fail++;
          continue;
        }

        setGeocodeMsg(`Geokóduju ${i + 1}/${list.length}: ${address}`);

        const r1 = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ address }),
        });

        const g = await r1.json().catch(() => ({}));
        if (!r1.ok) {
          fail++;
          await new Promise((r) => setTimeout(r, 1100));
          continue;
        }

        const r2 = await fetch(`/api/customers/${id}/location`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            lat: g.lat,
            lng: g.lng,
            formattedAddress: g.formattedAddress || "",
            placeId: "",
          }),
        });

        if (!r2.ok) fail++;
        else ok++;

        await new Promise((r) => setTimeout(r, 1100));
      }

      setGeocodeMsg(`Hotovo: OK ${ok}, fail ${fail}. Obnovuju…`);
      await loadCustomers();
      setGeocodeMsg(`Hotovo: OK ${ok}, fail ${fail}.`);
    } catch (e) {
      setError(e?.message || "Chyba při geokódování");
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <Container sx={{ mt: 4, maxWidth: 1200 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Typography variant="h5">Mapa zákazníků (Free verze)</Typography>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={loadCustomers}
            disabled={loading || geocoding}
          >
            Obnovit
          </Button>
          <Button
            variant="contained"
            onClick={geocodeMissing}
            disabled={
              loading || geocoding || customersNeedingGeocode.length === 0
            }
          >
            Geokódovat chybějící ({customersNeedingGeocode.length})
          </Button>
        </Stack>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Markery se zobrazí zákazníkům s uloženými souřadnicemi. Tlačítko
        geokóduje max 20 adres v dávce (safe throttling).
      </Typography>

      <Divider sx={{ my: 2 }} />

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          {geocodeMsg ? (
            <Alert severity={geocoding ? "info" : "success"} sx={{ mb: 2 }}>
              {geocodeMsg}
            </Alert>
          ) : null}

          <Paper sx={{ height: 650 }}>
            <MapContainer
              center={center}
              zoom={zoom}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {markers.map((m) => (
                <Marker key={m.id} position={m.pos}>
                  <Popup>
                    <strong>{m.name}</strong>
                    <br />
                    {m.address}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </Paper>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Zobrazeno markerů: {markers.length} / zákazníků celkem:{" "}
            {customers.length}
          </Typography>
        </>
      )}
    </Container>
  );
}

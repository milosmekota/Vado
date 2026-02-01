"use client";

import { Container, Paper, Typography } from "@mui/material";

export default function PlaceholderClient({ title, subtitle }) {
  return (
    <Container sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {subtitle}
        </Typography>
      </Paper>
    </Container>
  );
}

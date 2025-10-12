"use client";
import { useRef, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  TextField,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export default function CustomerCard({ customer, index, onUpdate }) {
  const [editMode, setEditMode] = useState(false);

  // Vytvoříme ref pro každý field
  const refs = useRef(
    Object.fromEntries(Object.keys(customer).map((key) => [key, null]))
  );

  const handleSave = () => {
    // Přečteme hodnoty z refů
    const updatedData = Object.fromEntries(
      Object.entries(refs.current).map(([key, ref]) => [key, ref.value])
    );
    onUpdate(index, updatedData);
    setEditMode(false);
  };

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>{customer.name}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {editMode ? (
          <>
            <List>
              {Object.entries(customer).map(([key, value]) => (
                <ListItem key={key}>
                  <TextField
                    fullWidth
                    label={key}
                    defaultValue={value}
                    inputRef={(el) => (refs.current[key] = el)}
                  />
                </ListItem>
              ))}
            </List>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button variant="contained" color="primary" onClick={handleSave}>
                Uložit
              </Button>
              <Button variant="outlined" onClick={() => setEditMode(false)}>
                Zrušit
              </Button>
            </Stack>
          </>
        ) : (
          <>
            <List>
              {Object.entries(customer).map(([key, value]) => (
                <ListItem key={key}>
                  <ListItemText
                    primary={key}
                    secondary={value}
                    sx={{ textTransform: "capitalize" }}
                  />
                </ListItem>
              ))}
            </List>
            <Button
              variant="outlined"
              sx={{ mt: 1 }}
              onClick={() => setEditMode(true)}
            >
              Editovat
            </Button>
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

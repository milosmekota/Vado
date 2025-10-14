"use client";
import { useState } from "react";
import { AppBar, Toolbar, Typography, Button, Container } from "@mui/material";
import CustomerCard from "./CustomerCard";

const initialCustomers = [
  {
    name: "Jan Novák",
    phone: "777 111 222",
    address: "Praha, Ulice 1",
    pump: "Vado 3000",
    install: "2022-05-15",
    lastService: "2023-10-01",
    comments: [],
  },
  {
    name: "Petr Svoboda",
    phone: "777 333 444",
    address: "Brno, Ulice 2",
    pump: "Vado 2500",
    install: "2021-03-10",
    lastService: "2024-01-20",
    comments: [],
  },
  {
    name: "Lucie Dvořáková",
    phone: "777 555 666",
    address: "Ostrava, Ulice 3",
    pump: "Vado 4000",
    install: "2020-07-22",
    lastService: "2023-06-18",
    comments: [],
  },
  {
    name: "Martin Procházka",
    phone: "777 777 888",
    address: "Plzeň, Ulice 4",
    pump: "Vado 3100",
    install: "2023-01-05",
    lastService: "2024-03-12",
    comments: [],
  },
  {
    name: "Kateřina Kučerová",
    phone: "777 999 000",
    address: "Liberec, Ulice 5",
    pump: "Vado 2800",
    install: "2019-11-30",
    lastService: "2022-09-17",
    comments: [],
  },
  {
    name: "Tomáš Král",
    phone: "606 123 456",
    address: "Hradec Králové, Ulice 6",
    pump: "Vado 2600",
    install: "2021-09-14",
    lastService: "2024-02-02",
    comments: [],
  },
  {
    name: "Eva Malá",
    phone: "606 234 567",
    address: "Olomouc, Ulice 7",
    pump: "Vado 2900",
    install: "2022-04-21",
    lastService: "2023-11-09",
    comments: [],
  },
  {
    name: "David Černý",
    phone: "606 345 678",
    address: "Zlín, Ulice 8",
    pump: "Vado 3300",
    install: "2020-06-01",
    lastService: "2023-08-15",
    comments: [],
  },
  {
    name: "Veronika Veselá",
    phone: "606 456 789",
    address: "České Budějovice, Ulice 9",
    pump: "Vado 2700",
    install: "2018-02-19",
    lastService: "2022-05-23",
    comments: [],
  },
  {
    name: "Jakub Horák",
    phone: "606 567 890",
    address: "Karlovy Vary, Ulice 10",
    pump: "Vado 3500",
    install: "2023-07-08",
    lastService: "2024-04-10",
    comments: [],
  },
];

export default function MainLayout({ user, onLogout }) {
  const [customers, setCustomers] = useState(initialCustomers);

  const handleUpdateCustomer = (index, updatedData) => {
    setCustomers((prev) => {
      const newArr = [...prev];
      newArr[index] = updatedData;
      return newArr;
    });
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Vado App
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {user.email}
          </Typography>
          <Button color="inherit" onClick={onLogout}>
            Odhlásit
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Seznam zákazníků
        </Typography>
        {customers.map((c, i) => (
          <CustomerCard
            key={i}
            customer={c}
            index={i}
            user={user}
            onUpdate={handleUpdateCustomer}
          />
        ))}
      </Container>
    </>
  );
}

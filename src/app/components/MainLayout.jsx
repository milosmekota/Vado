"use client";
import { AppBar, Toolbar, Typography, Button, Container } from "@mui/material";
import { useAuth } from "@/context/AuthContext";
import CustomerCard from "./CustomerCard";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function MainLayout() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch("/api/customers", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setCustomers(data.customers || []);
        } else {
          setCustomers([]);
        }
      } catch {
        setCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }
    };

    if (user) fetchCustomers();
  }, [user]);

  if (loading || !user || loadingCustomers) return <div>Načítám...</div>;

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
          <Button color="inherit" onClick={logout}>
            Odhlásit
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Seznam zákazníků
        </Typography>
        <Container sx={{ mt: 2, mb: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.push("/customers/new")}
          >
            Přidat zákazníka
          </Button>
        </Container>
        {customers.map((c, i) => (
          <CustomerCard
            key={c._id || i}
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

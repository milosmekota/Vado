"use client";
import { useState } from "react";
import LoginPage from "./components/LoginPage";
import MainLayout from "./components/MainLayout";

export default function Home() {
  const [user, setUser] = useState(null);

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return <MainLayout user={user} onLogout={() => setUser(null)} />;
}

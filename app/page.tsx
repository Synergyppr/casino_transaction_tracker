"use client";

import { useState } from "react";
import type { Cashier } from "./lib/types";
import { LoginScreen } from "./components/LoginScreen";
import { MainApp } from "./components/MainApp";

export default function Home() {
  const [user, setUser] = useState<Cashier | null>(null);

  if (!user) return <LoginScreen onLogin={setUser} />;
  return <MainApp user={user} onLogout={() => setUser(null)} />;
}

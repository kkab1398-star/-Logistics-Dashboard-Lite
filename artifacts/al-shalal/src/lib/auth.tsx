import React, { createContext, useContext, useState } from "react";

export type Role = "admin" | "driver";

type AuthContextType = {
  role: Role | null;
  driverId: number | null;
  driverName: string | null;
  loginAsAdmin: () => void;
  loginAsDriver: (id: number, name: string) => void;
  logout: () => void;
};

export const ADMIN_CODE = "1234";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function dispatchAuthChanged() {
  window.dispatchEvent(new CustomEvent("al-shalal-auth-changed"));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(() => {
    const r = localStorage.getItem("al-shalal-role");
    return r as Role | null;
  });
  const [driverId, setDriverId] = useState<number | null>(() => {
    const d = localStorage.getItem("al-shalal-driverId");
    return d ? Number(d) : null;
  });
  const [driverName, setDriverName] = useState<string | null>(() => {
    return localStorage.getItem("al-shalal-driverName");
  });

  const loginAsAdmin = () => {
    setRole("admin");
    setDriverId(null);
    setDriverName(null);
    localStorage.setItem("al-shalal-role", "admin");
    localStorage.removeItem("al-shalal-driverId");
    localStorage.removeItem("al-shalal-driverName");
    dispatchAuthChanged();
  };

  const loginAsDriver = (id: number, name: string) => {
    setRole("driver");
    setDriverId(id);
    setDriverName(name);
    localStorage.setItem("al-shalal-role", "driver");
    localStorage.setItem("al-shalal-driverId", String(id));
    localStorage.setItem("al-shalal-driverName", name);
    dispatchAuthChanged();
  };

  const logout = () => {
    setRole(null);
    setDriverId(null);
    setDriverName(null);
    localStorage.removeItem("al-shalal-role");
    localStorage.removeItem("al-shalal-driverId");
    localStorage.removeItem("al-shalal-driverName");
    dispatchAuthChanged();
  };

  return (
    <AuthContext.Provider value={{ role, driverId, driverName, loginAsAdmin, loginAsDriver, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

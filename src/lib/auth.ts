// Hardcoded admin auth (per user request). Persisted in sessionStorage.
import { useEffect, useState } from "react";

export const ADMIN_USERNAME = "admin";
export const ADMIN_PASSWORD = "pottershouse";
const KEY = "tph_auth_v1";

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(KEY) === "1";
}

export function login(username: string, password: string): boolean {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    sessionStorage.setItem(KEY, "1");
    window.dispatchEvent(new Event("tph-auth-change"));
    return true;
  }
  return false;
}

export function logout() {
  sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event("tph-auth-change"));
}

export function useAuth() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setAuthed(isLoggedIn());
    setReady(true);
    const h = () => setAuthed(isLoggedIn());
    window.addEventListener("tph-auth-change", h);
    return () => window.removeEventListener("tph-auth-change", h);
  }, []);
  return { authed, ready };
}

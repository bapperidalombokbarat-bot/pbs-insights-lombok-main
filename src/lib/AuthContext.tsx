import React, { createContext, useContext, useState, useEffect } from "react";
import { UserSession, UserRole, authenticateUser, getAvailableRoles } from "@/lib/db";

export interface AuthContextType {
  user: UserSession | null;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  quickLogin: (username: string) => Promise<boolean>;
  loginAsGuest: () => void;
  logout: () => void;
  availableRoles: UserSession[];
  // Permissions
  canEditMedis: boolean;      // BAPPERIDA & DIKES
  canEditBskm: boolean;       // BAPPERIDA & DIKBUD
  canEditBansos: boolean;     // BAPPERIDA & DINSOS
  canUnlockPrivacy: boolean;  // BAPPERIDA, DIKES, DIKBUD, DINSOS (INOVASI & GUEST are permanently locked)
  canUploadData: boolean;     // BAPPERIDA only
  isBapperida: boolean;
  isDikes: boolean;
  isDikbud: boolean;
  isDinsos: boolean;
  isInovasi: boolean;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "peduli_user_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [availableRoles, setAvailableRoles] = useState<UserSession[]>([]);

  useEffect(() => {
    // Restore session from localStorage if available
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Gagal memuat sesi user:", e);
    }

    // Load available roles list from database
    getAvailableRoles()
      .then(roles => {
        if (roles && roles.length) setAvailableRoles(roles);
      })
      .catch(err => console.error("Gagal memuat roles:", err));
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const session = await authenticateUser(username, password);
      if (session) {
        setUser(session);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        return { success: true };
      }
      return { success: false, message: "Username atau password tidak sesuai!" };
    } catch (err: any) {
      return { success: false, message: err?.message || "Terjadi kesalahan saat masuk" };
    }
  };

  const quickLogin = async (username: string) => {
    // Cek daftar role yang sudah dimuat
    const found = availableRoles.find(r => r.username.toLowerCase() === username.toLowerCase());
    if (found) {
      setUser(found);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
      return true;
    }
    // Fallback autentikasi dengan password default role
    const res = await authenticateUser(username, `${username}2026`);
    if (res) {
      setUser(res);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
      return true;
    }
    return false;
  };

  const loginAsGuest = () => {
    const guestSession: UserSession = {
      id: 0,
      username: "tamu",
      nama_lengkap: "Tamu Publik / Masyarakat",
      instansi: "Pemerintah Kab. Lombok Barat (Mode Publik)",
      role: "GUEST",
      avatar: "👁️",
      keterangan: "Akses Peninjauan Publik Read-Only (Hak Edit & NIK/NISN Terproteksi)",
    };
    setUser(guestSession);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(guestSession));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const role = user?.role;
  const isBapperida = role === "BAPPERIDA";
  const isDikes = role === "DIKES";
  const isDikbud = role === "DIKBUD";
  const isDinsos = role === "DINSOS";
  const isInovasi = role === "INOVASI";
  const isGuest = role === "GUEST" || !user;

  const canEditMedis = isBapperida || isDikes;
  const canEditBskm = isBapperida || isDikbud;
  const canEditBansos = isBapperida || isDinsos;
  const canUnlockPrivacy = !!user && user.role !== "GUEST" && !isInovasi;
  const canUploadData = isBapperida;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        login,
        quickLogin,
        loginAsGuest,
        logout,
        availableRoles,
        canEditMedis,
        canEditBskm,
        canEditBansos,
        canUnlockPrivacy,
        canUploadData,
        isBapperida,
        isDikes,
        isDikbud,
        isDinsos,
        isInovasi,
        isGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
}

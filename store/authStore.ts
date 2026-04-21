import { create } from 'zustand';
import { API_BASE_URL } from '../constants/api';

export interface User {
  user_id: number;
  username: string;
  full_name: string;
  emergency_contact?: string;
  disability_details?: string;
  role: 'caregiver' | 'admin';
  device_serial?: string;  // ✅ เพิ่ม
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,



login: async (username, password) => {
  set({ isLoading: true });
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) { set({ isLoading: false }); return false; }

    const user = await res.json();

    // ✅ ดึง device ของ user นี้
    const devRes = await fetch(`${API_BASE_URL}/auth/devices/${user.user_id}`);
    if (devRes.ok) {
      const devices = await devRes.json();
      if (devices.length > 0) {
        user.device_serial = devices[0].device_serial;
      }
    }

    set({ isAuthenticated: true, isLoading: false, user });
    return true;

  } catch (e) {
    set({ isLoading: false });
    return false;
  }
},

  logout: () => set({
    user: null,
    token: null,
    isAuthenticated: false,
  }),
}));
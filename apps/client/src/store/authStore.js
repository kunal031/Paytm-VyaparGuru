import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      merchant: null,
      setAuth: ({ token, merchant }) => set({ token, merchant }),
      logout: () => set({ token: null, merchant: null }),
    }),
    { name: 'vyaparguru-auth' }
  )
);

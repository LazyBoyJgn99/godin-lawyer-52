"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface User {
  id: string
  name: string
  phone: string
  avatar?: string
  isVerified: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true })
        try {
          // 模拟网络延迟
          await new Promise((resolve) => setTimeout(resolve, 800))

          // 虚假登录 - 任何用户名密码都能登录成功
          const user: User = {
            id: "demo-user-001",
            name: "Hi，金戈丁",
            phone: "18490234561",
            avatar: "/placeholder.svg?height=64&width=64",
            isVerified: true,
          }

          set({
            user,
            token: "demo-token-" + Date.now(),
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        set({ user: null, token: null })
      },

      updateUser: (userData: Partial<User>) => {
        const { user } = get()
        if (user) {
          set({ user: { ...user, ...userData } })
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    },
  ),
)

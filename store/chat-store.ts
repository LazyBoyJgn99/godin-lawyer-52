"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface Conversation {
  id: string
  title: string
  category?: string
  lastMessage?: string
  updatedAt: string
  createdAt: string
}

interface ChatState {
  conversations: Conversation[]
  currentConversationId: string | null
  loadConversations: () => Promise<void>
  createConversation: (title: string, category?: string) => string
  deleteConversation: (id: string) => void
  updateConversation: (id: string, updates: Partial<Conversation>) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,

      loadConversations: async () => {
        // 模拟加载对话列表
        await new Promise((resolve) => setTimeout(resolve, 300))

        const mockConversations: Conversation[] = [
          {
            id: "1",
            title: "企业违法裁员咨询",
            category: "劳动纠纷",
            lastMessage: "根据《劳动合同法》第四十七条规定...",
            updatedAt: "12:45",
            createdAt: "2025-05-21",
          },
          {
            id: "2",
            title: "分居2年离婚诉讼",
            category: "婚姻家庭",
            lastMessage: "分居满两年可以作为感情破裂的证据...",
            updatedAt: "05-21",
            createdAt: "2025-05-21",
          },
        ]

        set({ conversations: mockConversations })
      },

      createConversation: (title: string, category?: string) => {
        const newConversation: Conversation = {
          id: Date.now().toString(),
          title,
          category,
          updatedAt: "刚刚",
          createdAt: new Date().toISOString(),
        }

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: newConversation.id,
        }))

        return newConversation.id
      },

      deleteConversation: (id: string) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
        }))
      },

      updateConversation: (id: string, updates: Partial<Conversation>) => {
        set((state) => ({
          conversations: state.conversations.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }))
      },
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({
        conversations: state.conversations,
      }),
    },
  ),
)

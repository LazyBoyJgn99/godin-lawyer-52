"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { useChatStore } from "@/store/chat-store"
import { socketService } from "@/services/socket-service"

interface ChatContextType {
  isConnected: boolean
  connectionStatus: "connecting" | "connected" | "disconnected"
}

const ChatContext = createContext<ChatContextType | null>(null)

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error("useChatContext must be used within ChatProvider")
  }
  return context
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected")
  const { user } = useAuthStore()
  const { addMessage, setTyping } = useChatStore()

  useEffect(() => {
    if (user) {
      setConnectionStatus("connecting")

      // 初始化 WebSocket 连接
      socketService.connect(user.id)

      // 监听连接状态
      socketService.on("connect", () => {
        setIsConnected(true)
        setConnectionStatus("connected")
      })

      socketService.on("disconnect", () => {
        setIsConnected(false)
        setConnectionStatus("disconnected")
      })

      // 监听新消息
      socketService.on("message", (message) => {
        addMessage(message)
      })

      // 监听打字状态
      socketService.on("typing", (data) => {
        setTyping(data.userId, data.isTyping)
      })

      return () => {
        socketService.disconnect()
      }
    }
  }, [user, addMessage, setTyping])

  return <ChatContext.Provider value={{ isConnected, connectionStatus }}>{children}</ChatContext.Provider>
}

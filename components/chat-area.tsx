"use client"

import { useEffect, useRef } from "react"
import { MessageList } from "./message-list"
import { MessageInput } from "./message-input"
import { useChatStore } from "@/store/chat-store"
import { useChatContext } from "./chat-provider"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff } from "lucide-react"

export function ChatArea() {
  const { currentConversation } = useChatStore()
  const { isConnected, connectionStatus } = useChatContext()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentConversation?.messages])

  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">欢迎使用 AI 助手</h2>
          <p className="text-gray-500">选择一个对话或创建新对话开始聊天</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header with connection status */}
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h2 className="text-lg font-semibold">{currentConversation.title || "新对话"}</h2>
        <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center gap-1">
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3" />
              已连接
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              {connectionStatus === "connecting" ? "连接中..." : "已断开"}
            </>
          )}
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={currentConversation.messages} />
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput />
    </div>
  )
}

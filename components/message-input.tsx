"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useChatStore } from "@/store/chat-store"
import { useChatContext } from "./chat-provider"
import { Send, Paperclip, Mic, Square } from "lucide-react"
import { socketService } from "@/services/socket-service"

export function MessageInput() {
  const [message, setMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { sendMessage, currentConversationId } = useChatStore()
  const { isConnected } = useChatContext()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim() || !currentConversationId || !isConnected) return

    const messageText = message.trim()
    setMessage("")

    // 发送消息
    await sendMessage(messageText)

    // 通过 WebSocket 发送打字状态
    socketService.emit("typing", { isTyping: false })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)

    // 发送打字状态
    if (isConnected) {
      socketService.emit("typing", { isTyping: e.target.value.length > 0 })
    }
  }

  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  const handleFileUpload = () => {
    // TODO: 实现文件上传功能
    console.log("文件上传功能待实现")
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    // TODO: 实现语音录制功能
    console.log("语音录制功能待实现")
  }

  return (
    <div className="p-4 border-t bg-white">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex items-end gap-2">
          {/* 附件按钮 */}
          <Button type="button" variant="ghost" size="icon" onClick={handleFileUpload} className="flex-shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* 输入框 */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? "输入消息..." : "连接中，请稍候..."}
              disabled={!isConnected}
              className="min-h-[44px] max-h-32 resize-none pr-12"
              rows={1}
            />

            {/* 语音按钮 */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleRecording}
              className={`absolute right-1 top-1 h-8 w-8 ${isRecording ? "text-red-500" : ""}`}
            >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>

          {/* 发送按钮 */}
          <Button type="submit" disabled={!message.trim() || !isConnected} className="flex-shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {!isConnected && <p className="text-xs text-red-500 mt-2 text-center">网络连接已断开，请检查网络连接</p>}
      </form>
    </div>
  )
}

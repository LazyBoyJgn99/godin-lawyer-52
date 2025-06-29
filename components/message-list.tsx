"use client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Copy, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react"
import type { Message } from "@/types/chat"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">💬</div>
          <p>还没有消息，开始对话吧！</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-6 max-w-4xl mx-auto">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={message.role === "user" ? "/user-avatar.png" : "/ai-avatar.png"} />
              <AvatarFallback>{message.role === "user" ? "U" : "AI"}</AvatarFallback>
            </Avatar>

            <div className={`flex-1 max-w-3xl ${message.role === "user" ? "text-right" : ""}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-700">{message.role === "user" ? "你" : "AI 助手"}</span>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(message.timestamp), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </span>
              </div>

              <div
                className={`
                  inline-block p-3 rounded-lg max-w-full
                  ${message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"}
                `}
              >
                <div className="whitespace-pre-wrap break-words">{message.content}</div>

                {message.status === "sending" && <div className="text-xs opacity-70 mt-1">发送中...</div>}

                {message.status === "error" && <div className="text-xs text-red-300 mt-1">发送失败</div>}
              </div>

              {/* Message actions for AI messages */}
              {message.role === "assistant" && message.status === "sent" && (
                <div className="flex items-center gap-1 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(message.content)}
                    className="h-6 px-2 text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    复制
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    <ThumbsUp className="h-3 w-3 mr-1" />赞
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    <ThumbsDown className="h-3 w-3 mr-1" />踩
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    重新生成
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

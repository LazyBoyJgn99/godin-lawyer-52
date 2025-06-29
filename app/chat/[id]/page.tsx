"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { ChatInterface } from "@/components/chat/chat-interface"
import { TopBar } from "@/components/layout/top-bar"

export default function ChatDetailPage() {
  const params = useParams()
  const chatId = params.id as string
  const [title, setTitle] = useState(chatId === 'new' ? "新的对话" : "加载中...")

  return (
    <div className="h-screen bg-blue-50 flex flex-col">
      <TopBar 
        title={title} 
        showBack 
        showAdd 
      />
      <div className="flex-1 overflow-hidden">
        <ChatInterface chatId={chatId} onTitleChange={setTitle} />
      </div>
    </div>
  )
}

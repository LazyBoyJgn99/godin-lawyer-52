"use client"

import { ChatList } from "@/components/chat/chat-list"
import { BottomNavigation } from "@/components/layout/bottom-navigation"
import { TopBar } from "@/components/layout/top-bar"

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <TopBar title="对话" showAdd />
      <div className="flex-1 overflow-hidden">
        <ChatList />
      </div>
      <BottomNavigation />
    </div>
  )
}

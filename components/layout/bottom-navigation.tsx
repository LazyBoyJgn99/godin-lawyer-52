"use client"

import { usePathname, useRouter } from "next/navigation"
import { MessageCircle, Briefcase, FileText, User } from "lucide-react"

const navItems = [
  { path: "/chat", label: "对话", icon: MessageCircle },
  { path: "/cases", label: "案件", icon: Briefcase },
  { path: "/orders", label: "订单", icon: FileText },
  { path: "/profile", label: "我的", icon: User },
]

export function BottomNavigation() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.path)
          const Icon = item.icon

          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                isActive ? "text-blue-500" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

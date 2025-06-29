"use client"

import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuthStore } from "@/store/auth-store"
import { Shield, Phone, HelpCircle, Info, Lock, LogOut, ChevronRight } from "lucide-react"

const menuItems = [
  {
    icon: Shield,
    label: "实名认证",
    path: "/profile/verification",
    badge: null,
  },
  {
    icon: Phone,
    label: "联系我们",
    path: "/profile/contact",
    badge: null,
  },
  {
    icon: HelpCircle,
    label: "帮助与反馈",
    path: "/profile/help",
    badge: null,
  },
  {
    icon: Info,
    label: "关于Godin律助",
    path: "/profile/about",
    badge: null,
  },
  {
    icon: Lock,
    label: "用户隐私政策",
    path: "/profile/privacy",
    badge: null,
  },
]

export function ProfileContent() {
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const handleMenuClick = (path: string) => {
    router.push(path)
  }

  return (
    <div className="min-h-screen">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 px-4 pt-12 pb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.avatar || "/placeholder.svg"} />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">{user?.name?.[0] || "金"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900">{user?.name || "Hi，金戈丁"}</h2>
                <Badge className="bg-green-100 text-green-700 border-green-200">已实名认证</Badge>
              </div>
              <p className="text-gray-500">{user?.phone || "18490234561"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => handleMenuClick(item.path)}
              className="w-full bg-white rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100"
            >
              <div className="flex items-center space-x-3">
                <Icon className="h-5 w-5 text-gray-600" />
                <span className="text-gray-900 font-medium">{item.label}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          )
        })}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100 mt-4"
        >
          <div className="flex items-center space-x-3">
            <LogOut className="h-5 w-5 text-red-500" />
            <span className="text-red-500 font-medium">退出登录</span>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>
      </div>
    </div>
  )
}

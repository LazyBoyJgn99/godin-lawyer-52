"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"

export default function Home() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 模拟初始化检查
    const timer = setTimeout(() => {
      if (user) {
        router.push("/chat")
      } else {
        router.push("/login")
      }
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [user, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
        <div className="text-white text-center">
          <div className="text-4xl mb-4">⚖️</div>
          <h1 className="text-2xl font-bold mb-2">LegalAI诉讼通</h1>
          <p className="text-blue-100">智能法律助手</p>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthStore } from "@/store/auth-store"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuthStore()
  const router = useRouter()

  const handleDemoLogin = async () => {
    setIsLoading(true)
    try {
      // 使用虚假登录
      await login("demo", "demo")
      router.push("/chat")
    } catch (error) {
      console.error("登录失败:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-4">⚖️</div>
          <CardTitle className="text-2xl">Godin律师助理</CardTitle>
          <CardDescription>智能法律助手演示版</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleDemoLogin} className="w-full bg-blue-500 hover:bg-blue-600 py-3" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            演示登录
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-500">点击按钮即可体验完整功能</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

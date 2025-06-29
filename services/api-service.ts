"use client"

import axios from "axios"
import { useAuthStore } from "@/store/auth-store"

// 创建 axios 实例
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
  timeout: 10000,
})

// 请求拦截器 - 添加认证 token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期，清除认证状态
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  },
)

export const apiService = {
  // 认证相关
  login: async (email: string, password: string) => {
    // 模拟登录 API
    await new Promise((resolve) => setTimeout(resolve, 1000))

    if (email === "demo@example.com" && password === "demo123") {
      return {
        user: {
          id: "1",
          name: "演示用户",
          email: "demo@example.com",
          avatar: "/user-avatar.png",
        },
        token: "demo-token-123",
      }
    }

    throw new Error("邮箱或密码错误")
  },

  // 对话相关
  getConversations: async () => {
    // 模拟获取对话列表
    await new Promise((resolve) => setTimeout(resolve, 500))
    return []
  },

  sendMessage: async (conversationId: string, content: string) => {
    // 模拟发送消息并获取 AI 回复
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 简单的模拟回复
    const responses = [
      "我理解您的问题，让我来帮助您解答。",
      "这是一个很好的问题！根据我的理解...",
      "感谢您的提问。基于您提供的信息...",
      "我很乐意为您提供帮助。关于这个问题...",
    ]

    const randomResponse = responses[Math.floor(Math.random() * responses.length)]

    return {
      content: `${randomResponse}\n\n您刚才说："${content}"，我正在思考如何更好地回答您的问题。这是一个演示回复，实际使用时会连接到真实的 AI 服务。`,
    }
  },

  // 文件上传
  uploadFile: async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    const response = await api.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })

    return response.data
  },
}

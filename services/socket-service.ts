"use client"

import { io, type Socket } from "socket.io-client"

class SocketService {
  private socket: Socket | null = null
  private url: string

  constructor() {
    this.url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"
  }

  connect(userId: string) {
    if (this.socket?.connected) {
      return
    }

    this.socket = io(this.url, {
      auth: {
        userId,
      },
      transports: ["websocket", "polling"],
    })

    this.socket.on("connect", () => {
      console.log("WebSocket 连接成功")
    })

    this.socket.on("disconnect", () => {
      console.log("WebSocket 连接断开")
    })

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket 连接错误:", error)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback)
    }
  }

  get connected() {
    return this.socket?.connected || false
  }
}

export const socketService = new SocketService()

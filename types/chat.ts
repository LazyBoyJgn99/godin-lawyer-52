export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  status?: "sending" | "sent" | "error"
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  lastMessage?: Message
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

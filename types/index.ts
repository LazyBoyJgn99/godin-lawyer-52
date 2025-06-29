export interface User {
  id: string
  name: string
  phone: string
  avatar?: string
  isVerified: boolean
}

export interface Case {
  id: string
  title: string
  categories: string[]
  createdAt: string
  progress: number
  materialCount: number
  totalMaterials: number
  status: "active" | "completed" | "pending"
}

export interface Order {
  id: string
  title: string
  categories: string[]
  amount: number
  paymentDate: string
  status: "paid" | "pending" | "cancelled"
}

export interface Conversation {
  id: string
  title: string
  category?: string
  lastMessage?: string
  updatedAt: string
  createdAt: string
}

export interface Message {
  id: string
  type: "user" | "ai" | "system"
  content: string
  timestamp: string
  attachments?: Array<{
    name: string
    type: string
    size: string
    url?: string
  }>
  actions?: Array<{
    label: string
    type: "primary" | "secondary"
    action: () => void
  }>
}

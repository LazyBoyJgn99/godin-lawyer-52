"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface Order {
  id: string
  title: string
  categories: string[]
  amount: number
  paymentDate: string
  status: "paid" | "pending" | "cancelled"
}

export function OrderList() {
  const router = useRouter()
  const [orders] = useState<Order[]>([
    {
      id: "1",
      title: "企业违法裁员，拒绝给予赔偿金我应该怎...",
      categories: ["合同纠纷", "劳动仲裁民事纠纷"],
      amount: 100000,
      paymentDate: "2025-05-21",
      status: "paid",
    },
    {
      id: "2",
      title: "分居2年怎么起诉离婚",
      categories: ["遗产纠纷", "婚姻家庭与继承纠纷"],
      amount: 100000,
      paymentDate: "2025-05-21",
      status: "paid",
    },
  ])

  const handleViewMaterials = (orderId: string) => {
    router.push(`/cases/${orderId}`)
  }

  const handleEnterChat = (orderId: string) => {
    router.push(`/chat/${orderId}`)
  }

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {orders.map((order) => (
        <Card key={order.id} className="border border-gray-200">
          <CardContent className="p-4">
            <h3 className="text-base font-medium text-gray-900 mb-3">{order.title}</h3>

            <div className="flex flex-wrap gap-2 mb-4">
              {order.categories.map((category, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {category}
                </Badge>
              ))}
            </div>

            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-gray-500">支付金额</p>
                <p className="text-lg font-bold text-gray-900">{order.amount.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">支付时间</p>
                <p className="text-lg font-bold text-gray-900">{order.paymentDate}</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1 text-blue-500 border-blue-200 bg-transparent"
                onClick={() => handleViewMaterials(order.id)}
              >
                查看资料
              </Button>
              <Button className="flex-1 bg-blue-500 hover:bg-blue-600" onClick={() => handleEnterChat(order.id)}>
                进入对话
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

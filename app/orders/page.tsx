"use client"

import { OrderList } from "@/components/orders/order-list"
import { BottomNavigation } from "@/components/layout/bottom-navigation"
import { TopBar } from "@/components/layout/top-bar"

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <TopBar title="我的订单" />
      <div className="flex-1 overflow-hidden">
        <OrderList />
      </div>
      <BottomNavigation />
    </div>
  )
}

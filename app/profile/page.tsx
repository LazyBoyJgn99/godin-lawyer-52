"use client"

import { ProfileContent } from "@/components/profile/profile-content"
import { BottomNavigation } from "@/components/layout/bottom-navigation"
import { TopBar } from "@/components/layout/top-bar"

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <TopBar title="个人中心" />
      <div className="flex-1 overflow-hidden">
        <ProfileContent />
      </div>
      <BottomNavigation />
    </div>
  )
}

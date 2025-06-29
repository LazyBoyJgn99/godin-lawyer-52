"use client"

import { CaseList } from "@/components/cases/case-list"
import { BottomNavigation } from "@/components/layout/bottom-navigation"
import { TopBar } from "@/components/layout/top-bar"

export default function CasesPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <TopBar title="案件" />
      <div className="flex-1 overflow-hidden">
        <CaseList />
      </div>
      <BottomNavigation />
    </div>
  )
}

"use client"

import { useParams } from "next/navigation"
import { CaseDetail } from "@/components/cases/case-detail"
import { TopBar } from "@/components/layout/top-bar"

export default function CaseDetailPage() {
  const params = useParams()
  const caseId = params.id as string

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <TopBar title="案件详情" showBack />
      <div className="flex-1 overflow-auto">
        <CaseDetail caseId={caseId} />
      </div>
    </div>
  )
}

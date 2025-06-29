"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus } from "lucide-react"

interface TopBarProps {
  title: string
  showBack?: boolean
  showAdd?: boolean
  onAdd?: () => void
}

export function TopBar({ title, showBack, showAdd, onAdd }: TopBarProps) {
  const router = useRouter()

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center">
        {showBack && (
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      {showAdd && (
        <Button variant="ghost" size="icon" onClick={onAdd}>
          <Plus className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}

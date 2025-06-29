"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, CheckCircle } from "lucide-react"

interface WarningBubbleProps {
  title: string
  content: string
  onAcknowledge: () => void
  onInteraction?: (action: 'acknowledge') => void
}

export function WarningBubble({ 
  title, 
  content, 
  onAcknowledge,
  onInteraction 
}: WarningBubbleProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAcknowledge = async () => {
    setIsProcessing(true)
    onInteraction?.('acknowledge')
    onAcknowledge()
    setIsProcessing(false)
  }

  return (
    <Card className="max-w-md mx-auto bg-gradient-to-br from-red-50 to-white border border-red-200 shadow-md rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        {/* Header with icon */}
        <div className="bg-red-500 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-base">{title}</h3>
              <p className="text-red-100 text-sm opacity-90">法律风险提醒</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="bg-red-50 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm leading-relaxed font-medium">
              ⚠️ {content}
            </p>
          </div>
          
          {/* Acknowledge button */}
          <div className="flex justify-center">
            <Button
              onClick={handleAcknowledge}
              disabled={isProcessing}
              className="rounded-full bg-red-500 hover:bg-red-600 text-white px-6 transition-all duration-200"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              我已了解
            </Button>
          </div>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="border-t border-red-100 p-3">
            <div className="flex items-center justify-center gap-2 text-red-600 text-sm">
              <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
              处理中...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
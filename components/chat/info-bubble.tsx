"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Info, CheckCircle, BookOpen } from "lucide-react"

interface InfoBubbleProps {
  title: string
  content: string
  onAcknowledge: () => void
  onInteraction?: (action: 'acknowledge') => void
}

export function InfoBubble({ 
  title, 
  content, 
  onAcknowledge,
  onInteraction 
}: InfoBubbleProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAcknowledge = async () => {
    setIsProcessing(true)
    onInteraction?.('acknowledge')
    onAcknowledge()
    setIsProcessing(false)
  }

  return (
    <Card className="max-w-md mx-auto bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 shadow-md rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        {/* Header with icon */}
        <div className="bg-indigo-500 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-base">{title}</h3>
              <p className="text-indigo-100 text-sm opacity-90">法律建议</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="bg-indigo-50 rounded-lg p-3 mb-4 border-l-4 border-indigo-400">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
              <p className="text-indigo-800 text-sm leading-relaxed">
                {content}
              </p>
            </div>
          </div>
          
          {/* Acknowledge button */}
          <div className="flex justify-center">
            <Button
              onClick={handleAcknowledge}
              disabled={isProcessing}
              className="rounded-full bg-indigo-500 hover:bg-indigo-600 text-white px-6 transition-all duration-200"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              已收到建议
            </Button>
          </div>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="border-t border-indigo-100 p-3">
            <div className="flex items-center justify-center gap-2 text-indigo-600 text-sm">
              <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></div>
              处理中...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
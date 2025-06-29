"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, CheckCircle, X } from "lucide-react"

interface ConfirmBubbleProps {
  title: string
  content: string
  onConfirm: () => void
  onCancel: () => void
  onInteraction?: (action: 'confirm' | 'cancel') => void
}

export function ConfirmBubble({ 
  title, 
  content, 
  onConfirm, 
  onCancel,
  onInteraction 
}: ConfirmBubbleProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleConfirm = async () => {
    setIsProcessing(true)
    onInteraction?.('confirm')
    onConfirm()
    setIsProcessing(false)
  }

  const handleCancel = () => {
    onInteraction?.('cancel')
    onCancel()
  }

  return (
    <Card className="max-w-md mx-auto bg-gradient-to-br from-orange-50 to-white border border-orange-200 shadow-md rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        {/* Header with icon */}
        <div className="bg-orange-500 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-base">{title}</h3>
              <p className="text-orange-100 text-sm opacity-90">操作确认</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 text-sm leading-relaxed mb-4">
            {content}
          </p>
          
          {/* Interactive buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
              className="flex-1 rounded-full border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
            >
              <X className="w-4 h-4 mr-2" />
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1 rounded-full bg-orange-500 hover:bg-orange-600 text-white transition-all duration-200"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              确认继续
            </Button>
          </div>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="border-t border-orange-100 p-3">
            <div className="flex items-center justify-center gap-2 text-orange-600 text-sm">
              <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin"></div>
              处理中...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
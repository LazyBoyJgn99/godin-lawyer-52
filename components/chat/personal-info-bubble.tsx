"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { User, CheckCircle, XCircle } from "lucide-react"

interface PersonalInfoBubbleProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  onInteraction?: (action: 'confirm' | 'cancel') => void
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  responseMessage?: string
}

export function PersonalInfoBubble({ 
  title, 
  message, 
  onConfirm, 
  onCancel,
  onInteraction,
  status,
  responseMessage
}: PersonalInfoBubbleProps) {
  // 如果没有传入状态或状态为undefined/null，默认为pending状态
  const currentStatus = status || 'pending'
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
    <Card className="max-w-md mx-auto bg-gradient-to-br from-blue-50 to-white border border-blue-200 shadow-md rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        {/* Header with icon */}
        <div className="bg-blue-500 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-base">{title}</h3>
              <p className="text-blue-100 text-sm opacity-90">个人信息获取确认</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 text-sm leading-relaxed mb-4">
            {message}
          </p>
          
          {/* Show response message if action completed */}
          {(currentStatus === 'confirmed' || currentStatus === 'cancelled') && responseMessage && (
            <div className={`rounded-lg p-3 mb-4 ${
              currentStatus === 'confirmed' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {currentStatus === 'confirmed' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <p className={`text-sm ${
                  currentStatus === 'confirmed' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {responseMessage}
                </p>
              </div>
            </div>
          )}
          
          {/* Interactive buttons - show if status is pending or no status provided */}
          {(
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isProcessing}
                className="flex-1 rounded-full border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
              >
                <XCircle className="w-4 h-4 mr-2" />
                不同意
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="flex-1 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                同意
              </Button>
            </div>
          )}
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="border-t border-blue-100 p-3">
            <div className="flex items-center justify-center gap-2 text-blue-600 text-sm">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
              处理中...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UserCheck, Search, X, MapPin } from "lucide-react"

interface FindLawyerBubbleProps {
  title: string
  content: string
  onConfirm: () => void
  onCancel: () => void
  onInteraction?: (action: 'confirm' | 'cancel') => void
}

export function FindLawyerBubble({ 
  title, 
  content, 
  onConfirm, 
  onCancel,
  onInteraction 
}: FindLawyerBubbleProps) {
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
    <Card className="max-w-md mx-auto bg-gradient-to-br from-teal-50 to-white border border-teal-200 shadow-md rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        {/* Header with icon */}
        <div className="bg-teal-600 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-base">{title}</h3>
              <p className="text-teal-100 text-sm opacity-90">律师匹配服务</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 text-sm leading-relaxed mb-4">
            {content}
          </p>
          
          {/* Service features */}
          <div className="bg-teal-50 rounded-lg p-3 mb-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-teal-700 text-xs">
                <MapPin className="w-3 h-3" />
                <span>根据地区和专业领域智能匹配</span>
              </div>
              <div className="flex items-center gap-2 text-teal-700 text-xs">
                <UserCheck className="w-3 h-3" />
                <span>专业资质认证，经验丰富</span>
              </div>
              <div className="flex items-center gap-2 text-teal-700 text-xs">
                <Search className="w-3 h-3" />
                <span>免费咨询，透明收费</span>
              </div>
            </div>
          </div>
          
          {/* Interactive buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
              className="flex-1 rounded-full border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
            >
              <X className="w-4 h-4 mr-2" />
              暂不需要
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1 rounded-full bg-teal-600 hover:bg-teal-700 text-white transition-all duration-200"
            >
              <Search className="w-4 h-4 mr-2" />
              开始匹配
            </Button>
          </div>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="border-t border-teal-100 p-3">
            <div className="flex items-center justify-center gap-2 text-teal-600 text-sm">
              <div className="w-4 h-4 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin"></div>
              匹配中...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
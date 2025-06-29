"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Scale, FileText, X } from "lucide-react"

interface LawsuitBubbleProps {
  title: string
  content: string
  onConfirm: () => void
  onCancel: () => void
  onInteraction?: (action: 'confirm' | 'cancel') => void
  isGenerating?: boolean
}

export function LawsuitBubble({ 
  title, 
  content, 
  onConfirm, 
  onCancel,
  onInteraction,
  isGenerating = false
}: LawsuitBubbleProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleConfirm = async () => {
    if (isGenerating) return // 如果正在生成，则不允许重复点击
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
    <Card className="max-w-md mx-auto bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 shadow-md rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        {/* Header with icon */}
        <div className="bg-emerald-600 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-base">{title}</h3>
              <p className="text-emerald-100 text-sm opacity-90">诉讼文书生成</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 text-sm leading-relaxed mb-4">
            {content}
          </p>
          
          {/* Legal reminder */}
          <div className="bg-emerald-50 rounded-lg p-3 mb-4 border-l-4 border-emerald-400">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <p className="text-emerald-800 text-xs leading-relaxed">
                系统将根据您提供的材料生成诉讼文书，请确保信息准确完整
              </p>
            </div>
          </div>
          
          {/* Interactive buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing || isGenerating}
              className="flex-1 rounded-full border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
            >
              <X className="w-4 h-4 mr-2" />
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessing || isGenerating}
              className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  生成中...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  生成文书
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Processing indicator */}
        {(isProcessing || isGenerating) && (
          <div className="border-t border-emerald-100 p-3">
            <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm">
              <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin"></div>
              {isGenerating ? '正在生成文书...' : '生成中...'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
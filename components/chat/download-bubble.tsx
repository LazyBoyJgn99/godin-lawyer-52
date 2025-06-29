"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Download, FileText, Share2, X } from "lucide-react"

interface DownloadBubbleProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  onInteraction?: (action: 'confirm' | 'cancel') => void
}

export function DownloadBubble({ 
  title, 
  message, 
  onConfirm, 
  onCancel,
  onInteraction 
}: DownloadBubbleProps) {
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
        {/* Header with file icon */}
        <div className="bg-blue-500 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-white">
              <h3 className="font-medium text-base">{title}</h3>
              <p className="text-blue-100 text-sm opacity-90">1.93 MB</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 text-sm leading-relaxed mb-4">
            {message}
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
              className="flex-1 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200"
            >
              <Download className="w-4 h-4 mr-2" />
              下载文件
            </Button>
          </div>
          
          {/* Secondary action */}
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 transition-all duration-200"
            >
              <Share2 className="w-4 h-4 mr-2" />
              转发文件
            </Button>
          </div>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="border-t border-blue-100 p-3">
            <div className="flex items-center justify-center gap-2 text-blue-600 text-sm">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
              下载中...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
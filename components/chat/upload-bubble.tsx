"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, File, X, Download, CheckCircle } from "lucide-react"

interface UploadBubbleProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  onInteraction?: (action: 'confirm' | 'cancel') => void
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'uploaded' | 'downloading' | 'uploading' | 'downloaded'
  responseMessage?: string
  fileUrl?: string
  fileName?: string
}

export function UploadBubble({ 
  title, 
  message, 
  onConfirm, 
  onCancel,
  onInteraction,
  status = 'pending',
  responseMessage,
  fileUrl,
  fileName
}: UploadBubbleProps) {
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

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = fileName || 'downloaded-file'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <Card className="max-w-md mx-auto bg-gradient-to-br from-green-50 to-white border border-green-200 shadow-md rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        {/* Header with icon */}
        <div className="bg-green-500 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-base">{title}</h3>
              <p className="text-green-100 text-sm opacity-90">文件上传请求</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 text-sm leading-relaxed mb-4">
            {message}
          </p>
          
          {/* Show response message for various statuses */}
          {(status === 'confirmed' || status === 'cancelled' || status === 'uploaded' || status === 'uploading') && responseMessage && (
            <div className={`rounded-lg p-3 mb-4 ${
              status === 'uploaded' || status === 'confirmed'
                ? 'bg-green-50 border border-green-200' 
                : status === 'uploading'
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {status === 'uploaded' || status === 'confirmed' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : status === 'uploading' ? (
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                ) : (
                  <X className="w-4 h-4 text-red-600" />
                )}
                <p className={`text-sm ${
                  status === 'uploaded' || status === 'confirmed' ? 'text-green-800' 
                  : status === 'uploading' ? 'text-blue-800'
                  : 'text-red-800'
                }`}>
                  {responseMessage}
                </p>
              </div>
            </div>
          )}
          
          {/* File upload info - only show if status is pending */}
          {status === 'pending' && (
            <div className="bg-green-50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-green-700 text-xs">
                <File className="w-4 h-4" />
                支持格式：PDF、DOC、DOCX、JPG、PNG
              </div>
            </div>
          )}
          
          {/* Show download button if file has been uploaded */}
          {status === 'uploaded' && fileUrl && (
            <div className="flex gap-3">
              <Button
                onClick={handleDownload}
                className="flex-1 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200"
              >
                <Download className="w-4 h-4 mr-2" />
                下载文件
              </Button>
            </div>
          )}
          
          {/* Interactive buttons - only show if status is pending */}
          {status === 'pending' && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isProcessing}
                className="flex-1 rounded-full border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
              >
                <X className="w-4 h-4 mr-2" />
                拒绝
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="flex-1 rounded-full bg-green-500 hover:bg-green-600 text-white transition-all duration-200"
              >
                <Upload className="w-4 h-4 mr-2" />
                上传
              </Button>
            </div>
          )}
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="border-t border-green-100 p-3">
            <div className="flex items-center justify-center gap-2 text-green-600 text-sm">
              <div className="w-4 h-4 border-2 border-green-300 border-t-green-600 rounded-full animate-spin"></div>
              正在上传...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
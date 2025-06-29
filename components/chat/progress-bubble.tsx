"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Clock, CheckCircle, FileText, Scale, Users } from "lucide-react"

interface ProgressBubbleProps {
  title: string
  content: string
  progress: string
  material_progress: string
  onViewDetails: () => void
  onFileLawsuit?: () => void
  onFindLawyer?: () => void
  onInteraction?: (action: 'view_details' | 'file_lawsuit' | 'find_lawyer') => void
}

export function ProgressBubble({ 
  title, 
  content, 
  progress,
  material_progress,
  onViewDetails,
  onFileLawsuit,
  onFindLawyer,
  onInteraction 
}: ProgressBubbleProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  
  // 解析进度百分比
  const progressValue = parseInt(progress.replace('%', ''))

  const handleViewDetails = async () => {
    setIsProcessing(true)
    onInteraction?.('view_details')
    onViewDetails()
    setIsProcessing(false)
  }

  const handleFileLawsuit = async () => {
    setIsProcessing(true)
    onInteraction?.('file_lawsuit')
    onFileLawsuit?.()
    setIsProcessing(false)
  }

  const handleFindLawyer = async () => {
    setIsProcessing(true)
    onInteraction?.('find_lawyer')
    onFindLawyer?.()
    setIsProcessing(false)
  }

  return (
    <Card className="max-w-md mx-auto bg-gradient-to-br from-purple-50 to-white border border-purple-200 shadow-md rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        {/* Header with icon */}
        <div className="bg-purple-500 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-base">{title}</h3>
              <p className="text-purple-100 text-sm opacity-90">案件进度更新</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 text-sm leading-relaxed mb-4">
            {content}
          </p>
          
          {/* Progress indicator */}
          <div className="space-y-3 mb-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">整体进度</span>
                <span className="text-sm text-purple-600 font-semibold">{progress}</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="w-4 h-4" />
              <span>材料进度: {material_progress}</span>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="space-y-3">
            {/* 查看详细进度按钮 */}
            {/* <div className="flex justify-center">
              <Button
                onClick={handleViewDetails}
                disabled={isProcessing}
                variant="outline"
                className="rounded-full border-purple-300 text-purple-700 hover:bg-purple-50 px-6 transition-all duration-200"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                查看详细进度
              </Button>
            </div> */}
            
            {/* 发起诉讼和寻找律师按钮 */}
            <div className="flex gap-3">
              <Button
                onClick={handleFileLawsuit}
                disabled={isProcessing}
                className="flex-1 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200"
              >
                <Scale className="w-4 h-4 mr-2" />
                发起诉讼
              </Button>
              <Button
                onClick={handleFindLawyer}
                disabled={isProcessing}
                className="flex-1 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200"
              >
                <Users className="w-4 h-4 mr-2" />
                律师协助
              </Button>
            </div>
          </div>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="border-t border-purple-100 p-3">
            <div className="flex items-center justify-center gap-2 text-purple-600 text-sm">
              <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
              处理中...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
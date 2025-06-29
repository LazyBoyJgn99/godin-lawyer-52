"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, Stamp, FileText, X } from "lucide-react"
import { StampAnimation, type StampAnimationRef } from "./stamp-animation"
import { formatDocumentForDownload } from "@/utils/document-parser"

interface LegalDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: string
  fileName?: string
  onDownload?: () => void
  onStamp?: () => void
}

export function LegalDocumentDialog({
  open,
  onOpenChange,
  content,
  fileName = "法律文书.docx",
  onDownload,
  onStamp
}: LegalDocumentDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isStamping, setIsStamping] = useState(false)
  const [showStampAnimation, setShowStampAnimation] = useState(false)
  const stampAnimationRef = useRef<StampAnimationRef>(null)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      // 格式化文档内容用于下载
      const formattedContent = formatDocumentForDownload(content)
      
      // 创建Blob并下载
      const blob = new Blob([formattedContent], { type: 'application/msword' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      onDownload?.()
    } catch (error) {
      console.error('下载文件失败:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleStamp = async () => {
    setIsStamping(true)
    setShowStampAnimation(true)
    
    // 启动盖章动画
    setTimeout(() => {
      stampAnimationRef.current?.startAnimation()
    }, 100)
  }

  const handleStampComplete = () => {
    setTimeout(() => {
      setIsStamping(false)
      onStamp?.()
      // 完成盖章后保持两个弹窗都打开，让用户可以继续查看动画结果和文书内容
    }, 1000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-medium">法律文书</DialogTitle>
              <p className="text-sm text-gray-500">{fileName}</p>
            </div>
          </div>
        </DialogHeader>
        
        {/* 文书内容 */}
        <div className="flex-1 min-h-0 border rounded-lg bg-white">
          <ScrollArea className="h-full p-6">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {content}
              </div>
            </div>
          </ScrollArea>
        </div>
        
        {/* 底部按钮 */}
        <div className="flex-shrink-0 flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin mr-2" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            下载文件
          </Button>
          <Button
            onClick={handleStamp}
            disabled={isStamping}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isStamping ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
            ) : (
              <Stamp className="w-4 h-4 mr-2" />
            )}
            搞定盖章
          </Button>
        </div>
      </DialogContent>

      {/* 盖章动画弹窗 */}
      <Dialog open={showStampAnimation} onOpenChange={setShowStampAnimation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-medium">
              {isStamping ? "正在为文书盖章" : "盖章完成"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            <StampAnimation
              ref={stampAnimationRef}
              onComplete={handleStampComplete}
              soundEnabled={true}
            />
          </div>
          
          <div className="text-center text-sm text-gray-500">
            {isStamping ? "请稍候，正在完成盖章流程..." : "盖章已完成，您可以关闭此窗口"}
          </div>
          
          {!isStamping && (
            <div className="flex justify-center gap-3 pt-4">
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                variant="outline"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                {isDownloading ? (
                  <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                下载文件
              </Button>
              <Button
                onClick={() => setShowStampAnimation(false)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                关闭页面
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
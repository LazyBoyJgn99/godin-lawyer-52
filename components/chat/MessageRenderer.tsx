"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, ThumbsUp, ThumbsDown, RotateCcw, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { MarkdownTypewriter } from "./markdown-typewriter"
import { ActionRenderer, renderHistoryAction } from "./ActionRenderer"
import type { ActionData } from "@/api/ai/ai-api"

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  actionData?: ActionData
  serverMessageId?: string
  actionStatus?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'uploaded' | 'downloading' | 'uploading' | 'downloaded'
  actionResponse?: string
  actionMetadata?: {
    fileUrl?: string
    fileName?: string
    fileSize?: number
    [key: string]: any
  }
}

interface ActionHandlers {
  onPersonalInfoConfirm: (actionData: ActionData, messageId: string) => void
  onPersonalInfoCancel: (actionData: ActionData, messageId: string) => void
  onUploadConfirm: (actionData: ActionData, messageId: string) => void
  onUploadCancel: (actionData: ActionData, messageId: string) => void
  onDownloadConfirm: (actionData: ActionData, messageId: string) => void
  onDownloadCancel: (actionData: ActionData, messageId: string) => void
  onConfirmAction: (actionData: ActionData, messageId: string) => void
  onCancelAction: (actionData: ActionData, messageId: string) => void
  onWarningAcknowledge: (actionData: ActionData, messageId: string) => void
  onInfoAcknowledge: (actionData: ActionData, messageId: string) => void
  onProgressViewDetails: (actionData: ActionData, messageId: string) => void
  onProgressFileLawsuit: () => void
  onProgressFindLawyer: () => void
  onLawsuitConfirm: () => void
  onLawsuitCancel: (actionData: ActionData, messageId: string) => void
  onFindLawyerConfirm: (actionData: ActionData, messageId: string) => void
  onFindLawyerCancel: (actionData: ActionData, messageId: string) => void
}

interface MessageRendererProps {
  message: ChatMessage
  index: number
  isLastMessage: boolean
  actionHandlers: ActionHandlers
  onCopyToClipboard: (text: string) => void
  onRegenerate: () => void
  isLoading: boolean
  isGeneratingDocument?: boolean
}

// 检查是否为JSON格式的action数据
const isJsonActionData = (content: string): boolean => {
  try {
    const jsonData = JSON.parse(content)
    return jsonData.type && typeof jsonData.type === 'string'
  } catch (e) {
    return false
  }
}

// 解析消息内容，提取所有Action指令（支持JSON格式）
const parseMessageContent = (content: string, messageId?: string) => {
  // 通用Action正则，匹配格式：[ACTION:TYPE:{JSON}]
  const actionRegex = /\[ACTION:([A-Z_]+):(\{[^}]+\})\]/g
  const actionMatches = [...content.matchAll(actionRegex)]
  
  // 兼容旧格式的上传和下载Action
  const legacyUploadRegex = /\[ACTION:UPLOAD:([^:]+):([^\]]+)\]/g
  const legacyDownloadRegex = /\[ACTION:DOWNLOAD:([^:]+):([^\]]+)\]/g
  const legacyPersonalInfoRegex = /\[ACTION:PERSONAL_INFO:([^\]]+)\]/g
  
  const legacyUploadMatches = [...content.matchAll(legacyUploadRegex)]
  const legacyDownloadMatches = [...content.matchAll(legacyDownloadRegex)]
  const legacyPersonalInfoMatches = [...content.matchAll(legacyPersonalInfoRegex)]
  
  // 处理新格式的JSON Action
  if (actionMatches.length > 0) {
    const fullActionText = actionMatches[0][0]
    const actionType = actionMatches[0][1].toLowerCase()
    const jsonData = actionMatches[0][2]
    
    try {
      const parsed = JSON.parse(jsonData)
      return {
        type: actionType,
        data: parsed,
        hasAction: true,
        cleanContent: content.replace(actionRegex, '').trim(),
        originalActionText: fullActionText,
        messageId: messageId
      }
    } catch (e) {
      console.warn('解析Action JSON数据失败:', e, jsonData)
      return {
        type: 'normal',
        hasAction: false,
        cleanContent: content,
        messageId: messageId
      }
    }
  }
  
  // 兼容处理旧格式的个人信息Action
  if (legacyPersonalInfoMatches.length > 0) {
    const fullActionText = legacyPersonalInfoMatches[0][0]
    const actionData = legacyPersonalInfoMatches[0][1]
    try {
      const parsed = JSON.parse(actionData)
      return {
        type: 'personal_info',
        data: parsed,
        hasAction: true,
        cleanContent: content.replace(legacyPersonalInfoRegex, '').trim(),
        originalActionText: fullActionText,
        messageId: messageId
      }
    } catch (e) {
      const simpleParsed = actionData.split(':')
      return {
        type: 'personal_info',
        data: {
          title: simpleParsed[0] || '个人信息确认',
          content: simpleParsed[1] || '我希望获取您的个人信息，您是否同意？'
        },
        hasAction: true,
        cleanContent: content.replace(legacyPersonalInfoRegex, '').trim(),
        originalActionText: fullActionText,
        messageId: messageId
      }
    }
  }
  
  // 兼容处理旧格式的上传Action
  if (legacyUploadMatches.length > 0) {
    const fullActionText = legacyUploadMatches[0][0]
    const title = legacyUploadMatches[0][1]
    const message = legacyUploadMatches[0][2]
    return {
      type: 'upload',
      data: { title, content: message },
      hasAction: true,
      cleanContent: content.replace(legacyUploadRegex, '').trim(),
      originalActionText: fullActionText,
      messageId: messageId
    }
  }
  
  // 兼容处理旧格式的下载Action
  if (legacyDownloadMatches.length > 0) {
    const fullActionText = legacyDownloadMatches[0][0]
    const title = legacyDownloadMatches[0][1]
    const message = legacyDownloadMatches[0][2]
    return {
      type: 'download',
      data: { title, content: message },
      hasAction: true,
      cleanContent: content.replace(legacyDownloadRegex, '').trim(),
      originalActionText: fullActionText,
      messageId: messageId
    }
  }
  
  return {
    type: 'normal',
    hasAction: false,
    cleanContent: content,
    messageId: messageId
  }
}

export function MessageRenderer({ 
  message, 
  index, 
  isLastMessage, 
  actionHandlers, 
  onCopyToClipboard, 
  onRegenerate,
  isLoading,
  isGeneratingDocument = false
}: MessageRendererProps) {
  
  const renderMessageContent = () => {
    // 优先检查actionData，如果没有则解析消息内容（向后兼容）
    if (message.role === "assistant" && message.actionData) {
      return (
        <div className="max-w-[85%]">
          <ActionRenderer 
            message={message} 
            handlers={actionHandlers} 
            isGeneratingDocument={isGeneratingDocument}
          />
        </div>
      )
    }
    
    // 兼容旧格式：解析消息内容中的Action标记
    const parsedContent = parseMessageContent(message.content, message.id)
    if (message.role === "assistant" && parsedContent.hasAction) {
      return (
        <div className="max-w-[85%]">
          {/* 如果有额外的文本内容，先显示 */}
          {parsedContent.cleanContent && (
            <div className="bg-white rounded-r-2xl rounded-tl-2xl rounded-bl-md shadow-sm border p-4 mb-3">
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {parsedContent.cleanContent}
              </div>
            </div>
          )}
          
          {/* 渲染旧格式的PersonalInfo Action */}
          {parsedContent.type === 'personal_info' && (
            <ActionRenderer 
              message={{
                ...message,
                actionData: {
                  type: 'personal_info',
                  title: parsedContent.data?.title || "个人信息获取",
                  message: parsedContent.data?.content || parsedContent.data?.message || "我希望获取您的个人信息，您是否同意？"
                }
              }} 
              handlers={actionHandlers} 
            />
          )}
        </div>
      )
    }
    
    // 检查是否为JSON格式的action数据（历史对话）
    if (message.role === "assistant" && message.content) {
      try {
        const jsonContent = JSON.parse(message.content)
        const historyAction = renderHistoryAction(jsonContent, message, actionHandlers)
        if (historyAction) {
          return <div className="max-w-[85%]">{historyAction}</div>
        }
      } catch (e) {
        // 不是JSON格式，继续处理为普通消息
      }
    }
    
    // 普通消息显示
    return (
      <div
        className={`max-w-[85%] ${
          message.role === "user"
            ? "bg-blue-500 text-white rounded-l-2xl rounded-tr-2xl rounded-br-md"
            : "bg-white rounded-r-2xl rounded-tl-2xl rounded-bl-md shadow-sm border"
        } p-4`}
      >
        {message.role === "assistant" ? (
          <div className={message.role === "user" ? "text-white" : ""}>
            <MarkdownTypewriter 
              content={message.content}
              isStreaming={message.isStreaming}
              typingSpeed={30}
            />
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* AI Avatar and Name */}
      {message.role === "assistant" && (
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
              <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
            </div>
          </div>
          <span className="text-sm text-gray-600">AI法律助手</span>
          {message.isStreaming && (
            <Badge variant="secondary" className="text-xs">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              思考中...
            </Badge>
          )}
        </div>
      )}

      {/* Message Content */}
      <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
        {renderMessageContent()}
      </div>

      {/* Message Actions for AI messages */}
      {message.role === "assistant" && message.content && !message.actionData && !parseMessageContent(message.content, message.id).hasAction && !isJsonActionData(message.content) && (
        <div className="flex items-center gap-1 mt-2 ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopyToClipboard(message.content)}
            className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
          >
            <Copy className="h-3 w-3 mr-1" />
            复制
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700">
            <ThumbsUp className="h-3 w-3 mr-1" />赞
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700">
            <ThumbsDown className="h-3 w-3 mr-1" />踩
          </Button>
          {isLastMessage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              disabled={isLoading}
              className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              重新生成
            </Button>
          )}
        </div>
      )}

      {/* Timestamp */}
      <div className={`text-xs text-gray-400 mt-1 ${message.role === "user" ? "text-right" : "text-left"}`}>
        {formatDistanceToNow(new Date(), { addSuffix: true, locale: zhCN })}
      </div>
    </div>
  )
}
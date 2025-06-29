"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Upload, Loader2 } from "lucide-react"
import { aiApi, type ActionData, type ChatConversation, type ConversationMessage } from "@/api/ai/ai-api"
import { MessageRenderer } from "./MessageRenderer"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { postRequest } from "@/lib/http-client"
import { useMessageSender } from "@/hooks/useMessageSender"
import { LegalDocumentDialog } from "./legal-document-dialog"
import { parseDocumentResponse, formatDocumentForDisplay } from "@/utils/document-parser"

interface ChatInterfaceProps {
  chatId: string
  onTitleChange?: (title: string) => void
}

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

export function ChatInterface({ chatId, onTitleChange }: ChatInterfaceProps) {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [conversationId, setConversationId] = useState<string>(chatId)
  const warningTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const [documentDialog, setDocumentDialog] = useState<{
    open: boolean
    content: string
    fileName?: string
  }>({
    open: false,
    content: '',
    fileName: ''
  })
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // 添加警告并设置15秒自动清除
  const addWarning = useCallback((message: string) => {
    const warningId = Date.now().toString() + Math.random().toString(36)
    
    setWarnings(prev => [...prev, message])
    
    // 设置15秒后自动清除
    const timer = setTimeout(() => {
      setWarnings(prev => {
        // 找到第一个匹配的消息并移除
        const index = prev.indexOf(message)
        if (index > -1) {
          return prev.filter((_, i) => i !== index)
        }
        return prev
      })
      warningTimersRef.current.delete(warningId)
    }, 15000)
    
    warningTimersRef.current.set(warningId, timer)
  }, [])

  // 清理所有定时器
  useEffect(() => {
    return () => {
      warningTimersRef.current.forEach(timer => clearTimeout(timer))
      warningTimersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 生成Action响应消息
  const generateActionResponseMessage = (actionData: ActionData, response: string, extraData?: any): string => {
    const actionType = actionData.type
    
    switch (actionType) {
      case 'upload':
        if (response === 'confirmed' || response === 'uploaded') {
          const fileName = extraData?.fileName || '文件'
          const fileSize = extraData?.fileSize ? `(${(extraData.fileSize / 1024 / 1024).toFixed(2)}MB)` : ''
          return `用户已确认上传文件：${fileName}${fileSize}`
        } else if (response === 'cancelled') {
          return '用户拒绝上传文件'
        }
        break
        
      case 'download':
        if (response === 'confirmed' || response === 'downloaded') {
          return '用户已确认下载文件'
        } else if (response === 'cancelled') {
          return '用户拒绝下载文件'
        }
        break
        
      case 'dialog':
      case 'personal_info':
        if (response === 'confirmed') {
          return '用户已同意提供个人信息'
        } else if (response === 'cancelled') {
          return '用户拒绝提供个人信息'
        }
        break
        
      case 'confirm':
        if (response === 'confirmed') {
          return '用户已确认执行操作'
        } else if (response === 'cancelled') {
          return '用户已取消操作'
        }
        break
        
      case 'warning':
        if (response === 'acknowledged') {
          return '用户已知悉法律风险提醒'
        }
        break
        
      case 'info':
        if (response === 'acknowledged') {
          return '用户已查看法律建议'
        }
        break
        
      case 'progress':
        if (response === 'view_details') {
          return '用户已查看案件进度详情'
        }
        break
        
      case 'lawsuit':
        if (response === 'confirmed') {
          return '用户已确认发起诉讼，正在生成诉讼文书'
        } else if (response === 'cancelled') {
          return '用户取消发起诉讼'
        }
        break
        
      case 'find_lawyer':
        if (response === 'confirmed') {
          return '用户已确认寻找律师，正在匹配合适的律师'
        } else if (response === 'cancelled') {
          return '用户取消寻找律师'
        }
        break
        
      default:
        return `用户操作：${response}`
    }
    
    return `用户操作：${response}`
  }

  // 发送Action响应
  const sendActionResponseWithDelta = async (actionData: ActionData, messageId: string, response: string, extraData?: any) => {
    const responseMessage = generateActionResponseMessage(actionData, response, extraData)
    updateMessageActionStatus(messageId, response, responseMessage)
    
    try {
      const actionResponseData = {
        action: actionData,
        status: response,
        extraData: extraData
      }
      
      await postRequest('/admin-api/lawyer-ai/action-response', {
        actionId: JSON.stringify(actionData.data),
        response: JSON.stringify(actionResponseData),
        messageId: messageId
      })
    } catch (e) {
      console.error('发送action响应失败:', e)
    }
  }

  // 更新消息的Action状态
  const updateMessageActionStatus = (messageId: string, status: string, responseMessage: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId || msg.serverMessageId === messageId) {
        return { 
          ...msg, 
          actionStatus: status as 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'uploaded' | 'downloading' | 'uploading' | 'downloaded',
          actionResponse: responseMessage
        }
      }
      return msg
    }))
  }

  // 使用统一的消息发送hook
  const { sendMessage: sendMessageHook } = useMessageSender({
    conversationId,
    onTitleChange,
    setMessages,
    setIsLoading,
    setError,
    setWarnings: (warnings: string[]) => {
      // 清空现有警告并添加新的警告
      setWarnings([])
      warnings.forEach(warning => addWarning(warning))
    },
    setStreamingMessageId,
    setConversationId,
    sendActionResponseWithDelta
  })

  // 加载历史对话
  useEffect(() => {
    const loadConversation = async () => {
      if (chatId) {
        try {
          const response = await aiApi.getConversationDetail(chatId)
          const detail = response.data
          
          if (detail) {
            if (detail.conversation && onTitleChange) {
              onTitleChange(detail.conversation.title || "AI法律助手")
            }
            
            if (detail.messages) {
              const convertedMessages: ChatMessage[] = detail.messages.map((msg, index) => {
                let actionStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed' | undefined = undefined
                if (msg.role === 'assistant' && isJsonActionData(msg.content)) {
                  actionStatus = 'completed'
                }
                
                return {
                  id: `${msg.role}_${index}_${msg.timestamp}`,
                  role: msg.role as 'user' | 'assistant',
                  content: msg.content,
                  timestamp: new Date(msg.timestamp),
                  isStreaming: false,
                  serverMessageId: msg.messageId,
                  actionStatus
                }
              })
              setMessages(convertedMessages)
            }
          }
          setConversationId(chatId)
        } catch (error) {
          console.error('加载对话失败:', error)
          setError(new Error('加载历史对话失败'))
          if (onTitleChange) {
            onTitleChange("AI法律助手")
          }
        }
      }
    }

    loadConversation()
  }, [chatId, onTitleChange])

  // 检查是否为JSON格式的action数据
  const isJsonActionData = (content: string): boolean => {
    try {
      const jsonData = JSON.parse(content)
      return jsonData.type && typeof jsonData.type === 'string'
    } catch (e) {
      return false
    }
  }

  // Action处理函数
  const actionHandlers = {
    onPersonalInfoConfirm: (actionData: ActionData, messageId: string) => {
      sendActionResponseWithDelta(actionData, messageId, 'confirmed')
    },
    onPersonalInfoCancel: (actionData: ActionData, messageId: string) => {
      sendActionResponseWithDelta(actionData, messageId, 'cancelled')
    },
    onUploadConfirm: (actionData: ActionData, messageId: string) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          updateMessageActionStatus(messageId, 'uploading', '正在上传文件...')
          
          try {
            const formData = new FormData()
            formData.append('file', file)
            
            const uploadResponse = await postRequest('/support/file/upload', formData)
            
            if (uploadResponse.data && uploadResponse.data.url) {
              setMessages(prev => prev.map(msg => {
                if (msg.id === messageId || msg.serverMessageId === messageId) {
                  return { 
                    ...msg, 
                    actionStatus: 'uploaded',
                    actionResponse: `文件上传成功：${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
                    actionMetadata: {
                      fileUrl: uploadResponse.data.url,
                      fileName: file.name,
                      fileSize: file.size
                    }
                  }
                }
                return msg
              }))
              
              sendActionResponseWithDelta(actionData, messageId, 'uploaded', { 
                fileName: file.name, 
                fileSize: file.size,
                fileUrl: uploadResponse.data.url
              })
              
              addWarning(`文件 ${file.name} 上传成功`)
            } else {
              throw new Error('上传响应中没有文件URL')
            }
          } catch (error) {
            console.error('文件上传失败:', error)
            updateMessageActionStatus(messageId, 'pending', '文件上传失败，请重试')
            addWarning(`文件 ${file.name} 上传失败`)
          }
        }
      }
      input.click()
    },
    onUploadCancel: (actionData: ActionData, messageId: string) => {
      sendActionResponseWithDelta(actionData, messageId, 'cancelled')
    },
    onDownloadConfirm: (actionData: ActionData, messageId: string) => {
      const downloadUrl = "https://example.com/sample-document.pdf"
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = '法律文档模板.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      sendActionResponseWithDelta(actionData, messageId, 'downloaded')
      addWarning('文件下载已开始')
    },
    onDownloadCancel: (actionData: ActionData, messageId: string) => {
      sendActionResponseWithDelta(actionData, messageId, 'cancelled')
    },
    onConfirmAction: (actionData: ActionData, messageId: string) => {
      sendActionResponseWithDelta(actionData, messageId, 'confirmed')
    },
    onCancelAction: (actionData: ActionData, messageId: string) => {
      sendActionResponseWithDelta(actionData, messageId, 'cancelled')
    },
    onWarningAcknowledge: (actionData: ActionData, messageId: string) => {
      sendActionResponseWithDelta(actionData, messageId, 'acknowledged')
    },
    onInfoAcknowledge: (actionData: ActionData, messageId: string) => {
      sendActionResponseWithDelta(actionData, messageId, 'acknowledged')
    },
    onProgressViewDetails: (actionData: ActionData, messageId: string) => {
      sendActionResponseWithDelta(actionData, messageId, 'view_details')
    },
    onProgressFileLawsuit: () => {
      sendMessageHook("发起诉讼")
    },
    onProgressFindLawyer: () => {
      router.push('/lawyers')
    },
    onLawsuitConfirm: async () => {
      if (isGeneratingDocument) return // 防止重复点击
      
      try {
        setIsGeneratingDocument(true)
        addWarning('正在生成诉讼文书...')
        
        const response = await aiApi.generateLegalDocument({
          conversationId: conversationId,
          message: "帮我根据上下文生成文书"
        })
        
        if (response.data) {
          // 使用解析器处理返回的数据
          const parsedDocument = parseDocumentResponse(response.data)
          const formattedContent = formatDocumentForDisplay(parsedDocument.content)
          
          setDocumentDialog({
            open: true,
            content: formattedContent,
            fileName: parsedDocument.fileName || "诉讼文书.docx"
          })
          addWarning('文书生成完成')
          
          // 如果有解释说明，也显示给用户
          if (parsedDocument.explanation) {
            setTimeout(() => {
              addWarning(`建议：${parsedDocument.explanation}`)
            }, 1000)
          }
        } else {
          throw new Error('生成文书失败：未返回内容')
        }
      } catch (error) {
        console.error('生成文书失败:', error)
        addWarning('文书生成失败，请稍后重试')
      } finally {
        setIsGeneratingDocument(false)
      }
    },
    onLawsuitCancel: (actionData: ActionData, messageId: string) => {
      sendActionResponseWithDelta(actionData, messageId, 'cancelled')
    },
    onFindLawyerConfirm: (actionData: ActionData, messageId: string) => {
      sendActionResponseWithDelta(actionData, messageId, 'confirmed')
      addWarning('正在为您匹配合适的律师...')
      // 跳转到律师页面
      setTimeout(() => {
        router.push('/lawyers')
      }, 1000) // 延迟1秒跳转，让用户看到提示信息
    },
    onFindLawyerCancel: (actionData: ActionData, messageId: string) => {
      sendActionResponseWithDelta(actionData, messageId, 'cancelled')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      sendMessageHook(input.trim())
      setInput("")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleRegenerate = () => {
    if (messages.length > 0) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()
      if (lastUserMessage) {
        setMessages(prev => {
          const lastAssistantIndex = prev.map(m => m.role).lastIndexOf('assistant')
          if (lastAssistantIndex !== -1) {
            return prev.slice(0, lastAssistantIndex)
          }
          return prev
        })
        setTimeout(() => sendMessageHook(lastUserMessage.content), 100)
      }
    }
  }

  // 获取随机快捷提示（案件进度固定展示）
  const getRandomPrompts = (conversationId: string) => {
    // 固定展示的案件进度选项
    const fixedPrompt = { emoji: "📊", text: "案件进度", input: "查看当前案件进度" }
    
    // 其他可随机选择的提示选项
    const randomPrompts = [
      { emoji: "👤", text: "个人信息确认", input: "我需要您获取我的个人信息" },
      { emoji: "📤", text: "文件上传", input: "请上传我的相关法律文件" },
      { emoji: "📥", text: "文档下载", input: "请下载相关的法律文档模板" },
      { emoji: "⚖️", text: "发起诉讼", input: "我要发起诉讼程序" },
      { emoji: "👨‍💼", text: "寻找律师", input: "帮我匹配合适的律师" },
      { emoji: "⚠️", text: "风险提醒", input: "我需要法律风险提醒" },
      { emoji: "💡", text: "法律建议", input: "请给我专业的法律建议" },
      { emoji: "📋", text: "合同分析", input: "请帮我分析合同条款" },
      { emoji: "🏢", text: "劳动纠纷", input: "我遇到了劳动纠纷问题" },
      { emoji: "🏠", text: "房产纠纷", input: "我有房产相关的法律问题" },
      { emoji: "🚗", text: "交通事故", input: "交通事故处理咨询" },
    ]
    
    let hash = 0
    for (let i = 0; i < conversationId.length; i++) {
      const char = conversationId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    
    const shuffled = [...randomPrompts]
    let seed = Math.abs(hash)
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280
      const j = Math.floor((seed / 233280) * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    // 返回固定的案件进度选项 + 5个随机选项
    return [fixedPrompt, ...shuffled.slice(0, 5)]
  }

  const selectedPrompts = getRandomPrompts(conversationId)

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      {/* Warning Messages */}
      {warnings.length > 0 && (
        <div className="p-4 space-y-2">
          {warnings.map((warning, index) => (
            <Alert key={index} className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-700">{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="w-32 h-32 mb-6 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center mx-auto">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                  <div className="w-16 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-lg mb-2">您好！我是AI法律助手</p>
              <p className="text-sm">请描述您遇到的法律问题，我会为您提供专业建议</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageRenderer
              key={message.id || index}
              message={message}
              index={index}
              isLastMessage={index === messages.length - 1}
              actionHandlers={actionHandlers}
              onCopyToClipboard={copyToClipboard}
              onRegenerate={handleRegenerate}
              isLoading={isLoading}
              isGeneratingDocument={isGeneratingDocument}
            />
          ))
        )}

        {/* Error Message */}
        {error && (
          <div className="flex justify-center">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-3">
                <p className="text-sm text-blue-700 mb-2">⚠️ 发送失败：{error.message}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setError(null)
                    handleRegenerate()
                  }}
                  className="text-blue-600 border-blue-300 hover:bg-blue-100 bg-transparent"
                >
                  重试
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="px-4 py-2 bg-white border-t">
          <div className="flex flex-wrap gap-2 mb-3">
            <Button
              size="sm"
              variant="outline"
              className="text-blue-500 border-blue-200 bg-transparent text-xs"
              onClick={() => sendMessageHook("我需要准备什么材料来起诉离婚？")}
            >
              离婚诉讼材料
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-blue-500 border-blue-200 bg-transparent text-xs"
              onClick={() => sendMessageHook("公司违法裁员，我应该如何维权？")}
            >
              劳动纠纷维权
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-blue-500 border-blue-200 bg-transparent text-xs"
              onClick={() => sendMessageHook("帮我生成一份劳动仲裁申请书")}
            >
              生成法律文书
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-blue-500 border-blue-200 bg-transparent text-xs"
              onClick={() => sendMessageHook("我需要获取你的个人信息")}
            >
              💡 触发确认弹窗
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-blue-500 border-blue-200 bg-transparent text-xs"
              onClick={() => sendMessageHook("请下载相关的劳动合同模板")}
            >
              📁 触发文件下载
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-blue-500 border-blue-200 bg-transparent text-xs"
              onClick={() => sendMessageHook("请上传您的劳动合同文件")}
            >
              📤 触发文件上传
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t">
        {/* Quick Action Buttons */}
        {messages.length > 0 && !input.trim() && !isLoading && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedPrompts.slice(0, 3).map((prompt, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant="outline"
                  className="text-blue-500 border-blue-200 bg-transparent text-xs flex-1"
                  onClick={() => sendMessageHook(prompt.input)}
                >
                  {prompt.emoji} {prompt.text}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedPrompts.slice(3, 6).map((prompt, index) => (
                <Button
                  key={index + 3}
                  size="sm"
                  variant="outline"
                  className="text-blue-500 border-blue-200 bg-transparent text-xs flex-1"
                  onClick={() => sendMessageHook(prompt.input)}
                >
                  {prompt.emoji} {prompt.text}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        <form onSubmit={handleFormSubmit} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={handleInputChange}
              placeholder="描述您遇到的法律问题..."
              className="min-h-[44px] max-h-32 resize-none pr-12 rounded-2xl border-gray-300"
              rows={1}
              disabled={isLoading}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-2 top-2 h-8 w-8"
              disabled={isLoading}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-blue-500 hover:bg-blue-600 rounded-full h-11 w-11"
            size="icon"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-2">以上内容均由AI生成，仅供参考和借鉴</p>
      </div>

      {/* 法律文书Dialog */}
      <LegalDocumentDialog
        open={documentDialog.open}
        onOpenChange={(open) => setDocumentDialog(prev => ({ ...prev, open }))}
        content={documentDialog.content}
        fileName={documentDialog.fileName}
        onDownload={() => {
          addWarning('文书下载完成')
        }}
        onStamp={() => {
          addWarning('已提交盖章申请')
          setDocumentDialog(prev => ({ ...prev, open: false }))
        }}
      />
    </div>
  )
}
"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, Upload, Copy, ThumbsUp, ThumbsDown, RotateCcw, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { aiApi, type ActionData, type ChatCompletionStreamResponse, type ChatConversation, type ConversationMessage } from "@/api/ai/ai-api"
import { PersonalInfoBubble } from "./personal-info-bubble"
import { UploadBubble } from "./upload-bubble"
import { DownloadBubble } from "./download-bubble"
import { ConfirmBubble } from "./confirm-bubble"
import { WarningBubble } from "./warning-bubble"
import { InfoBubble } from "./info-bubble"
import { ProgressBubble } from "./progress-bubble"
import { LawsuitBubble } from "./lawsuit-bubble"
import { FindLawyerBubble } from "./find-lawyer-bubble"
import { MarkdownTypewriter } from "./markdown-typewriter"
import { LegalDocumentDialog } from "./legal-document-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { postRequest } from "@/lib/http-client"
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
  actionData?: ActionData // 存储Action数据
  serverMessageId?: string // 服务器返回的messageId
  actionStatus?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'uploaded' | 'downloading' | 'uploading' | 'downloaded' // Action状态
  actionResponse?: string // Action响应内容
  actionMetadata?: {
    fileUrl?: string // 上传后的文件URL
    fileName?: string // 文件名
    fileSize?: number // 文件大小
    [key: string]: any // 其他数据
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
  
  // 添加警告并设置15秒自动清除
  const addWarningWithTimer = (message: string) => {
    setWarnings(prev => [...prev, message])
    
    // 15秒后自动清除这条警告
    setTimeout(() => {
      setWarnings(prev => prev.filter(warning => warning !== message))
    }, 15000)
  }
  const [conversationId, setConversationId] = useState<string>(chatId)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Dialog相关状态
  const [showDocumentDialog, setShowDocumentDialog] = useState(false)
  const [documentContent, setDocumentContent] = useState('')
  const [documentFileName, setDocumentFileName] = useState('诉讼文书.docx')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])


  // 加载历史对话
  useEffect(() => {
    const loadConversation = async () => {
      if (chatId) {
        try {
          const response = await aiApi.getConversationDetail(chatId)
          const detail = response.data
          
          if (detail) {
            // 更新标题
            if (detail.conversation && onTitleChange) {
              onTitleChange(detail.conversation.title || "AI法律助手")
            }
            
            // 转换消息格式
            if (detail.messages) {
              const convertedMessages: ChatMessage[] = detail.messages.map((msg, index) => {
                // 检查是否为JSON格式的action数据，如果是则设置为completed状态
                let actionStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed' | undefined = undefined
                if (msg.role === 'assistant' && isJsonActionData(msg.content)) {
                  actionStatus = 'completed' // 历史action默认为已完成状态
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
          // 加载失败时设置默认标题
          if (onTitleChange) {
            onTitleChange("AI法律助手")
          }
        }
      }
    }

    loadConversation()
  }, [chatId, onTitleChange])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }



  const sendActionResponse = async (parsedContent: any, response: string, extraData?: any) => {
    try {
      await postRequest('/admin-api/lawyer-ai/action-response', {
        actionId: parsedContent.data, // 原始的actionId数据
        response: parsedContent.originalActionText, // 完整的Action文本，如 "[ACTION:PERSONAL_INFO:个人信息确认:我希望获取你的个人信息，是否同意？]"
        messageId: parsedContent.messageId // 消息ID
      })
    } catch (e) {
      console.error('发送action响应失败:', e)
    }
  }

  // 新的函数，用于处理delta.action结构
  const sendActionResponseWithDelta = async (actionData: ActionData, messageId: string, response: string, extraData?: any) => {
    // 先更新本地状态
    const responseMessage = generateActionResponseMessage(actionData, response, extraData)
    updateMessageActionStatus(messageId, response, responseMessage)
    
    try {
      // 构建发送给后端的响应数据
      const actionResponseData = {
        action: actionData,
        status: response,
        extraData: extraData
      }
      
      await postRequest('/admin-api/lawyer-ai/action-response', {
        actionId: JSON.stringify(actionData.data), // action中的data字段进行JSON.stringify
        response: JSON.stringify(actionResponseData), // 发送完整的响应数据
        messageId: messageId // 消息ID
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

  // 发送消息的流式处理逻辑
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    const messageToSend = input.trim()
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)
    setWarnings([])

    const assistantMessageId = (Date.now() + 1).toString()
    setStreamingMessageId(assistantMessageId)

    // 创建 AbortController 用于取消请求
    abortControllerRef.current = new AbortController()

    // 添加空的助手消息用于流式更新
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: "",
      timestamp: new Date(),
      isStreaming: true
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      // 使用律师AI流式接口
      const reader = await aiApi.lawyerChatStream({
        message: messageToSend,
        conversationId: conversationId || undefined
      })
      
      if (!reader) {
        throw new Error('无法获取流式响应')
      }

      const decoder = new TextDecoder()
      let buffer = '' // 用于缓存不完整的数据

      const readStream = async () => {
        try {
          let hasReceivedData = false
          
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              console.log('流式读取完成')
              
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, isStreaming: false }
                  : msg
              ))
              
              setIsLoading(false)
              setStreamingMessageId(null)
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            buffer += chunk
            console.log('收到数据块:', chunk)
            
            // 处理缓冲区中的数据
            let lines = buffer.split('\n')
            
            // 检查最后一行是否完整（不以\n结尾表示可能不完整）
            if (!buffer.endsWith('\n')) {
              buffer = lines.pop() || ''
            } else {
              buffer = ''
            }
            
            for (const line of lines) {
              const trimmedLine = line.trim()
              if (!trimmedLine) continue
              
              console.log('处理行:', trimmedLine)
              
              // 处理各种可能的数据格式
              if (trimmedLine.startsWith('data:')) {
                const data = trimmedLine.slice(5).trim()
                if (data && data !== '[DONE]') {
                  console.log('提取SSE数据:', data)
                  try {
                    const streamResponse: ChatCompletionStreamResponse = JSON.parse(data)
                    const result = handleStreamResponse(streamResponse, assistantMessageId)
                    if (result) {
                      hasReceivedData = true
                    }
                  } catch (e) {
                    console.warn('解析SSE数据失败:', e, '原始数据:', data)
                  }
                }
              } else if (trimmedLine === 'data: [DONE]' || trimmedLine === '[DONE]') {
                // 流结束标记
                console.log('收到结束标记')
                
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, isStreaming: false }
                    : msg
                ))
                
                setIsLoading(false)
                setStreamingMessageId(null)
                return
              }
            }
          }
          
          // 如果没有收到任何有效数据，显示错误信息
          if (!hasReceivedData) {
            console.warn('未收到有效的流式数据')
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { 
                    ...msg, 
                    content: "抱歉，未收到AI响应数据，请检查网络连接或稍后再试。",
                    isStreaming: false 
                  }
                : msg
            ))
          }
        } catch (readerError: any) {
          if (readerError.name === 'AbortError') {
            console.log('请求被取消')
          } else {
            console.error('流式读取错误:', readerError)
            setError(new Error('流式读取出现错误，请稍后再试。'))
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { 
                    ...msg, 
                    content: msg.content || "抱歉，流式读取出现错误，请稍后再试。",
                    isStreaming: false 
                  }
                : msg
            ))
          }
          setIsLoading(false)
          setStreamingMessageId(null)
        }
      }

      const handleStreamResponse = (response: ChatCompletionStreamResponse, assistantMessageId: string): boolean => {
        if (!response.choices || response.choices.length === 0) return false

        const choice = response.choices[0]
        const delta = choice.delta

        // 提取会话ID（如果有）
        const responseConversationId = response.conversationId || response.conversation_id
        if (responseConversationId && !conversationId) {
          console.log('收到conversation_id:', responseConversationId)
          setConversationId(responseConversationId)
          
          // 更新标题
          if (onTitleChange) {
            onTitleChange("AI法律助手")
          }
        }

        // 保存服务器返回的messageId
        if (response.messageId) {
          setMessages(prev => prev.map(msg => {
            if (msg.id === assistantMessageId) {
              return { ...msg, serverMessageId: response.messageId }
            }
            return msg
          }))
        }

        if (delta.action) {
          // AI发送了action指令，存储到消息中
          console.log('收到AI action指令:', delta.action)
          setMessages(prev => prev.map(msg => {
            if (msg.id === assistantMessageId) {
              return { ...msg, actionData: delta.action }
            }
            return msg
          }))
          return true
        } else if (delta.content) {
          // 正常的文本内容，追加到聊天框
          setMessages(prev => prev.map(msg => {
            if (msg.id === assistantMessageId) {
              const newContent = msg.content + delta.content
              return { ...msg, content: newContent }
            }
            return msg
          }))
          return true
        }
        console.log('choice:', choice)
        if (choice.finish_reason === 'stop') {
          console.log('流式输出完成 - finish_reason: stop')
          console.log('finish_reason stop 响应的完整数据:', response)
          
          // 从finish_reason:"stop"的响应中获取messageId
          const finishMessageId = response.messageId
          
          // 检测并处理Action  
          setMessages(prev => {
            const updatedMessages = prev.map(msg => 
              msg.id === assistantMessageId 
                ? { 
                    ...msg, 
                    isStreaming: false,
                    serverMessageId: finishMessageId || msg.serverMessageId // 使用finish响应的messageId
                  }
                : msg
            )
            
            // 查找刚完成的消息
            const completedMessage = updatedMessages.find(msg => msg.id === assistantMessageId)
            if (completedMessage && completedMessage.actionData) {
              console.log('检测到Action，自动调用action-response:', completedMessage.actionData)
              console.log('使用的messageId:', finishMessageId || completedMessage.serverMessageId)
              // 自动调用action-response，使用finish_reason响应中的messageId
              setTimeout(() => {
                sendActionResponseWithDelta(
                  completedMessage.actionData, 
                  finishMessageId || completedMessage.serverMessageId || completedMessage.id, 
                  'completed'
                )
              }, 100) // 延迟一点确保状态更新完成
            }
            
            return updatedMessages
          })
          
          setIsLoading(false)
          setStreamingMessageId(null)
          return true
        }

        return false
      }

      readStream()

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('请求被取消')
      } else {
        console.error('发送消息失败:', error)
        setError(error instanceof Error ? error : new Error('发送消息时出现错误'))
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { 
                ...msg, 
                content: "抱歉，发送消息时出现错误，请稍后再试。",
                isStreaming: false 
              }
            : msg
        ))
      }
      setIsLoading(false)
      setStreamingMessageId(null)
    } finally {
      abortControllerRef.current = null
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // 可以添加toast提示
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
      const fullActionText = actionMatches[0][0] // 完整的Action文本
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
        // 如果JSON解析失败，尝试简单解析
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

  // 处理个人信息确认
  const handlePersonalInfoConfirm = (parsedContent: any) => {
    console.log('用户同意获取个人信息:', parsedContent)
    sendActionResponse(parsedContent, 'confirmed')
  }

  const handlePersonalInfoCancel = (parsedContent: any) => {
    console.log('用户拒绝获取个人信息:', parsedContent)
    sendActionResponse(parsedContent, 'cancelled')
  }

  // 处理新的气泡式文件上传确认
  const handleBubbleUploadConfirm = (parsedContent: any) => {
    console.log('用户同意上传文件:', parsedContent)
    
    // 触发文件选择器
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        console.log('选择文件:', file.name)
        sendActionResponse(parsedContent, 'uploaded', { 
          fileName: file.name, 
          fileSize: file.size 
        })
        addWarningWithTimer(`文件 ${file.name} 上传成功`)
      }
    }
    input.click()
  }

  const handleBubbleUploadCancel = (parsedContent: any) => {
    console.log('用户取消上传文件:', parsedContent)
    sendActionResponse(parsedContent, 'cancelled')
  }

  // 处理新的气泡式文件下载确认
  const handleBubbleDownloadConfirm = (parsedContent: any) => {
    console.log('用户确认下载文件:', parsedContent)
    
    // 模拟下载链接
    const downloadUrl = "https://example.com/sample-document.pdf"
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = '法律文档模板.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    sendActionResponse(parsedContent, 'downloaded')
    addWarningWithTimer('文件下载已开始')
  }

  const handleBubbleDownloadCancel = (parsedContent: any) => {
    console.log('用户取消下载文件:', parsedContent)
    sendActionResponse(parsedContent, 'cancelled')
  }

  // 处理确认操作
  const handleConfirmAction = (parsedContent: any) => {
    console.log('用户确认操作:', parsedContent)
    sendActionResponse(parsedContent, 'confirmed')
  }

  const handleConfirmCancel = (parsedContent: any) => {
    console.log('用户取消操作:', parsedContent)
    sendActionResponse(parsedContent, 'cancelled')
  }

  // 处理警告确认
  const handleWarningAcknowledge = (parsedContent: any) => {
    console.log('用户确认警告:', parsedContent)
    sendActionResponse(parsedContent, 'acknowledged')
  }

  // 处理信息确认
  const handleInfoAcknowledge = (parsedContent: any) => {
    console.log('用户确认信息:', parsedContent)
    sendActionResponse(parsedContent, 'acknowledged')
  }

  // 处理进度查看
  const handleProgressViewDetails = (parsedContent: any) => {
    console.log('用户查看进度详情:', parsedContent)
    sendActionResponse(parsedContent, 'view_details')
  }

  // 处理诉讼操作
  const handleLawsuitConfirm = (parsedContent: any) => {
    console.log('用户确认发起诉讼:', parsedContent)
    sendActionResponse(parsedContent, 'confirmed')
    addWarningWithTimer('正在生成诉讼文书...')
  }

  const handleLawsuitCancel = (parsedContent: any) => {
    console.log('用户取消发起诉讼:', parsedContent)
    sendActionResponse(parsedContent, 'cancelled')
  }

  // 处理找律师操作
  const handleFindLawyerConfirm = (parsedContent: any) => {
    console.log('用户确认找律师:', parsedContent)
    sendActionResponse(parsedContent, 'confirmed')
    addWarningWithTimer('正在为您匹配合适的律师...')
    // 跳转到律师页面
    setTimeout(() => {
      router.push('/lawyers')
    }, 1000) // 延迟1秒让用户看到匹配提示
  }

  const handleFindLawyerCancel = (parsedContent: any) => {
    console.log('用户取消找律师:', parsedContent)
    sendActionResponse(parsedContent, 'cancelled')
  }

  // 新的处理函数，用于处理delta.action结构
  const handleActionConfirmWithDelta = (actionData: ActionData, messageId: string) => {
    console.log('用户确认Action:', actionData)
    
    // 根据不同Action类型执行相应逻辑
    if (actionData.type === 'upload') {
      // 触发文件选择器
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          console.log('选择文件:', file.name)
          // 先更新状态为上传中
          updateMessageActionStatus(messageId, 'uploading', '正在上传文件...')
          
          try {
            // 使用真实的文件上传接口
            const formData = new FormData()
            formData.append('file', file)
            
            const uploadResponse = await postRequest('/support/file/upload', formData)
            
            if (uploadResponse.data && uploadResponse.data.url) {
              // 上传成功，更新状态和元数据
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
              
              // 发送action-response，包含文件URL
              sendActionResponseWithDelta(actionData, messageId, 'uploaded', { 
                fileName: file.name, 
                fileSize: file.size,
                fileUrl: uploadResponse.data.url
              })
              
              addWarningWithTimer(`文件 ${file.name} 上传成功`)
            } else {
              throw new Error('上传响应中没有文件URL')
            }
          } catch (error) {
            console.error('文件上传失败:', error)
            updateMessageActionStatus(messageId, 'pending', '文件上传失败，请重试')
            addWarningWithTimer(`文件 ${file.name} 上传失败`)
          }
        }
      }
      input.click()
    } else if (actionData.type === 'download') {
      // 模拟下载
      const downloadUrl = "https://example.com/sample-document.pdf"
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = '法律文档模板.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      sendActionResponseWithDelta(actionData, messageId, 'downloaded')
      addWarningWithTimer('文件下载已开始')
    } else if (actionData.type === 'lawsuit') {
      sendActionResponseWithDelta(actionData, messageId, 'confirmed')
      addWarningWithTimer('正在生成诉讼文书...')
    } else if (actionData.type === 'find_lawyer') {
      sendActionResponseWithDelta(actionData, messageId, 'confirmed')
      addWarningWithTimer('正在为您匹配合适的律师...')
      // 跳转到律师页面
      setTimeout(() => {
        router.push('/lawyers')
      }, 1000) // 延迟1秒让用户看到匹配提示
    } else {
      // 其他类型的确认
      sendActionResponseWithDelta(actionData, messageId, 'confirmed')
    }
  }

  const handleActionCancelWithDelta = (actionData: ActionData, messageId: string) => {
    console.log('用户取消Action:', actionData)
    sendActionResponseWithDelta(actionData, messageId, 'cancelled')
  }

  const handleRegenerate = () => {
    if (messages.length > 0) {
      // 重新发送最后一条用户消息
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()
      if (lastUserMessage) {
        setInput(lastUserMessage.content)
        // 移除最后的助手回复
        setMessages(prev => {
          const lastAssistantIndex = prev.map(m => m.role).lastIndexOf('assistant')
          if (lastAssistantIndex !== -1) {
            return prev.slice(0, lastAssistantIndex)
          }
          return prev
        })
        setTimeout(() => sendMessage(), 100)
      }
    }
  }

  // 处理案件进度卡片中的发起诉讼
  const handleProgressFileLawsuit = async () => {
    if (isLoading) return
    
    const message = "发起诉讼"
    
    // 添加用户消息
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)
    setWarnings([])

    const assistantMessageId = (Date.now() + 1).toString()
    setStreamingMessageId(assistantMessageId)

    // 创建 AbortController 用于取消请求
    abortControllerRef.current = new AbortController()

    // 添加空的助手消息用于流式更新
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: "",
      timestamp: new Date(),
      isStreaming: true
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      // 使用律师AI流式接口
      const reader = await aiApi.lawyerChatStream({
        message: message,
        conversationId: conversationId || undefined
      })
      
      if (!reader) {
        throw new Error('无法获取流式响应')
      }

      const decoder = new TextDecoder()
      let buffer = '' // 用于缓存不完整的数据

      const readStream = async () => {
        try {
          let hasReceivedData = false
          
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              console.log('流式读取完成')
              
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, isStreaming: false }
                  : msg
              ))
              
              setIsLoading(false)
              setStreamingMessageId(null)
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            buffer += chunk
            console.log('收到数据块:', chunk)
            
            // 处理缓冲区中的数据 - 复用原有的handleStreamResponse逻辑
            let lines = buffer.split('\n')
            
            if (!buffer.endsWith('\n')) {
              buffer = lines.pop() || ''
            } else {
              buffer = ''
            }
            
            for (const line of lines) {
              const trimmedLine = line.trim()
              if (!trimmedLine) continue
              
              if (trimmedLine.startsWith('data:')) {
                const data = trimmedLine.slice(5).trim()
                if (data && data !== '[DONE]') {
                  try {
                    const streamResponse: ChatCompletionStreamResponse = JSON.parse(data)
                    // 使用现有的handleStreamResponse函数处理逻辑
                    const result = handleStreamResponseInSendMessage(streamResponse, assistantMessageId)
                    if (result) {
                      hasReceivedData = true
                    }
                  } catch (e) {
                    console.warn('解析SSE数据失败:', e, '原始数据:', data)
                  }
                }
              } else if (trimmedLine === 'data: [DONE]' || trimmedLine === '[DONE]') {
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, isStreaming: false }
                    : msg
                ))
                
                setIsLoading(false)
                setStreamingMessageId(null)
                return
              }
            }
          }
          
          if (!hasReceivedData) {
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { 
                    ...msg, 
                    content: "抱歉，未收到AI响应数据，请检查网络连接或稍后再试。",
                    isStreaming: false 
                  }
                : msg
            ))
          }
        } catch (readerError: any) {
          if (readerError.name !== 'AbortError') {
            console.error('流式读取错误:', readerError)
            setError(new Error('流式读取出现错误，请稍后再试。'))
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { 
                    ...msg, 
                    content: msg.content || "抱歉，流式读取出现错误，请稍后再试。",
                    isStreaming: false 
                  }
                : msg
            ))
          }
          setIsLoading(false)
          setStreamingMessageId(null)
        }
      }

      // 辅助函数，复用现有的响应处理逻辑
      const handleStreamResponseInSendMessage = (response: ChatCompletionStreamResponse, assistantMessageId: string): boolean => {
        if (!response.choices || response.choices.length === 0) return false

        const choice = response.choices[0]
        const delta = choice.delta

        const responseConversationId = response.conversationId || response.conversation_id
        if (responseConversationId && !conversationId) {
          setConversationId(responseConversationId)
          if (onTitleChange) {
            onTitleChange("AI法律助手")
          }
        }

        if (response.messageId) {
          setMessages(prev => prev.map(msg => {
            if (msg.id === assistantMessageId) {
              return { ...msg, serverMessageId: response.messageId }
            }
            return msg
          }))
        }

        if (delta.action) {
          setMessages(prev => prev.map(msg => {
            if (msg.id === assistantMessageId) {
              return { ...msg, actionData: delta.action }
            }
            return msg
          }))
          return true
        } else if (delta.content) {
          setMessages(prev => prev.map(msg => {
            if (msg.id === assistantMessageId) {
              const newContent = msg.content + delta.content
              return { ...msg, content: newContent }
            }
            return msg
          }))
          return true
        }

        if (choice.finish_reason === 'stop') {
          const finishMessageId = response.messageId
          
          setMessages(prev => {
            const updatedMessages = prev.map(msg => 
              msg.id === assistantMessageId 
                ? { 
                    ...msg, 
                    isStreaming: false,
                    serverMessageId: finishMessageId || msg.serverMessageId
                  }
                : msg
            )
            
            const completedMessage = updatedMessages.find(msg => msg.id === assistantMessageId)
            if (completedMessage && completedMessage.actionData) {
              setTimeout(() => {
                sendActionResponseWithDelta(
                  completedMessage.actionData, 
                  finishMessageId || completedMessage.serverMessageId || completedMessage.id, 
                  'completed'
                )
              }, 100)
            }
            
            return updatedMessages
          })
          
          setIsLoading(false)
          setStreamingMessageId(null)
          return true
        }

        return false
      }

      readStream()

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('发送消息失败:', error)
        setError(error instanceof Error ? error : new Error('发送消息时出现错误'))
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { 
                ...msg, 
                content: "抱歉，发送消息时出现错误，请稍后再试。",
                isStreaming: false 
              }
            : msg
        ))
      }
      setIsLoading(false)
      setStreamingMessageId(null)
    } finally {
      abortControllerRef.current = null
    }
  }

  // 处理案件进度卡片中的寻找律师
  const handleProgressFindLawyer = () => {
    // 跳转到律师匹配页面
    router.push('/lawyers')
  }

  // 处理诉讼卡片中的生成文书
  const handleLawsuitGenerateDocument = async () => {
    if (isLoading) return
    
    try {
      setIsLoading(true)
      addWarningWithTimer('正在生成诉讼文书...')
      
      // 调用文书生成API
      const response = await postRequest('/admin-api/legal-document/generate', {
        type: 'lawsuit',
        conversationId: conversationId,
        messages: '帮我根据上下文生成法律文书，直接返回文书内容，不要返回任何其他内容'
      })
      
      if (response.success && response.data) {
        // 使用解析器处理返回的数据
        const parsedDocument = parseDocumentResponse(response.data)
        const formattedContent = formatDocumentForDisplay(parsedDocument.content)
        
        setDocumentContent(formattedContent)
        setDocumentFileName(parsedDocument.fileName || '诉讼文书.docx')
        setShowDocumentDialog(true)
        
        setWarnings(prev => prev.filter(w => w !== '正在生成诉讼文书...'))
        addWarningWithTimer('诉讼文书生成成功！')
        
        // 如果有解释说明，也显示给用户
        if (parsedDocument.explanation) {
          setTimeout(() => {
            addWarningWithTimer(`建议：${parsedDocument.explanation}`)
          }, 1000)
        }
        
      } else {
        throw new Error(response.message || '文书生成失败')
      }
    } catch (error: any) {
      console.error('生成文书失败:', error)
      addWarningWithTimer('文书生成失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

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
            <div key={message.id || index} className="flex flex-col">
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
                {(() => {
                  // 优先检查actionData，如果没有则解析消息内容（向后兼容）
                  if (message.role === "assistant" && message.actionData) {
                    // 使用delta.action数据
                    const actionData = message.actionData
                    const actionType = actionData.type
                    
                    return (
                      <div className="max-w-[85%]">
                        {/* 有action时不显示content内容 */}
                        
                        {/* 根据Action类型显示不同的气泡 */}
                        {(actionType === 'dialog' || actionType === 'personal_info') && (
                          <PersonalInfoBubble
                            title={actionData.title || "个人信息获取"}
                            message={actionData.message || "我希望获取您的个人信息，您是否同意？"}
                            onConfirm={() => handleActionConfirmWithDelta(actionData, message.serverMessageId || message.id)}
                            onCancel={() => handleActionCancelWithDelta(actionData, message.serverMessageId || message.id)}
                            status={message.actionStatus}
                            responseMessage={message.actionResponse}
                          />
                        )}
                        
                        {actionType === 'upload' && (
                          <UploadBubble
                            title={actionData.title || "文件上传"}
                            message={actionData.message || "请上传相关文件"}
                            onConfirm={() => handleActionConfirmWithDelta(actionData, message.serverMessageId || message.id)}
                            onCancel={() => handleActionCancelWithDelta(actionData, message.serverMessageId || message.id)}
                            status={message.actionStatus}
                            responseMessage={message.actionResponse}
                            fileUrl={message.actionMetadata?.fileUrl}
                            fileName={message.actionMetadata?.fileName}
                          />
                        )}
                        
                        {actionType === 'download' && (
                          <DownloadBubble
                            title={actionData.title || "文件下载"}
                            message={actionData.message || "请下载相关文件"}
                            onConfirm={() => handleActionConfirmWithDelta(actionData, message.serverMessageId || message.id)}
                            onCancel={() => handleActionCancelWithDelta(actionData, message.serverMessageId || message.id)}
                          />
                        )}
                        
                        {actionType === 'confirm' && (
                          <ConfirmBubble
                            title={actionData.title || "确认操作"}
                            content={actionData.message || "您要执行的操作可能不可逆，确认继续吗？"}
                            onConfirm={() => handleActionConfirmWithDelta(actionData, message.serverMessageId || message.id)}
                            onCancel={() => handleActionCancelWithDelta(actionData, message.serverMessageId || message.id)}
                          />
                        )}
                        
                        {actionType === 'warning' && (
                          <WarningBubble
                            title={actionData.title || "法律风险提醒"}
                            content={actionData.message || "请注意相关法律风险"}
                            onAcknowledge={() => handleActionConfirmWithDelta(actionData, message.serverMessageId || message.id)}
                          />
                        )}
                        
                        {actionType === 'info' && (
                          <InfoBubble
                            title={actionData.title || "法律建议"}
                            content={actionData.message || "以下是相关法律建议"}
                            onAcknowledge={() => handleActionConfirmWithDelta(actionData, message.serverMessageId || message.id)}
                          />
                        )}
                        
                        {actionType === 'progress' && (
                          <ProgressBubble
                            title={actionData.title || "案件进度"}
                            content={actionData.message || "当前案件进度"}
                            progress={actionData.data?.progress || actionData.progress || "0%"}
                            material_progress={actionData.data?.material_progress || actionData.material_progress || "0/0"}
                            onViewDetails={() => handleActionConfirmWithDelta(actionData, message.serverMessageId || message.id)}
                            onFileLawsuit={handleProgressFileLawsuit}
                            onFindLawyer={handleProgressFindLawyer}
                          />
                        )}
                        
                        {actionType === 'lawsuit' && (
                          <LawsuitBubble
                            title={actionData.title || "发起诉讼"}
                            content={actionData.message || "根据您的材料生成诉讼文书"}
                            onConfirm={handleLawsuitGenerateDocument}
                            onCancel={() => handleActionCancelWithDelta(actionData, message.serverMessageId || message.id)}
                          />
                        )}
                        
                        {actionType === 'find_lawyer' && (
                          <FindLawyerBubble
                            title={actionData.title || "找律师"}
                            content={actionData.message || "为您匹配合适的律师"}
                            onConfirm={() => handleActionConfirmWithDelta(actionData, message.serverMessageId || message.id)}
                            onCancel={() => handleActionCancelWithDelta(actionData, message.serverMessageId || message.id)}
                          />
                        )}
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
                        
                        {/* 旧格式的Action气泡显示逻辑保持不变... */}
                        {parsedContent.type === 'personal_info' && (
                          <PersonalInfoBubble
                            title={parsedContent.data?.title || "个人信息获取"}
                            message={parsedContent.data?.content || parsedContent.data?.message || "我希望获取您的个人信息，您是否同意？"}
                            onConfirm={() => handlePersonalInfoConfirm(parsedContent)}
                            onCancel={() => handlePersonalInfoCancel(parsedContent)}
                            status={message.actionStatus}
                            responseMessage={message.actionResponse}
                          />
                        )}
                      </div>
                    )
                  }
                  
                  // 检查是否为JSON格式的action数据（历史对话）
                  if (message.role === "assistant" && message.content) {
                    try {
                      const jsonContent = JSON.parse(message.content)
                      
                      // 检查新格式：{action: {...}, status: "..."}
                      if (jsonContent.action && jsonContent.action.type) {
                        const actionData = jsonContent.action
                        const actionStatus = jsonContent.status || 'completed'
                        
                        return (
                          <div className="max-w-[85%]">
                            {/* 根据Action类型显示不同的气泡 */}
                            {(actionData.type === 'dialog' || actionData.type === 'personal_info') && (
                              <PersonalInfoBubble
                                title={actionData.title || "个人信息获取"}
                                message={actionData.message || "我希望获取您的个人信息，您是否同意？"}
                                onConfirm={() => handleActionConfirmWithDelta(actionData, message.id)}
                                onCancel={() => handleActionCancelWithDelta(actionData, message.id)}
                                status={actionStatus as any}
                                responseMessage={actionStatus === 'confirmed' ? '用户已确认' : actionStatus === 'cancelled' ? '用户已取消' : ''}
                              />
                            )}
                            
                            {actionData.type === 'upload' && (
                              <UploadBubble
                                title={actionData.title || "文件上传"}
                                message={actionData.message || "请上传相关文件"}
                                onConfirm={() => handleActionConfirmWithDelta(actionData, message.id)}
                                onCancel={() => handleActionCancelWithDelta(actionData, message.id)}
                                status={actionStatus as any}
                                responseMessage={actionStatus === 'confirmed' ? '用户已确认上传' : actionStatus === 'cancelled' ? '用户已取消上传' : ''}
                                fileUrl={message.actionMetadata?.fileUrl}
                                fileName={message.actionMetadata?.fileName}
                              />
                            )}
                            
                            {actionData.type === 'download' && (
                              <DownloadBubble
                                title={actionData.title || "文件下载"}
                                message={actionData.message || "请下载相关文件"}
                                onConfirm={() => handleActionConfirmWithDelta(actionData, message.id)}
                                onCancel={() => handleActionCancelWithDelta(actionData, message.id)}
                              />
                            )}
                            
                            {actionData.type === 'confirm' && (
                              <ConfirmBubble
                                title={actionData.title || "确认操作"}
                                content={actionData.message || "您要执行的操作可能不可逆，确认继续吗？"}
                                onConfirm={() => handleActionConfirmWithDelta(actionData, message.id)}
                                onCancel={() => handleActionCancelWithDelta(actionData, message.id)}
                              />
                            )}
                            
                            {actionData.type === 'warning' && (
                              <WarningBubble
                                title={actionData.title || "法律风险提醒"}
                                content={actionData.message || "请注意相关法律风险"}
                                onAcknowledge={() => handleActionConfirmWithDelta(actionData, message.id)}
                              />
                            )}
                            
                            {actionData.type === 'info' && (
                              <InfoBubble
                                title={actionData.title || "法律建议"}
                                content={actionData.message || "以下是相关法律建议"}
                                onAcknowledge={() => handleActionConfirmWithDelta(actionData, message.id)}
                              />
                            )}
                            
                            {actionData.type === 'progress' && (
                              <ProgressBubble
                                title={actionData.title || "案件进度"}
                                content={actionData.message || "当前案件进度"}
                                progress={actionData.data?.progress || actionData.progress || "0%"}
                                material_progress={actionData.data?.material_progress || actionData.material_progress || "0/0"}
                                onViewDetails={() => handleActionConfirmWithDelta(actionData, message.id)}
                                onFileLawsuit={handleProgressFileLawsuit}
                                onFindLawyer={handleProgressFindLawyer}
                              />
                            )}
                            
                            {actionData.type === 'lawsuit' && (
                              <LawsuitBubble
                                title={actionData.title || "发起诉讼"}
                                content={actionData.message || "根据您的材料生成诉讼文书"}
                                onConfirm={handleLawsuitGenerateDocument}
                                onCancel={() => handleActionCancelWithDelta(actionData, message.id)}
                              />
                            )}
                            
                            {actionData.type === 'find_lawyer' && (
                              <FindLawyerBubble
                                title={actionData.title || "找律师"}
                                content={actionData.message || "为您匹配合适的律师"}
                                onConfirm={() => handleActionConfirmWithDelta(actionData, message.id)}
                                onCancel={() => handleActionCancelWithDelta(actionData, message.id)}
                              />
                            )}
                          </div>
                        )
                      }
                      
                      // 检查旧格式：直接是action对象 {type: "...", title: "...", ...}
                      if (jsonContent.type) {
                        const jsonActionData = jsonContent
                        // 这是一个JSON格式的action数据，需要展示为卡片
                        return (
                          <div className="max-w-[85%]">
                            {/* 根据Action类型显示不同的气泡 */}
                            {(jsonActionData.type === 'dialog' || jsonActionData.type === 'personal_info') && (
                              <PersonalInfoBubble
                                title={jsonActionData.title || "个人信息获取"}
                                message={jsonActionData.message || "我希望获取您的个人信息，您是否同意？"}
                                onConfirm={() => handleActionConfirmWithDelta(jsonActionData, message.id)}
                                onCancel={() => handleActionCancelWithDelta(jsonActionData, message.id)}
                                status={message.actionStatus}
                                responseMessage={message.actionResponse}
                              />
                            )}
                            
                            {jsonActionData.type === 'upload' && (
                              <UploadBubble
                                title={jsonActionData.title || "文件上传"}
                                message={jsonActionData.message || "请上传相关文件"}
                                onConfirm={() => handleActionConfirmWithDelta(jsonActionData, message.id)}
                                onCancel={() => handleActionCancelWithDelta(jsonActionData, message.id)}
                                status={message.actionStatus}
                                responseMessage={message.actionResponse}
                                fileUrl={message.actionMetadata?.fileUrl}
                                fileName={message.actionMetadata?.fileName}
                              />
                            )}
                            
                            {jsonActionData.type === 'download' && (
                              <DownloadBubble
                                title={jsonActionData.title || "文件下载"}
                                message={jsonActionData.message || "请下载相关文件"}
                                onConfirm={() => handleActionConfirmWithDelta(jsonActionData, message.id)}
                                onCancel={() => handleActionCancelWithDelta(jsonActionData, message.id)}
                              />
                            )}
                            
                            {jsonActionData.type === 'confirm' && (
                              <ConfirmBubble
                                title={jsonActionData.title || "确认操作"}
                                content={jsonActionData.message || "您要执行的操作可能不可逆，确认继续吗？"}
                                onConfirm={() => handleActionConfirmWithDelta(jsonActionData, message.id)}
                                onCancel={() => handleActionCancelWithDelta(jsonActionData, message.id)}
                              />
                            )}
                            
                            {jsonActionData.type === 'warning' && (
                              <WarningBubble
                                title={jsonActionData.title || "法律风险提醒"}
                                content={jsonActionData.message || "请注意相关法律风险"}
                                onAcknowledge={() => handleActionConfirmWithDelta(jsonActionData, message.id)}
                              />
                            )}
                            
                            {jsonActionData.type === 'info' && (
                              <InfoBubble
                                title={jsonActionData.title || "法律建议"}
                                content={jsonActionData.message || "以下是相关法律建议"}
                                onAcknowledge={() => handleActionConfirmWithDelta(jsonActionData, message.id)}
                              />
                            )}
                            
                            {jsonActionData.type === 'progress' && (
                              <ProgressBubble
                                title={jsonActionData.title || "案件进度"}
                                content={jsonActionData.message || "当前案件进度"}
                                progress={jsonActionData.data?.progress || jsonActionData.progress || "0%"}
                                material_progress={jsonActionData.data?.material_progress || jsonActionData.material_progress || "0/0"}
                                onViewDetails={() => handleActionConfirmWithDelta(jsonActionData, message.id)}
                                onFileLawsuit={handleProgressFileLawsuit}
                                onFindLawyer={handleProgressFindLawyer}
                              />
                            )}
                            
                            {jsonActionData.type === 'lawsuit' && (
                              <LawsuitBubble
                                title={jsonActionData.title || "发起诉讼"}
                                content={jsonActionData.message || "根据您的材料生成诉讼文书"}
                                onConfirm={handleLawsuitGenerateDocument}
                                onCancel={() => handleActionCancelWithDelta(jsonActionData, message.id)}
                              />
                            )}
                            
                            {jsonActionData.type === 'find_lawyer' && (
                              <FindLawyerBubble
                                title={jsonActionData.title || "找律师"}
                                content={jsonActionData.message || "为您匹配合适的律师"}
                                onConfirm={() => handleActionConfirmWithDelta(jsonActionData, message.id)}
                                onCancel={() => handleActionCancelWithDelta(jsonActionData, message.id)}
                              />
                            )}
                          </div>
                        )
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
                        // AI消息使用Markdown渲染和打字机效果
                        <div className={message.role === "user" ? "text-white" : ""}>
                          <MarkdownTypewriter 
                            content={message.content}
                            isStreaming={message.isStreaming}
                            typingSpeed={30}
                          />
                        </div>
                      ) : (
                        // 用户消息保持原样
                        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {message.content}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Message Actions for AI messages */}
              {message.role === "assistant" && message.content && !message.actionData && !parseMessageContent(message.content, message.id).hasAction && !isJsonActionData(message.content) && (
                <div className="flex items-center gap-1 mt-2 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(message.content)}
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
                  {index === messages.length - 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRegenerate}
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
              onClick={() => setInput("我需要准备什么材料来起诉离婚？")}
            >
              离婚诉讼材料
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-blue-500 border-blue-200 bg-transparent text-xs"
              onClick={() => setInput("公司违法裁员，我应该如何维权？")}
            >
              劳动纠纷维权
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-blue-500 border-blue-200 bg-transparent text-xs"
              onClick={() => setInput("帮我生成一份劳动仲裁申请书")}
            >
              生成法律文书
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-blue-500 border-blue-200 bg-transparent text-xs"
              onClick={() => setInput("我需要获取你的个人信息")}
            >
              💡 触发确认弹窗
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-blue-500 border-blue-200 bg-transparent text-xs"
              onClick={() => setInput("请下载相关的劳动合同模板")}
            >
              📁 触发文件下载
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-blue-500 border-blue-200 bg-transparent text-xs"
              onClick={() => setInput("请上传您的劳动合同文件")}
            >
              📤 触发文件上传
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t">
        {/* Quick Action Buttons */}
        {messages.length > 0 && !input.trim() && !isLoading && (() => {
          // 定义所有可用的快捷提示
          const allPrompts = [
            { emoji: "👤", text: "个人信息确认", input: "我需要您获取我的个人信息" },
            { emoji: "📤", text: "文件上传", input: "请上传我的相关法律文件" },
            { emoji: "📥", text: "文档下载", input: "请下载相关的法律文档模板" },
            { emoji: "📊", text: "案件进度", input: "查看当前案件进度" },
            { emoji: "⚖️", text: "发起诉讼", input: "我要发起诉讼程序" },
            { emoji: "👨‍💼", text: "寻找律师", input: "帮我匹配合适的律师" },
            { emoji: "⚠️", text: "风险提醒", input: "我需要法律风险提醒" },
            { emoji: "💡", text: "法律建议", input: "请给我专业的法律建议" },
            { emoji: "📋", text: "合同分析", input: "请帮我分析合同条款" },
            { emoji: "🏢", text: "劳动纠纷", input: "我遇到了劳动纠纷问题" },
            { emoji: "🏠", text: "房产纠纷", input: "我有房产相关的法律问题" },
            { emoji: "🚗", text: "交通事故", input: "交通事故处理咨询" },
          ]
          
          // 基于conversationId生成固定的随机顺序，但确保"案件进度"始终显示
          const getRandomPrompts = (conversationId: string) => {
            let hash = 0
            for (let i = 0; i < conversationId.length; i++) {
              const char = conversationId.charCodeAt(i)
              hash = ((hash << 5) - hash) + char
              hash = hash & hash
            }
            
            // 找到"案件进度"选项
            const progressPrompt = allPrompts.find(p => p.text === "案件进度")
            // 获取其他选项
            const otherPrompts = allPrompts.filter(p => p.text !== "案件进度")
            
            // 使用hash作为种子对其他选项进行Fisher-Yates洗牌
            const shuffled = [...otherPrompts]
            let seed = Math.abs(hash)
            
            for (let i = shuffled.length - 1; i > 0; i--) {
              seed = (seed * 9301 + 49297) % 233280
              const j = Math.floor((seed / 233280) * (i + 1))
              ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }
            
            // 确保"案件进度"在结果中，然后补充其他随机选项
            const result = []
            if (progressPrompt) {
              result.push(progressPrompt)
            }
            
            // 添加其他随机选项直到达到6个
            const remainingSlots = 6 - result.length
            result.push(...shuffled.slice(0, remainingSlots))
            
            return result
          }
          
          const selectedPrompts = getRandomPrompts(conversationId)
          
          return (
            <div className="mb-3">
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedPrompts.slice(0, 3).map((prompt, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="outline"
                    className="text-blue-500 border-blue-200 bg-transparent text-xs flex-1"
                    onClick={() => {
                      setInput(prompt.input)
                      setTimeout(() => sendMessage(), 100)
                    }}
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
                    onClick={() => {
                      setInput(prompt.input)
                      setTimeout(() => sendMessage(), 100)
                    }}
                  >
                    {prompt.emoji} {prompt.text}
                  </Button>
                ))}
              </div>
            </div>
          )
        })()}
        
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
        open={showDocumentDialog}
        onOpenChange={setShowDocumentDialog}
        content={documentContent}
        fileName={documentFileName}
        onDownload={() => {
          addWarningWithTimer('文书下载成功！')
        }}
        onStamp={() => {
          addWarningWithTimer('盖章完成！')
          setShowDocumentDialog(false)
        }}
      />
    </div>
  )
}

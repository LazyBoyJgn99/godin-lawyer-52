"use client"

import { useRef } from "react"
import { aiApi, type ActionData, type ChatCompletionStreamResponse } from "@/api/ai/ai-api"

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

interface UseMessageSenderProps {
  conversationId: string
  onTitleChange?: (title: string) => void
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  setError: React.Dispatch<React.SetStateAction<Error | null>>
  setWarnings: React.Dispatch<React.SetStateAction<string[]>>
  setStreamingMessageId: React.Dispatch<React.SetStateAction<string | null>>
  setConversationId: React.Dispatch<React.SetStateAction<string>>
  sendActionResponseWithDelta: (actionData: ActionData, messageId: string, response: string, extraData?: any) => Promise<void>
}

export const useMessageSender = ({
  conversationId,
  onTitleChange,
  setMessages,
  setIsLoading,
  setError,
  setWarnings,
  setStreamingMessageId,
  setConversationId,
  sendActionResponseWithDelta
}: UseMessageSenderProps) => {
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
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
        message: messageContent.trim(),
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
                    const result = handleStreamResponse(streamResponse, assistantMessageId)
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

      // 统一的响应处理逻辑
      const handleStreamResponse = (response: ChatCompletionStreamResponse, assistantMessageId: string): boolean => {
        if (!response.choices || response.choices.length === 0) return false

        const choice = response.choices[0]
        const delta = choice.delta

        const responseConversationId = response.conversationId || response.conversation_id
        if (responseConversationId && !conversationId) {
          console.log('收到conversation_id:', responseConversationId)
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
          console.log('收到AI action指令:', delta.action)
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
          console.log('流式输出完成 - finish_reason: stop')
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
              console.log('检测到Action，自动调用action-response:', completedMessage.actionData)
              setTimeout(() => {
                sendActionResponseWithDelta(
                  completedMessage.actionData!, 
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

  const abort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  return {
    sendMessage,
    abort
  }
}
"use client"

import {useEffect, useRef, useState} from "react"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {Alert, AlertDescription} from "@/components/ui/alert"
import {ScrollArea} from "@/components/ui/scroll-area"
import {aiApi} from "@/api/ai/ai-api"
import {Bot, Loader2, Send, User} from "lucide-react"
import ActionStreamDemo from "./action-stream"

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

export default function AiChatDemo() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 发送消息
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    const assistantMessageId = (Date.now() + 1).toString()
    setStreamingMessageId(assistantMessageId)

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
      // 使用流式API
      const reader = await aiApi.demoFaruiStream({ message: inputValue.trim() })
      
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
            console.log('当前缓冲区长度:', buffer.length)
            
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
                  const result = processData(data)
                  if (result) {
                    hasReceivedData = true
                  }
                }
              } else if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
                // 直接的JSON数据
                console.log('提取JSON数据:', trimmedLine)
                const result = processData(trimmedLine)
                if (result) {
                  hasReceivedData = true
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
        } catch (readerError) {
          console.error('流式读取错误:', readerError)
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { 
                  ...msg, 
                  content: msg.content || "抱歉，流式读取出现错误，请稍后再试。",
                  isStreaming: false 
                }
              : msg
          ))
          setIsLoading(false)
          setStreamingMessageId(null)
        }
      }

      const processData = (data: string): boolean => {
        if (!data || data === '[DONE]') return false
        
        try {
          // 解析JSON响应
          const streamResponse = JSON.parse(data)
          console.log('解析的响应对象:', streamResponse)
          
          // 根据提供的格式，内容在 choices[0].delta.content 中
          const content = streamResponse.choices?.[0]?.delta?.content
          
          console.log('提取的内容:', content, '类型:', typeof content)
          
          // 检查内容是否存在且为字符串
          if (content && typeof content === 'string') {
            console.log('✅ 成功获取内容，正在更新消息，新增内容:', content, '长度:', content.length)
            
            // 使用函数式更新确保状态正确
            setMessages(prev => {
              return prev.map(msg => {
                if (msg.id === assistantMessageId) {
                  const newContent = msg.content + content
                  console.log('✅ 消息更新成功: 原内容长度:', msg.content.length, '新增内容:', content, '总长度:', newContent.length)
                  return { ...msg, content: newContent }
                }
                return msg
              })
            })
            
            return true // 返回true表示成功处理了有效内容
          } else if (content === null || content === undefined) {
            // content为null或undefined是正常的，可能是流式传输的第一块或控制块
            console.log('ℹ️ 收到空内容块，这是正常的流式传输控制块')
            return false
          } else {
            console.log('⚠️ 未找到有效内容，响应结构:', Object.keys(streamResponse))
            if (streamResponse.choices?.[0]) {
              console.log('choices[0]结构:', Object.keys(streamResponse.choices[0]))
              if (streamResponse.choices[0].delta) {
                console.log('delta结构:', Object.keys(streamResponse.choices[0].delta))
              }
            }
            return false
          }
          
          // 检查是否结束 - 根据farui-plus格式，使用finish_reason字段
          const finishReason = streamResponse.choices?.[0]?.finish_reason
          
          if (finishReason === 'stop') {
            console.log('🏁 检测到流式结束标记:', finishReason)
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, isStreaming: false }
                : msg
            ))
            setIsLoading(false)
            setStreamingMessageId(null)
            return true
          }
          
        } catch (parseError) {
          console.error('❌ JSON解析失败:', parseError)
          console.error('原始数据:', data)
          console.error('数据长度:', data.length)
          return false
        }
        
        return false
      }

      readStream()

    } catch (error) {
      console.error('发送消息失败:', error)
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { 
              ...msg, 
              content: "抱歉，发送消息时出现错误，请稍后再试。",
              isStreaming: false 
            }
          : msg
      ))
      setIsLoading(false)
      setStreamingMessageId(null)
    }
  }

  // 清空对话
  const clearChat = () => {
    setMessages([])
    setStreamingMessageId(null)
  }

  // 测试普通API
  const testNormalApi = async () => {
    if (!inputValue.trim()) return

    setIsLoading(true)
    try {
      const response = await aiApi.demoFaruiNormal({ message: inputValue.trim() })
      
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: inputValue.trim(),
        timestamp: new Date()
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.choices[0]?.message?.content || "无响应内容",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, userMessage, assistantMessage])
      setInputValue("")
    } catch (error) {
      console.error('普通API调用失败:', error)
      alert('API调用失败，请检查网络连接和后端服务')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI流式聊天Demo</h1>
          <p className="text-muted-foreground">测试法睿Plus模型的流式聊天功能</p>
        </div>
        <Badge variant="secondary">法睿Plus</Badge>
      </div>

      <Tabs defaultValue="stream" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stream">流式聊天</TabsTrigger>
          <TabsTrigger value="normal">普通聊天</TabsTrigger>
          <TabsTrigger value="action">Action流式</TabsTrigger>
        </TabsList>

        <TabsContent value="stream" className="space-y-4">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>流式聊天</CardTitle>
                  <CardDescription>实时显示AI回复内容</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={clearChat}>
                  清空对话
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0">
              {/* 消息列表 */}
              <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
                <div className="space-y-4 py-4">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>开始与AI助手对话吧！</p>
                      <p className="text-sm">法睿Plus是专业的法律AI助手</p>
                    </div>
                  )}
                  
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground ml-12'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap">
                          {message.content}
                          {message.isStreaming && (
                            <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                          )}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                      
                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* 输入区域 */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="输入您的法律问题..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={isLoading || !inputValue.trim()}
                    size="icon"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  按 Enter 发送，Shift + Enter 换行
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="normal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>普通聊天测试</CardTitle>
              <CardDescription>测试非流式API调用</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && testNormalApi()}
                  placeholder="输入您的问题..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={testNormalApi}
                  disabled={isLoading || !inputValue.trim()}
                >
                  {isLoading ? '请求中...' : '发送'}
                </Button>
              </div>

              {messages.length > 0 && (
                <ScrollArea className="h-[400px] border rounded-lg p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}
                        
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </div>
                          <div className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                        
                        {message.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <Button variant="outline" onClick={clearChat} className="w-full">
                清空对话历史
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="action" className="space-y-4">
          <ActionStreamDemo />
        </TabsContent>
      </Tabs>

      <Alert>
        <Bot className="h-4 w-4" />
        <AlertDescription>
          <strong>法睿Plus模型特性：</strong>
          专业法律大模型，支持法律问答、文书生成、案例分析等功能。
          流式响应可以实时查看AI生成过程。
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>API接口信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>流式接口:</strong> <code>POST /admin-api/ai/demo/farui-stream</code></p>
          <p><strong>普通接口:</strong> <code>POST /admin-api/ai/demo/farui-normal</code></p>
          <p><strong>模型:</strong> farui-plus (通义法睿)</p>
          <p><strong>响应方式:</strong> Server-Sent Events (SSE) / 标准JSON</p>
          <p><strong>后端地址:</strong> {process.env.NEXT_PUBLIC_API_URL || "http://localhost:10244"}</p>
        </CardContent>
      </Card>
    </div>
  )
}
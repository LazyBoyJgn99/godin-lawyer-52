'use client'

import React, {useEffect, useRef, useState} from 'react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {ScrollArea} from '@/components/ui/scroll-area'
import {Badge} from '@/components/ui/badge'
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,} from '@/components/ui/sheet'
import {Bot, Check, Copy, History, MessageSquare, Send, Trash2, User} from 'lucide-react'
import {
  type ActionData,
  aiApi,
  type ChatCompletionStreamResponse,
  type ChatConversation,
  type ModelInfo
} from '@/api/ai/ai-api'
import {postRequest} from '@/lib/http-client'

export default function LawyerDemoPage() {
  // API配置 - 可以方便切换V1和V2
  const [apiVersion, setApiVersion] = useState<'v1' | 'v2'>('v2')
  const [selectedModel, setSelectedModel] = useState('farui-plus')
  const API_BASE = apiVersion === 'v2' ? '/admin-api/lawyer-ai-v2' : '/admin-api/lawyer-ai'
  
  const [message, setMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentAction, setCurrentAction] = useState<ActionData | null>(null)
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [conversationId, setConversationId] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string, timestamp: Date, isStreaming?: boolean}>>([])
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [showHistorySheet, setShowHistorySheet] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // 监听消息变化，自动滚动
  useEffect(() => {
    scrollToBottom()
  }, [chatHistory])

  // 加载可用模型列表（仅V2支持）
  useEffect(() => {
    if (apiVersion === 'v2') {
      loadAvailableModels()
    } else {
      setAvailableModels([])
    }
    // 切换API版本时重置状态
    setConversationId('')
    setCurrentMessageId(null)
    setChatHistory([])
    setWarnings([])
  }, [apiVersion])

  const loadAvailableModels = async () => {
    try {
      console.log('加载V2模型列表')
      const response = await aiApi.getV2Models()
      console.log('模型列表响应:', response)
      if (response.success && response.data) {
        setAvailableModels(response.data)
      }
    } catch (error) {
      console.error('加载模型列表失败:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() || isStreaming) return

    // 添加用户消息到历史记录
    const userMessage = message.trim()
    const assistantMessageId = `assistant_${Date.now()}`
    
    setChatHistory(prev => [
      ...prev, 
      {role: 'user', content: userMessage, timestamp: new Date()},
      {role: 'assistant', content: '', timestamp: new Date(), isStreaming: true}
    ])
    setMessage('')
    setIsStreaming(true)
    setWarnings([])
    
    // 创建 AbortController 用于取消请求
    abortControllerRef.current = new AbortController()

    try {
      // 使用对应版本的API
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
      
      if (apiVersion === 'v2') {
        console.log('使用V2流式接口，模型:', selectedModel, '会话ID:', conversationId)
        const requestBody: any = {
          message: userMessage,
          model: selectedModel
        }
        if (conversationId && conversationId.trim() !== '') {
          requestBody.conversationId = conversationId
        }
        reader = await aiApi.lawyerChatV2Stream(requestBody)
      } else {
        console.log('使用V1流式接口，会话ID:', conversationId)
        const requestBody: any = {
          message: userMessage
        }
        if (conversationId && conversationId.trim() !== '') {
          requestBody.conversationId = conversationId
        }
        reader = await aiApi.lawyerChatStream(requestBody)
      }
      
      if (!reader) {
        throw new Error('无法获取流式响应')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        
        // 处理缓冲区中的数据
        let lines = buffer.split('\n')
        
        // 检查最后一行是否完整
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
                handleStreamResponse(streamResponse)
              } catch (e) {
                console.warn('解析SSE数据失败:', e, '原始数据:', data)
              }
            }
          } else if (trimmedLine === 'data: [DONE]' || trimmedLine === '[DONE]') {
            console.log('收到结束标记')
            // 标记流式输出完成
            setChatHistory(prev => prev.map(msg => 
              msg.role === 'assistant' && msg.isStreaming 
                ? { ...msg, isStreaming: false }
                : msg
            ))
            return
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('请求被取消')
      } else {
        console.error('律师AI聊天错误:', error)
        setWarnings(prev => [...prev, `错误: ${error.message}`])
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  const handleStreamResponse = (response: ChatCompletionStreamResponse) => {
    if (!response.choices || response.choices.length === 0) return

    const choice = response.choices[0]
    const delta = choice.delta

    // 提取会话ID和消息ID（如果有）
    const responseConversationId = response.conversation_id || response.conversationId
    if (responseConversationId) {
      console.log('收到conversationId:', responseConversationId, '当前:', conversationId)
      if (!conversationId || conversationId.trim() === '') {
        console.log('设置新的conversationId:', responseConversationId)
        setConversationId(responseConversationId)
      }
    }
    if (response.messageId) {
      setCurrentMessageId(response.messageId)
    }

    if (delta.action) {
      // AI主动发送了action指令
      handleAction(delta.action)
      // 不更新内容，action会在后续的content中显示简化提醒
    } else if (delta.content) {
      // 更新最后一条助手消息的内容
      setChatHistory(prev => prev.map((msg, index) => {
        if (index === prev.length - 1 && msg.role === 'assistant' && msg.isStreaming) {
          return { ...msg, content: msg.content + delta.content }
        }
        return msg
      }))
    }

    if (choice.finishReason === 'stop') {
      console.log('流式输出完成')
      setChatHistory(prev => prev.map(msg => 
        msg.role === 'assistant' && msg.isStreaming 
          ? { ...msg, isStreaming: false }
          : msg
      ))
    }
  }

  const handleAction = (actionData: ActionData) => {
    console.log('收到律师AI action:', actionData)

    switch (actionData.type) {
      case 'dialog':
        setCurrentAction(actionData)
        setShowActionDialog(true)
        break
      case 'download':
        setCurrentAction(actionData)
        setShowDownloadDialog(true)
        break
      case 'upload':
        setCurrentAction(actionData)
        setShowUploadDialog(true)
        break
      case 'progress':
        // 显示案件进度
        setWarnings([`📊 案件进度：${actionData.data?.progress || '50%'} | 材料完整度：${actionData.data?.material_progress || '6/12'} | 案件类型：${actionData.data?.case_type || '劳动纠纷'}`])
        break
      case 'lawsuit':
        // 显示诉讼文书预览
        setWarnings([`⚖️ 诉讼文书已生成：${actionData.data?.document_preview || '文书预览'} | 盖章费用：¥${actionData.data?.seal_price || '9.9'}`])
        break
      case 'find_lawyer':
        // 显示律师匹配状态
        setWarnings([`👨‍💼 ${actionData.data?.matching_status || '正在匹配律师'} | 案件类型：${actionData.data?.case_type || '劳动纠纷'} | 地区：${actionData.data?.location || '北京市'}`])
        break
      default:
        console.warn('未知的action类型:', actionData.type)
    }
  }

  const handleActionConfirm = () => {
    if (currentAction) {
      console.log('用户确认了律师AI操作:', currentAction.data)
      sendActionResponse(currentAction.data, 'confirmed')
    }
    setShowActionDialog(false)
    setCurrentAction(null)
  }

  const handleActionCancel = () => {
    if (currentAction) {
      console.log('用户取消了律师AI操作')
      sendActionResponse(currentAction.data, 'cancelled')
    }
    setShowActionDialog(false)
    setCurrentAction(null)
  }

  const handleDownloadConfirm = () => {
    if (currentAction && currentAction.data && typeof currentAction.data === 'string') {
      console.log('用户确认下载:', currentAction.data)
      window.open(currentAction.data, '_blank')
      sendActionResponse(currentAction.data, 'downloaded')
    }
    setShowDownloadDialog(false)
    setCurrentAction(null)
  }

  const handleDownloadCancel = () => {
    if (currentAction) {
      console.log('用户取消下载')
      sendActionResponse(currentAction.data, 'cancelled')
    }
    setShowDownloadDialog(false)
    setCurrentAction(null)
  }

  const handleUploadConfirm = () => {
    if (currentAction) {
      console.log('用户确认上传:', currentAction.data)
      // 这里可以触发文件选择器
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          console.log('选择文件:', file.name)
          // 这里可以添加文件上传逻辑
          sendActionResponse(currentAction.data, 'uploaded')
        }
      }
      input.click()
    }
    setShowUploadDialog(false)
    setCurrentAction(null)
  }

  const handleUploadCancel = () => {
    if (currentAction) {
      console.log('用户取消上传')
      sendActionResponse(currentAction.data, 'cancelled')
    }
    setShowUploadDialog(false)
    setCurrentAction(null)
  }

  const sendActionResponse = async (actionId: any, response: string) => {
    try {
      if (apiVersion === 'v2') {
        await aiApi.sendV2ActionResponse({
          actionId: actionId,
          response: response,
          messageId: currentMessageId
        })
      } else {
        await postRequest('/admin-api/lawyer-ai/action-response', {
          actionId: actionId,
          response: response,
          messageId: currentMessageId
        })
      }
      console.log('成功发送action响应:', { actionId, response, messageId: currentMessageId })
    } catch (e) {
      console.error('发送律师AI action响应失败:', e)
    }
  }

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // 立即停止流式状态
    setIsStreaming(false)
    
    // 标记最后一条消息为完成状态
    setChatHistory(prev => prev.map(msg => 
      msg.role === 'assistant' && msg.isStreaming 
        ? { ...msg, isStreaming: false, content: msg.content || '对话已中断' }
        : msg
    ))
    
    // 清理引用
    abortControllerRef.current = null
  }

  const clearChat = () => {
    setChatHistory([])
    setWarnings([])
    setConversationId('')
    setCurrentMessageId(null)
  }

  const startNewConversation = () => {
    setConversationId('')
    setCurrentMessageId(null)
    setChatHistory([])
    setWarnings([])
  }

  // 获取对话历史列表
  const loadConversations = async () => {
    setLoadingConversations(true)
    try {
      const response = apiVersion === 'v2' 
        ? await aiApi.getV2Conversations()
        : await aiApi.getConversations()
      setConversations(response.data || [])
    } catch (error) {
      console.error('加载对话历史失败:', error)
      setWarnings(prev => [...prev, '加载对话历史失败'])
    } finally {
      setLoadingConversations(false)
    }
  }

  // 恢复历史对话
  const restoreConversation = async (conversation: ChatConversation) => {
    try {
      setShowHistorySheet(false)
      setConversationId(conversation.id)
      setCurrentMessageId(null) // 重置messageId，新消息会有新的ID
      
      // 获取对话详情
      const response = apiVersion === 'v2'
        ? await aiApi.getV2ConversationDetail(conversation.id)
        : await aiApi.getConversationDetail(conversation.id)
      const detail = response.data
      
      if (detail && detail.messages) {
        // 转换消息格式
        const messages = detail.messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        }))
        setChatHistory(messages)
      }
      
      setWarnings([])
    } catch (error) {
      console.error('恢复对话失败:', error)
      setWarnings(prev => [...prev, '恢复对话失败'])
    }
  }

  // 删除对话
  const deleteConversationById = async (delConversationId: string) => {
    try {
      if (apiVersion === 'v2') {
        await aiApi.deleteV2Conversation(delConversationId)
      } else {
        await aiApi.deleteConversation(delConversationId)
      }
      // 重新加载对话列表
      loadConversations()
      
      // 如果删除的是当前对话，开始新对话
      if (delConversationId === conversationId) {
        startNewConversation()
      }
    } catch (error) {
      console.error('删除对话失败:', error)
      setWarnings(prev => [...prev, '删除对话失败'])
    }
  }

  // 打开历史面板时加载对话列表
  const handleHistoryOpen = () => {
    setShowHistorySheet(true)
    loadConversations()
  }

  // 复制AI回复到剪贴板
  const copyToClipboard = async (content: string, messageIndex: number) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(`message-${messageIndex}`)
      
      // 3秒后重置复制状态
      setTimeout(() => {
        setCopiedMessageId(null)
      }, 3000)
      
      // 显示成功提示
      setWarnings(prev => [...prev, '已复制到剪贴板'])
      // 3秒后清除提示
      setTimeout(() => {
        setWarnings(prev => prev.slice(1))
      }, 3000)
    } catch (error) {
      console.error('复制失败:', error)
      setWarnings(prev => [...prev, '复制失败，请手动选择复制'])
      setTimeout(() => {
        setWarnings(prev => prev.slice(1))
      }, 3000)
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 聊天头部 */}
      <div className="flex-shrink-0 border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 左上角历史按钮 */}
            <Sheet open={showHistorySheet} onOpenChange={setShowHistorySheet}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleHistoryOpen}>
                  <History className="w-4 h-4 mr-1" />
                  历史
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    对话历史
                  </SheetTitle>
                  <SheetDescription>
                    选择一个历史对话来恢复聊天状态
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  {loadingConversations ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-sm text-muted-foreground">加载中...</div>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-sm text-muted-foreground">暂无对话历史</div>
                    </div>
                  ) : (
                    <ScrollArea className="h-[calc(100vh-200px)]">
                      <div className="space-y-2">
                        {conversations.map((conv) => (
                          <div
                            key={conv.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer group"
                            onClick={() => restoreConversation(conv)}
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium truncate">
                                {conv.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {conv.id.slice(-8)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(conv.lastMessageTime).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteConversationById(conv.id)
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Bot className="w-5 h-5" />
              {/*律师AI助手 {apiVersion.toUpperCase()}*/}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* API版本切换 */}
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">API:</span>
              <Button
                variant={apiVersion === 'v1' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setApiVersion('v1')}
                className="h-7 px-2 text-xs"
              >
                V1
              </Button>
              <Button
                variant={apiVersion === 'v2' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setApiVersion('v2')}
                className="h-7 px-2 text-xs"
              >
                V2
              </Button>
            </div>
            
            {/* 模型选择（仅V2显示） */}
            {apiVersion === 'v2' && availableModels.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">模型:</span>
                <select 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="text-xs border rounded px-1 py-0.5 bg-background"
                >
                  {availableModels.map(model => (
                    <option key={model.modelName} value={model.modelName}>
                      {model.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {conversationId && (
              <Badge variant="outline" className="text-xs">
                {conversationId.slice(-8)}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={startNewConversation}>
              新对话
            </Button>
            <Button variant="outline" size="sm" onClick={clearChat}>
              清空
            </Button>
          </div>
        </div>
      </div>

      {/* 警告信息 */}
      {warnings.length > 0 && (
        <div className="flex-shrink-0 p-4 space-y-2">
          {warnings.map((warning, index) => (
            <Alert key={index} className="border-orange-200 bg-orange-50">
              <AlertDescription className="text-orange-800">{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* 聊天消息区域 - 占满剩余空间 */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full px-4">
          <div className="space-y-4 py-4">
            {chatHistory.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <Bot className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium mb-2">欢迎使用律师AI助手</h3>
                <p className="text-sm">请输入您的法律问题开始咨询...</p>
              </div>
            )}
            
            {chatHistory.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 group ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] sm:max-w-[70%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-8 sm:ml-12'
                      : 'bg-muted'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content}
                    {message.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                    {/* AI消息添加复制按钮 */}
                    {message.role === 'assistant' && !message.isStreaming && message.content && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gray-200 opacity-50 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(message.content, index)}
                        title="复制回复"
                      >
                        {copiedMessageId === `message-${index}` ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-gray-600" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* 快捷测试按钮 */}
      <div className="flex-shrink-0 p-4 border-t bg-muted/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">
            快捷测试 | 当前API: {apiVersion.toUpperCase()}
            {apiVersion === 'v2' && (
              <span> | 模型: {availableModels.find(m => m.modelName === selectedModel)?.displayName || selectedModel}</span>
            )}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setMessage('我想了解劳动合同法的相关规定')}
            disabled={isStreaming}
            className="text-xs justify-start"
          >
            📋 劳动合同咨询
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setMessage('我需要获取你的个人信息')}
            disabled={isStreaming}
            className="text-xs justify-start"
          >
            💡 触发确认弹窗
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setMessage('请下载相关的劳动合同模板')}
            disabled={isStreaming}
            className="text-xs justify-start"
          >
            📁 触发文件下载
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setMessage('请上传您的劳动合同文件')}
            disabled={isStreaming}
            className="text-xs justify-start"
          >
            📤 触发文件上传
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setMessage('我想查看当前案件进度')}
            disabled={isStreaming}
            className="text-xs justify-start"
          >
            📊 查看案件进度
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setMessage('我想发起劳动仲裁诉讼')}
            disabled={isStreaming}
            className="text-xs justify-start"
          >
            ⚖️ 发起诉讼
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setMessage('我需要找专业的劳动法律师')}
            disabled={isStreaming}
            className="text-xs justify-start"
          >
            👨‍💼 找律师
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setMessage('帮我清空所有聊天记录')}
            disabled={isStreaming}
            className="text-xs justify-start"
          >
            ⚠️ 触发警告确认
          </Button>
        </div>
      </div>

      {/* 输入区域 */}
      <div className="flex-shrink-0 border-t bg-background p-4">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && !isStreaming && handleSendMessage()}
            placeholder="输入您的法律问题..."
            disabled={isStreaming}
            className="flex-1"
          />
          <Button
            onClick={isStreaming ? stopStreaming : handleSendMessage}
            disabled={!isStreaming && !message.trim()}
            size="icon"
            className={`h-10 w-10 ${isStreaming ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
            variant={isStreaming ? "destructive" : "default"}
          >
            {isStreaming ? (
              <span className="text-xs font-bold">停</span>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mt-2 text-center">
          {isStreaming ? '点击红色按钮中断对话' : '按 Enter 发送'}
        </div>
      </div>

      {/* Action确认对话框 */}
      <AlertDialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              💡 {currentAction?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {currentAction?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleActionCancel}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleActionConfirm}>
              确定继续
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 下载确认对话框 */}
      <AlertDialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              📁 {currentAction?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {currentAction?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDownloadCancel}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDownloadConfirm}>
              立即下载
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 上传确认对话框 */}
      <AlertDialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              📤 {currentAction?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {currentAction?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleUploadCancel}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleUploadConfirm}>
              选择文件
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
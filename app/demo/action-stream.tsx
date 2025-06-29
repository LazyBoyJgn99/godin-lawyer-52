'use client'

import {useRef, useState} from 'react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
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
import {type ActionData, aiApi, type ChatCompletionStreamResponse} from '@/api/ai/ai-api'
import {postRequest} from '@/lib/http-client'

export default function ActionStreamDemo() {
  const [message, setMessage] = useState('')
  const [chatContent, setChatContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentAction, setCurrentAction] = useState<ActionData | null>(null)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleSendMessage = async () => {
    if (!message.trim() || isStreaming) return

    setIsStreaming(true)
    setChatContent('')
    setWarnings([])
    
    // 创建 AbortController 用于取消请求
    abortControllerRef.current = new AbortController()

    try {
      // 使用现有的AI API
      const reader = await aiApi.chatStream({ message })
      
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
            return
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('请求被取消')
      } else {
        console.error('流式聊天错误:', error)
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

    if (delta.action) {
      // AI主动发送了action指令
      handleAction(delta.action)
      // 不显示action标记本身，后续的content会是简化的提醒文本
    } else if (delta.content) {
      // 检查是否是action触发的简化提醒文本
      if (delta.content.includes('AI触发了')) {
        // 这是action触发后的简化提醒，以特殊样式显示
        setChatContent(prev => prev + `\n💡 ${delta.content}\n`)
      } else {
        // 正常的文本内容，追加到聊天框
        setChatContent(prev => prev + delta.content)
      }
    }

    if (choice.finishReason === 'stop') {
      console.log('流式输出完成')
    }
  }

  const handleAction = (actionData: ActionData) => {
    console.log('收到AI action:', actionData)

    switch (actionData.type) {
      case 'dialog':
        setCurrentAction(actionData)
        setShowActionDialog(true)
        break
      case 'warning':
      case 'info':
        setWarnings(prev => [...prev, `${actionData.title}: ${actionData.message}`])
        break
      default:
        console.warn('未知的action类型:', actionData.type)
    }
  }

  const handleActionConfirm = () => {
    if (currentAction) {
      console.log('用户确认了操作:', currentAction.data)
      sendActionResponse(currentAction.data, 'confirmed')
    }
    setShowActionDialog(false)
    setCurrentAction(null)
  }

  const handleActionCancel = () => {
    if (currentAction) {
      console.log('用户取消了操作')
      sendActionResponse(currentAction.data, 'cancelled')
    }
    setShowActionDialog(false)
    setCurrentAction(null)
  }

  const sendActionResponse = async (actionId: any, response: string) => {
    try {
      await postRequest('/admin-api/ai/chat/action-response', {
        actionId: actionId,
        response: response
      })
    } catch (e) {
      console.error('发送action响应失败:', e)
    }
  }

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  const clearChat = () => {
    setChatContent('')
    setWarnings([])
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>AI Action Stream Demo</CardTitle>
          <p className="text-sm text-muted-foreground">
            测试AI在流式输出过程中主动发送action指令，触发前端弹窗等交互
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 警告信息显示区域 */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.map((warning, index) => (
                <Alert key={index}>
                  <AlertDescription>{warning}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* 聊天内容显示区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI 回复</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 w-full border rounded-md p-4">
                <div className="whitespace-pre-wrap font-mono text-sm">
                  {chatContent || '等待AI回复...'}
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1">|</span>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* 输入区域 */}
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="输入消息 (试试: '删除数据', '天气查询', '重要信息')"
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={isStreaming}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={isStreaming || !message.trim()}
            >
              {isStreaming ? '发送中...' : '发送'}
            </Button>
            {isStreaming && (
              <Button variant="outline" onClick={stopStreaming}>
                停止
              </Button>
            )}
            <Button variant="outline" onClick={clearChat}>
              清空
            </Button>
          </div>

          {/* 测试按钮 */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setMessage('你好，今天天气怎么样？')}
              disabled={isStreaming}
            >
              普通消息
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setMessage('我想删除所有的用户数据')}
              disabled={isStreaming}
            >
              触发确认弹窗
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setMessage('这是一个重要的信息')}
              disabled={isStreaming}
            >
              触发警告信息
            </Button>
          </div>

          {/* 使用说明 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">使用说明</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>功能特点：</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>AI可以在流式输出过程中主动发送action指令</li>
                <li>前端监听action并触发相应的UI交互（弹窗、警告等）</li>
                <li>支持用户确认/取消操作，并将结果反馈给后端</li>
                <li>实时显示AI生成的文本内容</li>
              </ul>
              <p><strong>测试建议：</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>输入包含"删除"、"清空"等敏感词汇的消息，AI会智能判断并触发确认弹窗</li>
                <li>触发action时，聊天框只显示"💡 AI触发了xxx提醒"，具体内容在弹窗中</li>
                <li>普通消息只会进行常规的流式文本输出</li>
                <li>AI会根据上下文语义自主决定是否需要弹窗，无硬编码规则</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Action确认对话框 */}
      <AlertDialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{currentAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {currentAction?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleActionCancel}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleActionConfirm}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
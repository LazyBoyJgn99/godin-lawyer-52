"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useChatStore } from "@/store/chat-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Plus, Trash2 } from "lucide-react"
import { aiApi, type ChatConversation } from "@/api/ai/ai-api"

export function ChatList() {
  const router = useRouter()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Mock案件标签数据
  const mockCaseTags = [
    "劳动纠纷", "房产纠纷", "合同违约", "交通事故", "婚姻家庭",
    "债务纠纷", "知识产权", "刑事辩护", "行政诉讼", "公司法务",
    "消费维权", "医疗纠纷", "工伤赔偿", "离婚财产", "继承纠纷",
    "邻里纠纷", "网络侵权", "保险理赔", "股权纠纷", "租赁合同"
  ]

  // 根据对话ID生成固定的随机标签
  const getCaseTag = (conversationId: string) => {
    // 使用ID的哈希值确保同一对话总是显示相同标签
    let hash = 0
    for (let i = 0; i < conversationId.length; i++) {
      const char = conversationId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转为32位整数
    }
    const index = Math.abs(hash) % mockCaseTags.length
    return mockCaseTags[index]
  }

  const loadConversationsList = async () => {
    try {
      const response = await aiApi.getConversations()
      setConversations(response.data || [])
    } catch (error) {
      console.error('加载对话列表失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadConversationsList()
  }, [])

  const handleStartChat = async () => {
    try {
      // 使用POST /chatConversation/addChatConversation接口创建新对话
      console.log('创建新对话...')
      const response = await aiApi.createConversation()
      
      if (response.data && response.data.id) {
        const newConversationId = response.data.id
        console.log('获取到新对话ID:', newConversationId)
        // 跳转到新对话页面
        router.push(`/chat/${newConversationId}`)
      } else {
        throw new Error('创建对话失败：未返回对话ID')
      }
      
    } catch (error) {
      console.error('创建新对话失败:', error)
      // 可以显示错误提示给用户
      alert('创建新对话失败，请稍后重试')
    }
  }

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await aiApi.deleteConversation(conversationId)
      // 重新加载对话列表
      loadConversationsList()
    } catch (error) {
      console.error('删除对话失败:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-blue-50">
        <div className="w-32 h-32 mb-6 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
            <div className="w-16 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-gray-600 text-center mb-8 px-4">您还没有咨询的案件，我可以帮助你解决...</p>
        <Button onClick={handleStartChat} className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full">
          开始对话
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 space-y-3">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => router.push(`/chat/${conversation.id}`)}
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-medium text-gray-900 truncate">{conversation.title}</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">{new Date(conversation.lastMessageTime).toLocaleDateString()}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      onClick={(e) => handleDeleteConversation(conversation.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Badge variant="secondary" className="mb-2 text-xs">
                  {getCaseTag(conversation.id)}
                </Badge>
                <p className="text-sm text-gray-600 truncate">点击开始法律咨询...</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4">
        <Button
          onClick={handleStartChat}
          className="bg-blue-500 hover:bg-blue-600 rounded-full w-14 h-14 shadow-lg"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}

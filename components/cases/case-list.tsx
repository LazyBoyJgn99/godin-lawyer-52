"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { aiApi, type ChatConversation } from "@/api/ai/ai-api"

interface Case {
  id: string
  title: string
  categories: string[]
  createdTime: string
  progress: number
  materialCount: number
  totalMaterials: number
}

export function CaseList() {
  const router = useRouter()
  const [cases, setCases] = useState<Case[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mock分类数据池
  const mockCategories = [
    ["合同纠纷", "劳动仲裁"],
    ["遗产纠纷", "婚姻家庭"],
    ["房产纠纷", "物业纠纷"],
    ["交通事故", "人身损害"],
    ["知识产权", "版权纠纷"],
    ["债务纠纷", "借贷纠纷"],
    ["劳动纠纷", "工伤赔偿"],
    ["消费维权", "产品质量"],
    ["医疗纠纷", "医疗事故"],
    ["刑事辩护", "刑事诉讼"],
    ["行政诉讼", "行政复议"],
    ["公司法务", "股权纠纷"]
  ]

  // 根据对话ID生成固定的mock数据
  const generateMockCaseData = (conversationId: string, index: number) => {
    // 使用ID的哈希值确保同一对话总是显示相同的mock数据
    let hash = 0
    for (let i = 0; i < conversationId.length; i++) {
      const char = conversationId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    
    const categoryIndex = Math.abs(hash + index) % mockCategories.length
    const progress = 20 + (Math.abs(hash) % 70) // 20-89%的进度
    const materialCount = 1 + (Math.abs(hash + index * 3) % 8) // 1-8个材料
    const totalMaterials = materialCount + (Math.abs(hash + index * 5) % 8) // 总材料数
    
    return {
      categories: mockCategories[categoryIndex],
      progress,
      materialCount,
      totalMaterials
    }
  }

  // 加载对话列表
  useEffect(() => {
    const loadCases = async () => {
      try {
        setIsLoading(true)
        const response = await aiApi.getConversations()
        
        if (response.data && Array.isArray(response.data)) {
          const casesData: Case[] = response.data.map((conversation: ChatConversation, index: number) => {
            const mockData = generateMockCaseData(conversation.id, index)
            
            return {
              id: conversation.id,
              title: conversation.title || "AI法律咨询案件",
              categories: mockData.categories,
              createdTime: conversation.createdTime,
              progress: mockData.progress,
              materialCount: mockData.materialCount,
              totalMaterials: mockData.totalMaterials
            }
          })
          
          setCases(casesData)
        } else {
          setCases([])
        }
      } catch (error) {
        console.error('加载案件列表失败:', error)
        setError('加载案件列表失败，请稍后重试')
      } finally {
        setIsLoading(false)
      }
    }

    loadCases()
  }, [])

  // 格式化时间显示
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    } catch (error) {
      return dateString
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">加载案件列表中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-blue-500 hover:text-blue-700"
          >
            重新加载
          </button>
        </div>
      </div>
    )
  }

  if (cases.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="mb-2">暂无案件</p>
          <p className="text-sm">开始AI法律咨询后，案件将显示在这里</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {cases.map((caseItem) => (
        <div
          key={caseItem.id}
          onClick={() => router.push(`/chat/${caseItem.id}`)}
          className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-medium text-gray-900 mb-3">{caseItem.title}</h3>

          <div className="flex flex-wrap gap-2 mb-3">
            {caseItem.categories.map((category, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {category}
              </Badge>
            ))}
          </div>

          <p className="text-sm text-gray-500 mb-4">案件创建时间：{formatDate(caseItem.createdTime)}</p>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">完成度</span>
              <span className="text-sm text-gray-600">材料</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <span className="text-2xl font-bold text-gray-900">{caseItem.progress}%</span>
                <Progress value={caseItem.progress} className="w-20" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {caseItem.materialCount}/{caseItem.totalMaterials}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

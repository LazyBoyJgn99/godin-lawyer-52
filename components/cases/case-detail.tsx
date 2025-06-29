"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Eye, Trash2, Plus } from "lucide-react"

interface CaseDetailProps {
  caseId: string
}

interface Document {
  id: string
  name: string
  type: string
  size?: string
  count?: number
}

interface DocumentGroup {
  id: string
  title: string
  type: "word" | "image" | "upload"
  documents: Document[]
  fileCount: number
}

export function CaseDetail({ caseId }: CaseDetailProps) {
  const [documentGroups] = useState<DocumentGroup[]>([
    {
      id: "1",
      title: "《起诉状》文件标题文件标题文件标题文件标题...",
      type: "word",
      documents: [
        { id: "1", name: "yyy.docx", type: "docx" },
        { id: "2", name: "yyy.docx", type: "docx" },
        { id: "3", name: "yyy.docx", type: "docx" },
        { id: "4", name: "yyy.docx", type: "docx" },
      ],
      fileCount: 3,
    },
    {
      id: "2",
      title: "照片证据文件标题文件标题题文件标题聊天记录...",
      type: "image",
      documents: [
        { id: "5", name: "xxxx.jpg", type: "jpg" },
        { id: "6", name: "xxxx.jpg", type: "jpg" },
        { id: "7", name: "xxxx.jpg", type: "jpg" },
      ],
      fileCount: 8,
    },
  ])

  const handleContinueSupplementing = () => {
    // 继续补充材料
    console.log("继续补充材料")
  }

  const handleEnterChat = () => {
    // 进入对话
    console.log("进入对话")
  }

  return (
    <div className="p-4 space-y-6">
      {/* Case Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-3">企业违法裁员，拒绝给予赔偿金</h1>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary">合同纠纷</Badge>
          <Badge variant="secondary">劳动仲裁民事纠纷</Badge>
          <Badge variant="secondary">劳动仲裁民事纠纷</Badge>
        </div>

        <p className="text-sm text-gray-500 mb-4">案件创建时间：2025-05-21</p>

        {/* Progress */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">完成度</span>
            <span className="text-sm text-gray-600">材料</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <span className="text-3xl font-bold text-gray-900">70%</span>
              <Progress value={70} className="w-24" />
            </div>
            <span className="text-3xl font-bold text-gray-900">6/12</span>
          </div>
        </div>
      </div>

      {/* Document Groups */}
      <div className="space-y-4">
        {documentGroups.map((group) => (
          <Card key={group.id} className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3 mb-4">
                <div
                  className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                    group.type === "word" ? "bg-blue-500" : "bg-red-500"
                  }`}
                >
                  <span className="text-white text-sm font-medium">{group.type === "word" ? "Word" : "IMG"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-gray-900 mb-1">{group.title}</h3>
                  <p className="text-sm text-gray-500">文件数量：{group.fileCount}</p>
                </div>
              </div>

              {/* Document List */}
              <div className="space-y-2 mb-4">
                {group.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-700">{doc.name}</span>
                    <div className="flex space-x-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <Button variant="ghost" size="sm" className="text-gray-600">
                  <Eye className="h-4 w-4 mr-1" />
                  对外展示
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-600">
                  <Trash2 className="h-4 w-4 mr-1" />
                  清除文件
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-600">
                  <Plus className="h-4 w-4 mr-1" />
                  添加文件
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Upload Areas */}
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Plus className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-1">工资流水</h3>
            <p className="text-sm text-gray-500">待上传</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Plus className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-1">聊天记录文件标题文件标题题文件标题聊天记录...</h3>
            <p className="text-sm text-gray-500">待上传</p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <Button
          onClick={handleContinueSupplementing}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-full"
        >
          继续补充材料
        </Button>
      </div>
    </div>
  )
}

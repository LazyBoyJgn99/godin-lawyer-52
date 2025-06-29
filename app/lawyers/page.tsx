"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, Phone, Mail, MapPin, ArrowLeft, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface LawyerInfo {
  id: string
  name: string
  avatar: string
  specialties: string[]
  rating: number
  reviewCount: number
  experience: string
  phone: string
  email: string
  address: string
  description: string
}

const mockLawyers: LawyerInfo[] = [
  {
    id: "1",
    name: "张建华",
    avatar: "",
    specialties: ["劳动纠纷", "合同纠纷"],
    rating: 4.8,
    reviewCount: 156,
    experience: "执业15年",
    phone: "13812345678",
    email: "zhang.jianhua@lawfirm.com",
    address: "北京市朝阳区建国门外大街1号",
    description: "专注于劳动法和合同法领域，具有丰富的诉讼和仲裁经验。"
  },
  {
    id: "2",
    name: "李晓芳",
    avatar: "",
    specialties: ["婚姻家庭", "房产纠纷"],
    rating: 4.9,
    reviewCount: 203,
    experience: "执业12年",
    phone: "13987654321",
    email: "li.xiaofang@lawfirm.com",
    address: "上海市浦东新区陆家嘴环路1000号",
    description: "在婚姻家庭法和房地产法方面经验丰富，善于处理复杂案件。"
  },
  {
    id: "3",
    name: "王志强",
    avatar: "",
    specialties: ["刑事辩护", "经济犯罪"],
    rating: 4.7,
    reviewCount: 89,
    experience: "执业18年",
    phone: "13665544332",
    email: "wang.zhiqiang@lawfirm.com",
    address: "广州市天河区珠江新城华夏路1号",
    description: "刑事辩护专家，在经济犯罪案件方面有着出色的辩护记录。"
  },
  {
    id: "4",
    name: "陈美玲",
    avatar: "",
    specialties: ["知识产权", "公司法务"],
    rating: 4.8,
    reviewCount: 134,
    experience: "执业10年",
    phone: "13778899001",
    email: "chen.meiling@lawfirm.com",
    address: "深圳市南山区科技园南区科苑路1001号",
    description: "专业从事知识产权保护和公司法务咨询，为多家知名企业提供法律服务。"
  },
  {
    id: "5",
    name: "刘德华",
    avatar: "",
    specialties: ["交通事故", "人身损害"],
    rating: 4.6,
    reviewCount: 78,
    experience: "执业8年",
    phone: "13556677889",
    email: "liu.dehua@lawfirm.com",
    address: "成都市锦江区红星路二段70号",
    description: "专业处理交通事故和人身损害赔偿案件，维护当事人合法权益。"
  },
  {
    id: "6",
    name: "周雪梅",
    avatar: "",
    specialties: ["公司破产", "债权债务"],
    rating: 4.9,
    reviewCount: 167,
    experience: "执业20年",
    phone: "13443322110",
    email: "zhou.xuemei@lawfirm.com",
    address: "杭州市西湖区文三路398号",
    description: "在公司重组、破产清算和债务重组方面具有丰富经验。"
  }
]

export default function LawyersPage() {
  const router = useRouter()
  const [selectedLawyer, setSelectedLawyer] = useState<LawyerInfo | null>(null)
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false)

  const handleContactLawyer = (lawyer: LawyerInfo) => {
    setSelectedLawyer(lawyer)
    setIsContactDialogOpen(true)
  }

  const renderStars = (rating: number) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${
            i <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
          }`}
        />
      )
    }
    return stars
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">律师匹配</h1>
              <p className="text-sm text-gray-600">为您推荐专业律师</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lawyers List */}
      <div className="p-4 space-y-4">
        {mockLawyers.map((lawyer) => (
          <Card key={lawyer.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <Avatar className="w-16 h-16">
                  <AvatarImage src={lawyer.avatar} alt={lawyer.name} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                    {lawyer.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                {/* Lawyer Info */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{lawyer.name}</h3>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        {renderStars(lawyer.rating)}
                        <span className="text-sm text-gray-600 ml-1">
                          {lawyer.rating} ({lawyer.reviewCount})
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{lawyer.experience}</p>
                  
                  {/* Specialties */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {lawyer.specialties.map((specialty, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {specialty}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                    {lawyer.description}
                  </p>

                  {/* Contact Button */}
                  <Button
                    onClick={() => handleContactLawyer(lawyer)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    联系律师
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center">联系律师</DialogTitle>
          </DialogHeader>
          
          {selectedLawyer && (
            <div className="space-y-4">
              {/* Lawyer Info */}
              <div className="flex items-center gap-3 pb-4 border-b">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedLawyer.avatar} alt={selectedLawyer.name} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                    {selectedLawyer.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedLawyer.name}</h3>
                  <p className="text-sm text-gray-600">{selectedLawyer.experience}</p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">电话</p>
                    <p className="font-medium">{selectedLawyer.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">邮箱</p>
                    <p className="font-medium">{selectedLawyer.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">地址</p>
                    <p className="font-medium">{selectedLawyer.address}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => {
                    // 这里可以添加拨打电话的逻辑
                    window.open(`tel:${selectedLawyer.phone}`)
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  立即致电
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
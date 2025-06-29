'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Download, FileText, Loader2, Eye } from 'lucide-react'
import jsPDF from 'jspdf'
// 如果需要中文支持，可以使用html2canvas配合jsPDF
import html2canvas from 'html2canvas'

export default function DemoPdfPage() {
  const [content, setContent] = useState(`合同协议书

甲方：张三
乙方：李四

根据《中华人民共和国合同法》及相关法律法规，甲乙双方本着平等、自愿、公平、诚实信用的原则，就以下事项达成协议：

一、合同标的
本合同约定的服务内容为法律咨询服务，包括但不限于：
1. 提供法律意见和建议
2. 起草、审查法律文件
3. 协助处理法律事务

二、合同期限
本合同自2024年1月1日起至2024年12月31日止。

三、费用及支付方式
1. 服务费用总计：人民币10,000元整
2. 支付方式：签约后7日内一次性付清

四、双方权利义务
甲方义务：
- 按时支付服务费用
- 提供真实、完整的相关资料

乙方义务：
- 提供专业、优质的法律服务
- 保守甲方商业秘密

五、违约责任
任何一方违约，应承担相应的法律责任。

六、争议解决
因本合同发生的争议，双方应友好协商解决；协商不成的，提交有管辖权的人民法院诉讼解决。

七、其他条款
本合同一式两份，甲乙双方各执一份，具有同等法律效力。

甲方签字：_________________ 日期：_________________

乙方签字：_________________ 日期：_________________`)

  const [fileName, setFileName] = useState('合同协议书')
  const [fontSize, setFontSize] = useState('14')
  const [pageMargin, setPageMargin] = useState('20')
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)

  // 生成PDF（支持中文）
  const generatePDF = async () => {
    if (!contentRef.current) return
    
    setIsGenerating(true)
    
    try {
      // 使用html2canvas将HTML内容转换为图片
      const canvas = await html2canvas(contentRef.current, {
        scale: 2, // 提高清晰度
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })
      
      const imgData = canvas.toDataURL('image/png')
      
      // 创建PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = parseInt(pageMargin)
      
      // 计算图片在PDF中的尺寸
      const imgWidth = pageWidth - 2 * margin
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      // 如果内容超过一页，需要分页处理
      const maxPageHeight = pageHeight - 2 * margin
      let currentHeight = 0
      let pageNum = 1
      
      while (currentHeight < imgHeight) {
        if (pageNum > 1) {
          pdf.addPage()
        }
        
        // 计算当前页要显示的图片部分
        const remainingHeight = imgHeight - currentHeight
        const pageImgHeight = Math.min(maxPageHeight, remainingHeight)
        
        // 在canvas上截取当前页的部分
        const pageCanvas = document.createElement('canvas')
        const pageCtx = pageCanvas.getContext('2d')!
        
        pageCanvas.width = canvas.width
        pageCanvas.height = (pageImgHeight / imgWidth) * canvas.width
        
        pageCtx.drawImage(
          canvas,
          0, (currentHeight / imgWidth) * canvas.width,
          canvas.width, pageCanvas.height,
          0, 0,
          canvas.width, pageCanvas.height
        )
        
        const pageImgData = pageCanvas.toDataURL('image/png')
        pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, pageImgHeight)
        
        // 添加页脚
        pdf.setFontSize(8)
        pdf.text(`第 ${pageNum} 页`, pageWidth / 2, pageHeight - 5, { align: 'center' })
        
        currentHeight += pageImgHeight
        pageNum++
      }
      
      // 生成预览URL
      const pdfBlob = pdf.output('blob')
      const url = URL.createObjectURL(pdfBlob)
      setPreviewUrl(url)
      
    } catch (error) {
      console.error('生成PDF失败:', error)
      alert('生成PDF失败，请稍后再试')
    } finally {
      setIsGenerating(false)
    }
  }

  // 下载PDF
  const downloadPDF = async () => {
    if (!contentRef.current) return
    
    setIsGenerating(true)
    
    try {
      // 使用html2canvas将HTML内容转换为图片
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })
      
      // 创建PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = parseInt(pageMargin)
      
      // 计算图片在PDF中的尺寸
      const imgWidth = pageWidth - 2 * margin
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      // 分页处理
      const maxPageHeight = pageHeight - 2 * margin
      let currentHeight = 0
      let pageNum = 1
      
      while (currentHeight < imgHeight) {
        if (pageNum > 1) {
          pdf.addPage()
        }
        
        const remainingHeight = imgHeight - currentHeight
        const pageImgHeight = Math.min(maxPageHeight, remainingHeight)
        
        // 在canvas上截取当前页的部分
        const pageCanvas = document.createElement('canvas')
        const pageCtx = pageCanvas.getContext('2d')!
        
        pageCanvas.width = canvas.width
        pageCanvas.height = (pageImgHeight / imgWidth) * canvas.width
        
        pageCtx.drawImage(
          canvas,
          0, (currentHeight / imgWidth) * canvas.width,
          canvas.width, pageCanvas.height,
          0, 0,
          canvas.width, pageCanvas.height
        )
        
        const pageImgData = pageCanvas.toDataURL('image/png')
        pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, pageImgHeight)
        
        // 添加页脚
        pdf.setFontSize(8)
        pdf.text(`第 ${pageNum} 页`, pageWidth / 2, pageHeight - 5, { align: 'center' })
        
        currentHeight += pageImgHeight
        pageNum++
      }
      
      // 下载PDF
      pdf.save(`${fileName || '文档'}.pdf`)
      
    } catch (error) {
      console.error('下载PDF失败:', error)
      alert('下载PDF失败，请稍后再试')
    } finally {
      setIsGenerating(false)
    }
  }

  // 清空预览
  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  // 插入模板
  const insertTemplate = (template: string) => {
    const templates = {
      contract: `劳动合同

甲方（用人单位）：_______________
乙方（员工）：_______________

根据《中华人民共和国劳动法》及相关法律法规，甲乙双方本着平等自愿、协商一致的原则，签订本劳动合同。

一、合同期限
本合同为固定期限劳动合同，期限为_____年，自_____年_____月_____日起至_____年_____月_____日止。

二、工作内容和工作地点
1. 乙方从事_____岗位工作
2. 工作地点：_____

三、工作时间和休息休假
实行标准工时制，每日工作8小时，每周工作40小时。

四、劳动报酬
乙方月工资为人民币_____元。

五、社会保险
甲方依法为乙方缴纳社会保险费。

甲方（盖章）：_______________ 日期：_______________
乙方（签字）：_______________ 日期：_______________`,

      agreement: `协议书

甲方：_______________
乙方：_______________

经甲乙双方友好协商，就_____事宜达成如下协议：

一、协议内容
_____

二、双方权利义务
甲方：
1. _____
2. _____

乙方：
1. _____
2. _____

三、协议期限
本协议自签署之日起生效，有效期至_____年_____月_____日。

四、违约责任
_____

五、争议解决
本协议履行过程中发生争议，双方应友好协商解决。

甲方：_______________ 日期：_______________
乙方：_______________ 日期：_______________`,

      letter: `律师函

致：_______________

我们是_____律师事务所，受_____委托，现就_____事宜致函如下：

一、基本情况
_____

二、法律分析
_____

三、我方要求
_____

四、法律后果
如您在收到本函后_____日内未予回复或未采取相应措施，我方将代表委托人通过法律途径解决此事，由此产生的一切法律后果由您承担。

特此函告。

_____律师事务所
_____律师
_____年_____月_____日`
    }

    setContent(templates[template as keyof typeof templates] || '')
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">PDF文档生成器</h1>
        <p className="text-muted-foreground">将文字内容转换为PDF文档并支持下载</p>
      </div>

      {/* 隐藏的HTML内容区域，用于生成PDF */}
      <div 
        ref={contentRef}
        className="fixed top-[-9999px] left-[-9999px] w-[210mm] bg-white"
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: '1.5',
          fontFamily: '"Helvetica Neue", Arial, "Microsoft YaHei", "SimSun", sans-serif',
          color: '#000000',
          padding: `${pageMargin}mm`
        }}
      >
        <div className="whitespace-pre-wrap">
          {content}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：编辑区域 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                文档设置
              </CardTitle>
              <CardDescription>
                配置PDF文档的基本信息和格式
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fileName">文件名</Label>
                  <Input
                    id="fileName"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="输入文件名"
                  />
                </div>
                <div>
                  <Label htmlFor="fontSize">字体大小</Label>
                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10pt</SelectItem>
                      <SelectItem value="12">12pt</SelectItem>
                      <SelectItem value="14">14pt</SelectItem>
                      <SelectItem value="16">16pt</SelectItem>
                      <SelectItem value="18">18pt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="pageMargin">页边距 (mm)</Label>
                <Select value={pageMargin} onValueChange={setPageMargin}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15mm</SelectItem>
                    <SelectItem value="20">20mm</SelectItem>
                    <SelectItem value="25">25mm</SelectItem>
                    <SelectItem value="30">30mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>快速模板</CardTitle>
              <CardDescription>
                选择预设模板快速开始
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertTemplate('contract')}
                >
                  劳动合同
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertTemplate('agreement')}
                >
                  协议书
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertTemplate('letter')}
                >
                  律师函
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>文档内容</CardTitle>
              <CardDescription>
                输入要转换为PDF的文字内容
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请输入文档内容..."
                className="min-h-[400px] font-mono"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>字符数：{content.length}</span>
                <span>行数：{content.split('\n').length}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              onClick={generatePDF}
              disabled={!content.trim() || isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              生成预览
            </Button>
            <Button
              onClick={downloadPDF}
              disabled={!content.trim() || isGenerating}
              variant="outline"
              className="flex-1"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              直接下载
            </Button>
          </div>
        </div>

        {/* 右侧：预览区域 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>PDF预览</CardTitle>
              <CardDescription>
                预览生成的PDF文档效果
              </CardDescription>
            </CardHeader>
            <CardContent>
              {previewUrl ? (
                <div className="space-y-4">
                  <iframe
                    src={previewUrl}
                    className="w-full h-[600px] border rounded-lg"
                    title="PDF预览"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={downloadPDF}
                      disabled={isGenerating}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      下载此PDF
                    </Button>
                    <Button
                      onClick={clearPreview}
                      variant="outline"
                    >
                      清空预览
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-[600px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">暂无预览</p>
                    <p className="text-sm">点击"生成预览"查看PDF效果</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium mb-1">功能特点：</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>✅ 完全支持中文字体显示</li>
                  <li>📄 自动处理分页和页脚页码</li>
                  <li>🔧 支持自定义字体大小和页边距</li>
                  <li>📋 提供常用法律文档模板</li>
                  <li>👁️ 实时预览PDF效果</li>
                  <li>📱 响应式设计，支持移动端</li>
                </ul>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-1">使用步骤：</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>配置文件名和格式参数</li>
                  <li>输入文档内容或选择模板</li>
                  <li>点击"生成预览"查看PDF效果</li>
                  <li>确认无误后点击下载PDF文件</li>
                </ol>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-1">技术说明：</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>使用HTML2Canvas + jsPDF技术</li>
                  <li>支持完整的中文字符集</li>
                  <li>高清晰度PDF输出（2x缩放）</li>
                  <li>自动分页处理长文档</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
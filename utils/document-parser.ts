/**
 * 文书内容解析器
 * 处理不同格式的API返回数据，提取实际的文书内容
 */

interface DocumentData {
  content: string
  title?: string
  fileName?: string
  documentType?: string
  explanation?: string
}

/**
 * 解析文书响应数据
 * @param responseData API返回的数据
 * @returns 解析后的文书内容和相关信息
 */
export function parseDocumentResponse(responseData: any): DocumentData {
  let content = ''
  let title = ''
  let fileName = ''
  let documentType = ''
  let explanation = ''

  try {
    // 情况1: 直接是字符串内容
    if (typeof responseData === 'string') {
      return parseStringContent(responseData)
    }

    // 情况2: 对象格式，直接包含content字段
    if (responseData && typeof responseData === 'object' && responseData.content) {
      return {
        content: responseData.content,
        title: responseData.title || '法律文书',
        fileName: responseData.fileName || generateFileName(responseData.documentType || responseData.title),
        documentType: responseData.documentType,
        explanation: responseData.explanation
      }
    }

    // 情况3: 对象格式，需要提取data字段
    if (responseData && responseData.data) {
      return parseDocumentResponse(responseData.data)
    }

    // 情况4: 无法识别的格式，尝试转为字符串
    return parseStringContent(String(responseData))

  } catch (error) {
    console.error('文书解析失败:', error)
    return {
      content: '文书解析失败，请重新生成',
      title: '解析错误',
      fileName: '文书.docx'
    }
  }
}

/**
 * 解析字符串内容（可能包含JSON或markdown格式）
 */
function parseStringContent(content: string): DocumentData {
  // 去除首尾空白
  content = content.trim()

  // 情况1: 检查是否被markdown代码块包裹
  const markdownJsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/i)
  if (markdownJsonMatch) {
    try {
      const jsonData = JSON.parse(markdownJsonMatch[1])
      return parseDocumentResponse(jsonData)
    } catch (e) {
      console.warn('markdown包裹的JSON解析失败:', e)
    }
  }

  // 情况2: 检查是否是纯JSON格式
  if (content.startsWith('{') && content.endsWith('}')) {
    try {
      const jsonData = JSON.parse(content)
      return parseDocumentResponse(jsonData)
    } catch (e) {
      console.warn('JSON解析失败，当作纯文本处理:', e)
    }
  }

  // 情况3: 纯文本内容，直接返回
  const title = extractTitleFromContent(content)
  return {
    content: content,
    title: title || '法律文书',
    fileName: generateFileName(title)
  }
}

/**
 * 从文本内容中提取标题
 */
function extractTitleFromContent(content: string): string {
  // 尝试提取第一行作为标题
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length > 0) {
    const firstLine = lines[0].trim()
    
    // 如果第一行看起来像标题（比较短且没有太多标点符号）
    if (firstLine.length < 50 && !firstLine.includes('：') && !firstLine.includes('。')) {
      return firstLine
    }
  }

  // 尝试匹配常见的法律文书标题
  const titlePatterns = [
    /^(.*?起诉状)/m,
    /^(.*?申请书)/m,
    /^(.*?协议书)/m,
    /^(.*?合同)/m,
    /^(.*?判决书)/m,
    /^(.*?裁定书)/m,
    /^(.*?调解书)/m
  ]

  for (const pattern of titlePatterns) {
    const match = content.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return '法律文书'
}

/**
 * 根据文书类型或标题生成文件名
 */
function generateFileName(documentType?: string): string {
  if (!documentType) {
    return '法律文书.docx'
  }

  // 清理文件名，移除不合法的字符
  const cleanName = documentType
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .trim()

  return `${cleanName}.docx`
}

/**
 * 格式化文书内容用于显示
 */
export function formatDocumentForDisplay(content: string): string {
  return content
    .replace(/\\n/g, '\n')  // 处理转义的换行符
    .replace(/\n{3,}/g, '\n\n')  // 合并多余的空行
    .trim()
}

/**
 * 格式化文书内容用于下载
 */
export function formatDocumentForDownload(content: string): string {
  // 确保文档有适当的格式
  return formatDocumentForDisplay(content)
    .split('\n')
    .map(line => line.trim())
    .join('\n')
}
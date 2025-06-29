import type {ResponseModel} from '@/types/api'
import {deleteRequest, getRequest, postRequest, streamRequest} from '@/lib/http-client'

// AI聊天消息类型定义
export interface AiMessage {
  role: string // 角色: system, user, assistant
  content: string // 消息内容
}

// AI聊天请求参数
export interface ChatCompletionRequest {
  model?: string // 模型名称
  messages: AiMessage[] // 消息列表
  maxTokens?: number // 最大令牌数
  temperature?: number // 温度参数
  stream?: boolean // 是否流式输出
  streamOptions?: {
    includeUsage?: boolean // 是否包含使用统计
  }
}

// AI聊天使用统计
export interface ChatUsage {
  promptTokens: number // 输入令牌数
  completionTokens: number // 输出令牌数
  totalTokens: number // 总令牌数
}

// AI聊天选择项
export interface ChatChoice {
  index: number // 选择项索引
  message: AiMessage // 消息内容
  finishReason: string // 完成原因
}

// AI聊天响应
export interface ChatCompletionResponse {
  id: string // 请求ID
  model: string // 使用的模型
  created: number // 创建时间戳
  choices: ChatChoice[] // 选择项列表
  usage: ChatUsage // 使用统计
}

// AI聊天流式响应
export interface ChatCompletionStreamResponse {
  id: string // 请求ID
  model: string // 使用的模型
  created: number // 创建时间戳
  choices: Array<{
    index: number
    delta: {
      role?: string
      content?: string
      action?: ActionData
    }
    finishReason?: string
  }>
  usage?: ChatUsage // 使用统计
  conversation_id?: string // 会话ID（后端返回字段名）
  conversationId?: string // 会话ID（兼容性字段）
  messageId?: string // 消息ID
}

// Action数据结构
export interface ActionData {
  type: string // action类型: dialog, warning, info等
  title: string // 标题
  message: string // 消息内容
  data?: any // 附加数据
}

// 图片分析参数
export interface ImageAnalyzeParam {
  file: File // 图片文件
  message?: string // 分析提示信息
}

// 简单消息参数
export interface SimpleMessageParam {
  message: string // 消息内容
}

// 律师AI聊天请求参数
export interface LawyerChatRequest {
  message: string // 用户消息
  conversationId?: string // 会话ID，可选
}

// 律师AI聊天响应
export interface LawyerChatResponse {
  content: string // AI回复内容
  model: string // 使用的模型
  conversationId: string // 会话ID
}

// 律师AI V2聊天请求参数
export interface LawyerChatV2Request {
  message: string // 用户消息
  conversationId?: string // 会话ID，可选
  model?: string // AI模型名称，可选
}

// 律师AI V2聊天响应
export interface LawyerChatV2Response {
  content: string // AI回复内容
  model: string // 使用的模型
  conversationId: string // 会话ID
  supportedFeatures: string[] // 该模型支持的功能列表
}

// 模型信息
export interface ModelInfo {
  modelName: string // 模型名称（用于API调用）
  displayName: string // 显示名称
  description: string // 模型描述
  features: string[] // 支持的功能列表
  isDefault: boolean // 是否为默认模型
}

// 对话信息
export interface ChatConversation {
  id: string // 对话ID
  userId: string // 用户ID
  title: string // 对话标题
  createdTime: string // 创建时间
  lastMessageTime: string // 最后消息时间
  status: number // 状态
}

// 对话消息
export interface ConversationMessage {
  role: string // 角色 user/assistant
  content: string // 消息内容
  timestamp: number // 消息时间戳
  messageId?: string // 消息ID
}

// 对话详情响应
export interface LawyerConversationDetailResponse {
  conversation: ChatConversation // 对话基本信息
  messages: ConversationMessage[] // 对话消息列表
}

export const aiApi = {
  // 基础聊天接口
  chat: (param: SimpleMessageParam): Promise<ResponseModel<ChatCompletionResponse>> => {
    const formData = new FormData()
    formData.append('message', param.message)
    return postRequest<ResponseModel<ChatCompletionResponse>, FormData>('/admin-api/ai/chat', formData)
  },

  // 流式聊天接口 (返回ReadableStreamDefaultReader用于SSE)
  chatStream: async (param: SimpleMessageParam): Promise<ReadableStreamDefaultReader<Uint8Array> | null> => {
    const formData = new FormData()
    formData.append('message', param.message)
    return streamRequest('/admin-api/ai/chat/stream', formData)
  },

  // 图片分析接口
  analyzeImage: (param: ImageAnalyzeParam): Promise<ResponseModel<ChatCompletionResponse>> => {
    const formData = new FormData()
    formData.append('file', param.file)
    formData.append('message', param.message || '分析内容并提取关键信息')
    return postRequest<ResponseModel<ChatCompletionResponse>, FormData>('/admin-api/ai/image/analyze', formData)
  },

  // 图片分析流式接口
  analyzeImageStream: async (param: ImageAnalyzeParam): Promise<ReadableStreamDefaultReader<Uint8Array> | null> => {
    const formData = new FormData()
    formData.append('file', param.file)
    formData.append('message', param.message || '分析内容并提取关键信息')
    return streamRequest('/admin-api/ai/image/analyze/stream', formData)
  },

  // 工具调用聊天接口
  chatWithTools: (param: SimpleMessageParam): Promise<ResponseModel<string>> => {
    const formData = new FormData()
    formData.append('message', param.message)
    return postRequest<ResponseModel<string>, FormData>('/admin-api/ai/chat/tools', formData)
  },

  // 全工具聊天接口
  chatWithAllTools: (param: SimpleMessageParam): Promise<ResponseModel<string>> => {
    const formData = new FormData()
    formData.append('message', param.message)
    return postRequest<ResponseModel<string>, FormData>('/admin-api/ai/chat/all-tools', formData)
  },

  // 天气工具聊天接口
  chatWithWeatherTool: (param: SimpleMessageParam): Promise<ResponseModel<string>> => {
    const formData = new FormData()
    formData.append('message', param.message)
    return postRequest<ResponseModel<string>, FormData>('/admin-api/ai/chat/weather', formData)
  },

  // 计算器工具聊天接口
  chatWithCalculatorTool: (param: SimpleMessageParam): Promise<ResponseModel<string>> => {
    const formData = new FormData()
    formData.append('message', param.message)
    return postRequest<ResponseModel<string>, FormData>('/admin-api/ai/chat/calculator', formData)
  },

  // Farui Plus模型聊天接口
  chatWithFaruiTools: (param: SimpleMessageParam): Promise<ResponseModel<string>> => {
    const formData = new FormData()
    formData.append('message', param.message)
    return postRequest<ResponseModel<string>, FormData>('/admin-api/ai/chat/farui-tools', formData)
  },

  // Farui Plus模型普通调用demo
  demoFaruiNormal: (param: SimpleMessageParam): Promise<ResponseModel<ChatCompletionResponse>> => {
    const formData = new FormData()
    formData.append('message', param.message)
    return postRequest<ResponseModel<ChatCompletionResponse>, FormData>('/admin-api/ai/demo/farui-normal', formData)
  },

  // Farui Plus模型流式调用demo
  demoFaruiStream: async (param: SimpleMessageParam): Promise<ReadableStreamDefaultReader<Uint8Array> | null> => {
    const formData = new FormData()
    formData.append('message', param.message)
    return streamRequest('/admin-api/ai/demo/farui-stream', formData)
  },

  // 律师AI聊天接口 - 非流式
  lawyerChat: (param: LawyerChatRequest): Promise<ResponseModel<LawyerChatResponse>> => {
    return postRequest<ResponseModel<LawyerChatResponse>, LawyerChatRequest>('/admin-api/lawyer-ai/chat', param)
  },

  // 律师AI聊天接口 - 流式
  lawyerChatStream: async (param: LawyerChatRequest): Promise<ReadableStreamDefaultReader<Uint8Array> | null> => {
    return streamRequest('/admin-api/lawyer-ai/chat/stream', JSON.stringify(param))
  },

  // 获取对话历史列表
  getConversations: (): Promise<ResponseModel<ChatConversation[]>> => {
    return getRequest<ResponseModel<ChatConversation[]>>('/admin-api/lawyer-ai/conversations')
  },

  // 获取指定对话的详细信息
  getConversationDetail: (conversationId: string): Promise<ResponseModel<LawyerConversationDetailResponse>> => {
    return getRequest<ResponseModel<LawyerConversationDetailResponse>>(`/admin-api/lawyer-ai/conversations/${conversationId}`)
  },

  // 创建新对话
  createConversation: (): Promise<ResponseModel<{ id: string }>> => {
    return postRequest<ResponseModel<{ id: string }>, {}>('/chatConversation/addChatConversation', {})
  },

  // 删除指定对话
  deleteConversation: (conversationId: string): Promise<ResponseModel<string>> => {
    return deleteRequest<ResponseModel<string>>(`/admin-api/lawyer-ai/conversations/${conversationId}`)
  },

  // ============= 律师AI V2接口 =============
  
  // 律师AI V2聊天接口 - 非流式
  lawyerChatV2: (param: LawyerChatV2Request): Promise<ResponseModel<LawyerChatV2Response>> => {
    return postRequest<ResponseModel<LawyerChatV2Response>, LawyerChatV2Request>('/admin-api/lawyer-ai-v2/chat', param)
  },

  // 律师AI V2聊天接口 - 流式
  lawyerChatV2Stream: async (param: LawyerChatV2Request): Promise<ReadableStreamDefaultReader<Uint8Array> | null> => {
    return streamRequest('/admin-api/lawyer-ai-v2/chat/stream', JSON.stringify(param))
  },

  // 获取V2支持的模型列表
  getV2Models: (): Promise<ResponseModel<ModelInfo[]>> => {
    return getRequest<ResponseModel<ModelInfo[]>>('/admin-api/lawyer-ai-v2/models')
  },

  // 获取V2对话历史列表
  getV2Conversations: (): Promise<ResponseModel<ChatConversation[]>> => {
    return getRequest<ResponseModel<ChatConversation[]>>('/admin-api/lawyer-ai-v2/conversations')
  },

  // 获取V2指定对话的详细信息
  getV2ConversationDetail: (conversationId: string): Promise<ResponseModel<LawyerConversationDetailResponse>> => {
    return getRequest<ResponseModel<LawyerConversationDetailResponse>>(`/admin-api/lawyer-ai-v2/conversations/${conversationId}`)
  },

  // 删除V2指定对话
  deleteV2Conversation: (conversationId: string): Promise<ResponseModel<string>> => {
    return deleteRequest<ResponseModel<string>>(`/admin-api/lawyer-ai-v2/conversations/${conversationId}`)
  },

  // V2 Action响应
  sendV2ActionResponse: (param: { actionId: any, response: string, messageId: string | null }): Promise<ResponseModel<string>> => {
    return postRequest<ResponseModel<string>, any>('/admin-api/lawyer-ai-v2/action-response', param)
  },

  // 生成法律文书
  generateLegalDocument: (param: { conversationId: string, message: string }): Promise<ResponseModel<{ content: string, fileName?: string }>> => {
    return postRequest<ResponseModel<{ content: string, fileName?: string }>, { conversationId: string, message: string }>('/admin-api/legal-document/generate', param)
  },
}
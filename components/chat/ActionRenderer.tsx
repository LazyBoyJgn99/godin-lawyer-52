"use client"

import { PersonalInfoBubble } from "./personal-info-bubble"
import { UploadBubble } from "./upload-bubble"
import { DownloadBubble } from "./download-bubble"
import { ConfirmBubble } from "./confirm-bubble"
import { WarningBubble } from "./warning-bubble"
import { InfoBubble } from "./info-bubble"
import { ProgressBubble } from "./progress-bubble"
import { LawsuitBubble } from "./lawsuit-bubble"
import { FindLawyerBubble } from "./find-lawyer-bubble"
import type { ActionData } from "@/api/ai/ai-api"

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  actionData?: ActionData
  serverMessageId?: string
  actionStatus?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'uploaded' | 'downloading' | 'uploading' | 'downloaded'
  actionResponse?: string
  actionMetadata?: {
    fileUrl?: string
    fileName?: string
    fileSize?: number
    [key: string]: any
  }
}

interface ActionHandlers {
  onPersonalInfoConfirm: (actionData: ActionData, messageId: string) => void
  onPersonalInfoCancel: (actionData: ActionData, messageId: string) => void
  onUploadConfirm: (actionData: ActionData, messageId: string) => void
  onUploadCancel: (actionData: ActionData, messageId: string) => void
  onDownloadConfirm: (actionData: ActionData, messageId: string) => void
  onDownloadCancel: (actionData: ActionData, messageId: string) => void
  onConfirmAction: (actionData: ActionData, messageId: string) => void
  onCancelAction: (actionData: ActionData, messageId: string) => void
  onWarningAcknowledge: (actionData: ActionData, messageId: string) => void
  onInfoAcknowledge: (actionData: ActionData, messageId: string) => void
  onProgressViewDetails: (actionData: ActionData, messageId: string) => void
  onProgressFileLawsuit: () => void
  onProgressFindLawyer: () => void
  onLawsuitConfirm: () => void
  onLawsuitCancel: (actionData: ActionData, messageId: string) => void
  onFindLawyerConfirm: (actionData: ActionData, messageId: string) => void
  onFindLawyerCancel: (actionData: ActionData, messageId: string) => void
}

interface ActionRendererProps {
  message: ChatMessage
  handlers: ActionHandlers
  isGeneratingDocument?: boolean
}

export function ActionRenderer({ message, handlers, isGeneratingDocument = false }: ActionRendererProps) {
  const actionData = message.actionData
  if (!actionData) return null

  const messageId = message.serverMessageId || message.id
  const actionType = actionData.type

  switch (actionType) {
    case 'dialog':
    case 'personal_info':
      return (
        <PersonalInfoBubble
          title={actionData.title || "个人信息获取"}
          message={actionData.message || "我希望获取您的个人信息，您是否同意？"}
          onConfirm={() => handlers.onPersonalInfoConfirm(actionData, messageId)}
          onCancel={() => handlers.onPersonalInfoCancel(actionData, messageId)}
          status={message.actionStatus}
          responseMessage={message.actionResponse}
        />
      )

    case 'upload':
      return (
        <UploadBubble
          title={actionData.title || "文件上传"}
          message={actionData.message || "请上传相关文件"}
          onConfirm={() => handlers.onUploadConfirm(actionData, messageId)}
          onCancel={() => handlers.onUploadCancel(actionData, messageId)}
          status={message.actionStatus}
          responseMessage={message.actionResponse}
          fileUrl={message.actionMetadata?.fileUrl}
          fileName={message.actionMetadata?.fileName}
        />
      )

    case 'download':
      return (
        <DownloadBubble
          title={actionData.title || "文件下载"}
          message={actionData.message || "请下载相关文件"}
          onConfirm={() => handlers.onDownloadConfirm(actionData, messageId)}
          onCancel={() => handlers.onDownloadCancel(actionData, messageId)}
        />
      )

    case 'confirm':
      return (
        <ConfirmBubble
          title={actionData.title || "确认操作"}
          content={actionData.message || "您要执行的操作可能不可逆，确认继续吗？"}
          onConfirm={() => handlers.onConfirmAction(actionData, messageId)}
          onCancel={() => handlers.onCancelAction(actionData, messageId)}
        />
      )

    case 'warning':
      return (
        <WarningBubble
          title={actionData.title || "法律风险提醒"}
          content={actionData.message || "请注意相关法律风险"}
          onAcknowledge={() => handlers.onWarningAcknowledge(actionData, messageId)}
        />
      )

    case 'info':
      return (
        <InfoBubble
          title={actionData.title || "法律建议"}
          content={actionData.message || "以下是相关法律建议"}
          onAcknowledge={() => handlers.onInfoAcknowledge(actionData, messageId)}
        />
      )

    case 'progress':
      return (
        <ProgressBubble
          title={actionData.title || "案件进度"}
          content={actionData.message || "当前案件进度"}
          progress={actionData.data?.progress || actionData.progress || "0%"}
          material_progress={actionData.data?.material_progress || actionData.material_progress || "0/0"}
          onViewDetails={() => handlers.onProgressViewDetails(actionData, messageId)}
          onFileLawsuit={handlers.onProgressFileLawsuit}
          onFindLawyer={handlers.onProgressFindLawyer}
        />
      )

    case 'lawsuit':
      return (
        <LawsuitBubble
          title={actionData.title || "发起诉讼"}
          content={actionData.message || "根据您的材料生成诉讼文书"}
          onConfirm={handlers.onLawsuitConfirm}
          onCancel={() => handlers.onLawsuitCancel(actionData, messageId)}
          isGenerating={isGeneratingDocument}
        />
      )

    case 'find_lawyer':
      return (
        <FindLawyerBubble
          title={actionData.title || "找律师"}
          content={actionData.message || "为您匹配合适的律师"}
          onConfirm={() => handlers.onFindLawyerConfirm(actionData, messageId)}
          onCancel={() => handlers.onFindLawyerCancel(actionData, messageId)}
        />
      )

    default:
      return null
  }
}

// 辅助函数：渲染历史消息中的JSON Action数据
export function renderHistoryAction(
  jsonContent: any, 
  message: ChatMessage, 
  handlers: ActionHandlers
) {
  // 检查新格式：{action: {...}, status: "..."}
  if (jsonContent.action && jsonContent.action.type) {
    const actionData = jsonContent.action
    const actionStatus = jsonContent.status || 'completed'
    
    const mockMessage: ChatMessage = {
      ...message,
      actionData: actionData,
      actionStatus: actionStatus as any,
      actionResponse: actionStatus === 'confirmed' ? '用户已确认' : actionStatus === 'cancelled' ? '用户已取消' : ''
    }
    
    return <ActionRenderer message={mockMessage} handlers={handlers} />
  }
  
  // 检查旧格式：直接是action对象 {type: "...", title: "...", ...}
  if (jsonContent.type) {
    const mockMessage: ChatMessage = {
      ...message,
      actionData: jsonContent,
      actionStatus: message.actionStatus,
      actionResponse: message.actionResponse
    }
    
    return <ActionRenderer message={mockMessage} handlers={handlers} />
  }
  
  return null
}
import { streamText } from "ai"
import { deepseek } from "@ai-sdk/deepseek"

export async function POST(req: Request) {
  // ① 解析请求体
  const { messages } = await req.json()

  // ② 创建 DeepSeek 模型
  const model = deepseek("deepseek-chat", {
    apiKey: process.env.DEEPSEEK_API_KEY, // 请在环境变量中填入
  })

  // ③ 调用 streamText 并将结果流式返回
  const result = streamText({
    model,
    messages: [
      {
        role: "system",
        content: `你是一个专业的法律AI助手，名叫"AI法律助手"。
职责：
1. 提供专业法律咨询
2. 帮助用户准备法律材料
3. 解答各类法律问题
请用中文回答。`,
      },
      ...messages,
    ],
    maxTokens: 2_000,
    temperature: 0.7,
  })

  // ④ 将错误信息直接转发给前端，方便调试
  return result.toDataStreamResponse({
    getErrorMessage: (error) => {
      if (error == null) return "unknown error"
      if (typeof error === "string") return error
      if (error instanceof Error) return error.message
      return JSON.stringify(error)
    },
  })
}

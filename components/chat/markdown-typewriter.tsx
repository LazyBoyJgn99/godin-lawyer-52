"use client"

import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"

interface MarkdownTypewriterProps {
  content: string
  isStreaming?: boolean
  typingSpeed?: number
}

export function MarkdownTypewriter({ 
  content, 
  isStreaming = false, 
  typingSpeed = 30 
}: MarkdownTypewriterProps) {
  const [displayedContent, setDisplayedContent] = useState("")

  useEffect(() => {
    if (!isStreaming) {
      // 如果不是流式状态，直接显示完整内容
      setDisplayedContent(content)
      return
    }

    // 流式状态下，直接显示当前内容（因为内容本身就是逐步增加的）
    setDisplayedContent(content)
  }, [content, isStreaming])

  return (
    <div className="prose prose-sm max-w-none text-gray-900">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 自定义渲染组件
          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-gray-900">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mb-2 text-gray-900">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mb-1 text-gray-900">{children}</h3>,
          p: ({ children }) => <p className="mb-2 text-sm leading-relaxed text-gray-900">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 text-sm space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 text-sm space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-gray-900">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 italic bg-blue-50 py-2 mb-2 text-sm">
              {children}
            </blockquote>
          ),
          code: ({ inline, children, ...props }) => {
            if (inline) {
              return (
                <code 
                  className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono" 
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <code 
                className="block bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto mb-2"
                {...props}
              >
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto mb-2">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2">
              <table className="min-w-full border-collapse border border-gray-300 text-xs">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-left font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 px-2 py-1">
              {children}
            </td>
          ),
          strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
          em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
          a: ({ children, href }) => (
            <a 
              href={href} 
              className="text-blue-600 hover:text-blue-800 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {displayedContent}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
      )}
    </div>
  )
}
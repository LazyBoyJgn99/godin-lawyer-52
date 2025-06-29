"use client"

import axios, {type AxiosRequestConfig, type AxiosResponse} from 'axios'
import {useAuthStore} from '@/store/auth-store'
import type {AnyType} from '@/types/api'

// 创建axios实例
const httpClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:10244",
  timeout: 10000,
})

// 请求拦截器
httpClient.interceptors.request.use(
  (config) => {
    // 添加认证token
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 响应拦截器
httpClient.interceptors.response.use(
  (response) => {
    // 根据content-type判断是否为json数据
    const contentType = response.headers['content-type'] ? response.headers['content-type'] : response.headers['Content-Type']
    if (!contentType?.includes('application/json')) {
      return Promise.resolve(response)
    }

    // 如果是blob数据
    if (response.data && response.data instanceof Blob) {
      return Promise.reject(response.data)
    }

    const res = response.data
    if (res.code && res.code !== 1) {
      // token过期或未登录
      if (res.code === 30007 || res.code === 30008) {
        console.error('Authentication failed, redirecting to login')
        useAuthStore.getState().logout()
        return Promise.reject(response)
      }

      console.error('API Error:', res.msg)
      return Promise.reject(response)
    }
    else {
      return Promise.resolve(res)
    }
  },
  (error) => {
    // 处理HTTP错误
    if (error.response?.status === 401) {
      // Token过期，清除认证状态
      useAuthStore.getState().logout()
    }
    
    if (error.message.includes('timeout')) {
      console.error('Request timeout')
    }
    else if (error.message === 'Network Error') {
      console.error('Network connection error')
    }
    else if (error.message.includes('Request')) {
      console.error('Network error occurred')
    }
    
    return Promise.reject(error)
  },
)

// ================================= 对外提供请求方法 =================================

/**
 * GET请求
 * @param url 请求地址
 * @param params 请求参数
 * @returns Promise<T> 返回泛型T类型的Promise
 */
export function getRequest<R = AnyType, P = AnyType>(url: string, params?: P): Promise<R> {
  return request<R, P>({ method: 'get', url, params })
}

/**
 * POST请求
 * @param url 请求地址
 * @param data 请求数据
 * @returns Promise<T> 返回泛型T类型的Promise
 */
export function postRequest<R = AnyType, D = AnyType>(url: string, data?: D): Promise<R> {
  return request<R, D>({ method: 'post', url, data })
}

/**
 * PUT请求
 * @param url 请求地址
 * @param data 请求数据
 * @returns Promise<T> 返回泛型T类型的Promise
 */
export function putRequest<R = AnyType, D = AnyType>(url: string, data?: D): Promise<R> {
  return request<R, D>({ method: 'put', url, data })
}

/**
 * DELETE请求
 * @param url 请求地址
 * @param data 请求数据
 * @returns Promise<T> 返回泛型T类型的Promise
 */
export function deleteRequest<R = AnyType, D = AnyType>(url: string, data?: D): Promise<R> {
  return request<R, D>({ method: 'delete', url, data })
}

// ================================= 流式请求 =================================

/**
 * 流式POST请求 (Server-Sent Events)
 * @param url 请求地址
 * @param data 请求数据
 * @returns Promise<ReadableStreamDefaultReader<Uint8Array> | null> 返回流式读取器
 */
export async function streamRequest<D = AnyType>(url: string, data?: D): Promise<ReadableStreamDefaultReader<Uint8Array> | null> {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:10244"
  
  // 获取认证token
  const token = useAuthStore.getState().token
  const headers: HeadersInit = {
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json'
  }
  
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  
  const response = await fetch(`${baseURL}${url}`, {
    method: 'POST',
    body: data as BodyInit,
    headers
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.body?.getReader() || null
}

// ================================= 文件下载 =================================

/**
 * POST方式下载文件
 * @param url 请求地址
 * @param data 请求数据
 */
export const postDownload = function (url: string, data: object): void {
  request({
    method: 'post',
    url,
    data,
    responseType: 'blob',
  })
    .then((data) => {
      handleDownloadData(data)
    })
    .catch((error) => {
      handleDownloadError(error)
    })
}

/**
 * GET方式下载文件
 * @param url 请求地址
 * @param params 请求参数
 */
export const getDownload = function (url: string, params: object): void {
  request({
    method: 'get',
    url,
    params,
    responseType: 'blob',
  })
    .then((data) => {
      handleDownloadData(data)
    })
    .catch((error) => {
      handleDownloadError(error)
    })
}

/**
 * 通用请求封装
 * @param config 请求配置
 * @returns Promise<T> 返回泛型T类型的Promise
 */
export function request<R = AnyType, P = AnyType>(config: AxiosRequestConfig<P>): Promise<R> {
  return httpClient.request<never, R, P>(config)
}

// ================================= 私有方法 =================================

function handleDownloadError(error: object) {
  if (error instanceof Blob) {
    const fileReader = new FileReader()
    fileReader.readAsText(error)
    fileReader.onload = () => {
      const result = fileReader.result
      if (typeof result === 'string') {
        try {
          const jsonMsg = JSON.parse(result)
          console.error('Download error:', jsonMsg.msg)
        }
        catch {
          console.error('Failed to parse error message')
        }
      }
      else {
        console.error('Unable to read error message')
      }
    }
  }
  else {
    console.error('Network error occurred')
  }
}

function handleDownloadData(response: AxiosResponse<Blob>) {
  if (!response) {
    return
  }

  // 获取返回类型
  const contentType = response.headers['content-type'] || response.headers['Content-Type']

  // 构建下载数据
  const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }))
  const link = document.createElement('a')
  link.style.display = 'none'
  link.href = url

  // 从消息头获取文件名
  const contentDisposition = response.headers['content-disposition'] || response.headers['Content-Disposition']
  let filename = 'download'
  
  if (contentDisposition) {
    const filenamePart = contentDisposition.split(';')[1]
    if (filenamePart) {
      const filenameMatch = filenamePart.match(/filename[*]?=([^;]+)/)
      if (filenameMatch) {
        filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''))
      }
    }
  }
  
  link.setAttribute('download', filename)

  // 触发点击下载
  document.body.appendChild(link)
  link.click()

  // 下载完释放
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export default httpClient
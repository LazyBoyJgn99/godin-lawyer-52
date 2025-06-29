import type {PageParam, PageResult, ResponseModel} from '@/types/api'
import {getDownload, getRequest, postRequest} from '@/lib/http-client'

// 演示用户数据类型
export interface DemoUser {
  id: number
  name: string
  email: string
  phone?: string
  createTime: string
  status: 'active' | 'inactive'
}

// 演示用户表单类型
export interface DemoUserForm {
  id?: number
  name: string
  email: string
  phone?: string
  status: 'active' | 'inactive'
}

// 演示用户查询参数
export interface DemoUserQuery {
  name?: string
  email?: string
  status?: 'active' | 'inactive'
}

// 演示用户分页查询参数
export interface DemoUserPageParam {
  pageParam: PageParam
  name?: string
  email?: string
  status?: 'active' | 'inactive'
}

export const demoApi = {
  // 分页查询用户
  userPage: (param: DemoUserPageParam): Promise<ResponseModel<PageResult<DemoUser>>> => {
    return postRequest<ResponseModel<PageResult<DemoUser>>, DemoUserPageParam>('/demo/userPage', param)
  },

  // 列表查询用户
  userList: (param: DemoUserQuery): Promise<ResponseModel<DemoUser[]>> => {
    return postRequest<ResponseModel<DemoUser[]>, DemoUserQuery>('/demo/userList', param)
  },

  // 获取用户详情
  userDetail: (userId: number): Promise<ResponseModel<DemoUserForm>> => {
    return getRequest<ResponseModel<DemoUserForm>>(`/demo/userDetail/${userId}`, {})
  },

  // 添加用户
  addUser: (param: DemoUserForm): Promise<ResponseModel<string>> => {
    return postRequest<ResponseModel<string>, DemoUserForm>('/demo/addUser', param)
  },

  // 更新用户
  updateUser: (param: DemoUserForm): Promise<ResponseModel<string>> => {
    return postRequest<ResponseModel<string>, DemoUserForm>('/demo/updateUser', param)
  },

  // 删除用户
  deleteUser: (userId: number): Promise<ResponseModel<string>> => {
    return getRequest<ResponseModel<string>>(`/demo/deleteUser/${userId}`, {})
  },

  // 批量删除用户
  batchDeleteUser: (userIdList: number[]): Promise<ResponseModel<string>> => {
    return postRequest<ResponseModel<string>, number[]>('/demo/batchDeleteUser', userIdList)
  },

  // 导出用户
  exportUser: (param?: DemoUserQuery): void => {
    return getDownload('/demo/exportUserExcel', param || {})
  },
}
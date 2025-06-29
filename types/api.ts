/**
 * 基础API响应模型
 */
export interface ResponseModel<T> {
  /**
   * 响应状态码
   */
  code: number
  /**
   * 响应数据
   */
  data: T
  /**
   * 响应消息
   */
  msg?: string
  /**
   * 响应成功状态
   */
  success: boolean
}

/**
 * 分页查询参数
 */
export interface PageParam {
  /**
   * 页码(不能为空)
   */
  pageNum: number
  /**
   * 每页数量(不能为空)
   */
  pageSize: number
  /**
   * 排序字段集合
   */
  sortItemList?: Array<SortItem>
}

/**
 * 分页查询参数包装
 */
export interface PageQueryParam {
  pageParam: PageParam
}

/**
 * 分页查询结果
 */
export interface PageResult<T> {
  /**
   * 是否为空
   */
  emptyFlag?: boolean
  /**
   * 结果集
   */
  list: Array<T>
  /**
   * 当前页
   */
  pageNum?: number
  /**
   * 每页的数量
   */
  pageSize?: number
  /**
   * 总页数
   */
  pages?: number
  /**
   * 总记录数
   */
  total: number
}

/**
 * 排序项
 */
export interface SortItem {
  /**
   * 排序规则(true正序|false倒序)
   */
  asc: boolean
  /**
   * 排序字段(不能为空 ,最多30个字符)
   */
  column: string
}

/**
 * 通用类型
 */
export type AnyType = any
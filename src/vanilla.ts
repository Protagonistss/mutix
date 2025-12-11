// 定义 Store 的公开接口
export interface MutixStore<T extends object> {
  state: T
  snapshot: T
  subscribe: (listener: () => void) => () => void
}

// 定义创建函数签名
export function createMutix<T extends object>(initialState: T): MutixStore<T> {
  // TODO: Implementation
  return {} as MutixStore<T>
}

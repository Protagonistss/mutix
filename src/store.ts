// 定义 Store 的公开接口
export interface Store<T extends object> {
  state: T
  snapshot: T
  subscribe: (listener: () => void) => () => void
}

const isObject = (val: unknown): val is object =>
  typeof val === 'object' && val !== null

// 定义创建函数
export function createStore<T extends object>(initialState: T): Store<T> {
  let state = initialState
  const listeners = new Set<() => void>()

  const notify = () => {
    listeners.forEach((listener) => listener())
  }
  const handler: ProxyHandler<object> = {
    get(target, prop, receiver) {
      const res = Reflect.get(target, prop, receiver)
      
      if (isObject(res)) {
        return new Proxy(res, handler)
      }
      
      return res
    },
    set(target, prop, value, receiver) {
      const res = Reflect.set(target, prop, value, receiver)
      notify()
      return res
    },
    deleteProperty(target, prop) {
      const res = Reflect.deleteProperty(target, prop)
      notify()
      return res
    }
  }

  const proxyState = new Proxy(state, handler) as T

  return {
    state: proxyState,
    get snapshot() {
      return state
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}

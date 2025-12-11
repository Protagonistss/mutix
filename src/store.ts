// 定义 Store 的公开接口
export interface Store<T extends object> {
  state: T
  snapshot: T
  subscribe: (listener: () => void) => () => void
  batch: (fn: () => void) => void
  subscribeSelector: <S>(
    selector: (state: T) => S,
    equalityFn?: (a: S, b: S) => boolean,
    cb?: (next: S) => void
  ) => () => void
  getSnapshot: () => T
}

const isObject = (val: unknown): val is object =>
  typeof val === 'object' && val !== null

// 定义创建函数
export function createStore<T extends object>(initialState: T): Store<T> {
  let state = initialState
  const listeners = new Set<() => void>()
  const selectorListeners: Array<{
    selector: (s: T) => any
    equalityFn: (a: any, b: any) => boolean
    cb?: (next: any) => void
    prev: any
  }> = []
  let batchDepth = 0
  let pendingNotify = false

  const notify = () => {
    if (batchDepth > 0) {
      pendingNotify = true
      return
    }
    listeners.forEach((listener) => listener())
    if (selectorListeners.length) {
      for (const item of selectorListeners) {
        const next = item.selector(state)
        if (!item.equalityFn(item.prev, next)) {
          item.prev = next
          if (item.cb) item.cb(next)
        }
      }
    }
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
    },
    batch: (fn: () => void) => {
      batchDepth++
      try {
        fn()
      } finally {
        batchDepth--
        if (batchDepth === 0 && pendingNotify) {
          pendingNotify = false
          notify()
        }
      }
    },
    subscribeSelector: <S>(
      selector: (s: T) => S,
      equalityFn: (a: S, b: S) => boolean = Object.is,
      cb?: (next: S) => void
    ) => {
      const item = {
        selector,
        equalityFn,
        cb,
        prev: selector(state)
      }
      selectorListeners.push(item)
      const unsubscribeBase = () => {
        const idx = selectorListeners.indexOf(item)
        if (idx >= 0) selectorListeners.splice(idx, 1)
      }
      // 也注册一个基础订阅以确保在无任何基础订阅者时仍有触发点
      const baseUnsub = (() => {
        const dummy = () => {}
        listeners.add(dummy)
        return () => listeners.delete(dummy)
      })()
      return () => {
        unsubscribeBase()
        baseUnsub()
      }
    },
    getSnapshot: () => state
  }
}

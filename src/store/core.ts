import { toSelector } from '../context/paths'
import {
  CoreStore,
  CoreStoreOptions,
  Selector,
  SelectorOptions,
  WriteInfo
} from '../types'

const isObject = (val: unknown): val is object =>
  typeof val === 'object' && val !== null

const cloneDeep = (input: any): any => {
  if (!isObject(input)) return input
  if (Array.isArray(input)) return input.map((v) => cloneDeep(v))
  const out: Record<string, any> = {}
  for (const k of Object.keys(input)) {
    out[k] = cloneDeep((input as any)[k])
  }
  return out
}

const freezeDeep = <T>(input: T): T => {
  if (!isObject(input)) return input
  Object.freeze(input)
  for (const k of Object.keys(input)) {
    freezeDeep((input as any)[k])
  }
  return input
}

type SelectorListener<T, S> = {
  selector: (state: T) => S
  equalityFn: (a: S, b: S) => boolean
  cb?: (next: S) => void
  prev: S
  options?: SelectorOptions
  lastRun?: number
  throttled?: boolean
}

export function createCoreStore<T extends object>(
  initialState: T,
  options: CoreStoreOptions<T> = {}
): CoreStore<T> {
  let state = initialState
  const proxyCache = new WeakMap<object, any>()
  const listeners = new Set<() => void>()
  const selectorListeners: Array<SelectorListener<T, any>> = []
  const hooks = options.hooks ?? {}
  let batchDepth = 0
  let pendingNotify = false
  let writeSource: WriteInfo['source'] = 'proxy'

  const handleError = (err: unknown) => {
    if (hooks.onError) {
      try {
        hooks.onError(err)
      } catch {
        /* ignore secondary errors */
      }
    }
  }

  const queueNotify = () => {
    if (batchDepth > 0) {
      pendingNotify = true
      return
    }
    pendingNotify = false
    notify()
  }

  const notifySelectors = () => {
    for (const item of selectorListeners) {
      let next: any
      try {
        next = item.selector(state)
      } catch (err) {
        handleError(err)
        continue
      }
      if (item.equalityFn(item.prev, next)) continue

      const emit = () => {
        item.prev = next
        item.lastRun = Date.now()
        if (item.cb) {
          try {
            item.cb(next)
          } catch (err) {
            handleError(err)
          }
        }
      }

      const { options } = item
      if (options?.throttleMs != null) {
        const now = Date.now()
        const last = item.lastRun ?? 0
        const remaining = options.throttleMs - (now - last)
        if (remaining > 0) {
          if (!item.throttled) {
            item.throttled = true
            setTimeout(() => {
              item.throttled = false
              emit()
            }, remaining)
          }
          continue
        }
      }

      if (options?.scheduler) {
        options.scheduler(emit)
      } else {
        emit()
      }
    }
  }

  const notify = () => {
    hooks.onNotifyStart?.()
    notifySelectors()
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch (err) {
        handleError(err)
      }
    }
    hooks.onNotifyEnd?.()
  }

  const recordWrite = (info: WriteInfo) => {
    if (hooks.onBeforeWrite) {
      try {
        hooks.onBeforeWrite(info)
      } catch (err) {
        handleError(err)
      }
    }
    if (hooks.onAfterWrite) {
      try {
        hooks.onAfterWrite(info)
      } catch (err) {
        handleError(err)
      }
    }
    queueNotify()
  }

  const createProxy = (target: any, path: string[]): any => {
    if (!isObject(target)) return target
    const cached = proxyCache.get(target)
    if (cached) return cached

    const proxy = new Proxy(target, {
      get(t, prop, receiver) {
        const res = Reflect.get(t, prop, receiver)
        if (isObject(res)) {
          return createProxy(res, path.concat(String(prop)))
        }
        return res
      },
      set(t, prop, value, receiver) {
        const key = String(prop)
        const prev = Reflect.get(t, prop, receiver)
        const info: WriteInfo = { path: path.concat(key), prev, next: value, source: writeSource }
        const res = Reflect.set(t, prop, value, receiver)
        recordWrite({ ...info, next: Reflect.get(t, prop, receiver) })
        return res
      },
      deleteProperty(t, prop) {
        const key = String(prop)
        const prev = Reflect.get(t, prop)
        const info: WriteInfo = { path: path.concat(key), prev, next: undefined, source: writeSource }
        const res = Reflect.deleteProperty(t, prop)
        recordWrite(info)
        return res
      }
    })

    proxyCache.set(target, proxy)
    return proxy
  }

  const proxyState = createProxy(state, []) as T

  const batch = (fn: () => void) => {
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
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const subscribeSelector = <S>(
    selector: Selector<T, S>,
    equalityFn: (a: S, b: S) => boolean = Object.is,
    cb?: (next: S) => void,
    options?: SelectorOptions
  ) => {
    const selectorFn = typeof selector === 'string' ? toSelector(selector) : selector
    let initial: S
    try {
      initial = selectorFn(state)
    } catch (err) {
      handleError(err)
      initial = undefined as unknown as S
    }
    const item: SelectorListener<T, S> = {
      selector: selectorFn,
      equalityFn,
      cb,
      prev: initial,
      options
    }
    selectorListeners.push(item as any)

    return () => {
      const idx = selectorListeners.indexOf(item as any)
      if (idx >= 0) selectorListeners.splice(idx, 1)
    }
  }

  const getSnapshot = () => state

  const getReadonlySnapshot = (opts?: { freeze?: boolean; shallow?: boolean }) => {
    const { freeze = false, shallow = false } = opts ?? {}
    const clone = shallow ? { ...(state as any) } : cloneDeep(state)
    return freeze ? freezeDeep(clone) : clone
  }

  const withWriteSource = (source: WriteInfo['source'], fn: () => void) => {
    const prev = writeSource
    writeSource = source
    try {
      fn()
    } finally {
      writeSource = prev
    }
  }

  return {
    state: proxyState,
    get snapshot() {
      return state
    },
    subscribe,
    batch,
    subscribeSelector,
    getSnapshot,
    getReadonlySnapshot,
    withWriteSource
  }
}

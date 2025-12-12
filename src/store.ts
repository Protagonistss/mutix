import { deleteByPath, setByPath, toSelector } from './context/paths'
import {
  Action,
  CoreStore,
  Patch,
  PatchOp,
  Plugin,
  PluginContext,
  Selector,
  SelectorOptions,
  StoreOptions,
  WriteInfo
} from './types'

const isObject = (val: unknown): val is object =>
  typeof val === 'object' && val !== null

const defaultScheduler = (fn: () => void) => {
  if (typeof queueMicrotask === 'function') return queueMicrotask(fn)
  return setTimeout(fn, 0) as unknown as void
}

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

export type Store<T extends object> = CoreStore<T>

export function createStore<T extends object>(
  initialState: T,
  options: StoreOptions<T> = {}
): CoreStore<T> {
  let state = initialState
  const proxyCache = new WeakMap<object, any>()
  const listeners = new Set<() => void>()
  const selectorListeners: Array<SelectorListener<T, any>> = []
  const plugins = new Set<Plugin<T>>()
  const scheduler = options.scheduler ?? defaultScheduler
  const dispatchHandler = options.dispatchHandler
  let batchDepth = 0
  let pendingNotify = false

  let storeRef: CoreStore<T>

  const pluginCtx: PluginContext<T> = {
    getSnapshot: () => state,
    dispatch: (action: Action) => storeRef.dispatch(action),
    applyPatch: (patch: Patch) => storeRef.applyPatch(patch),
    schedule: scheduler,
    // @ts-expect-error - filled after storeRef created
    store: undefined
  }

  const handleError = (err: unknown) => {
    for (const plugin of plugins) {
      if (plugin.onError) {
        try {
          plugin.onError(pluginCtx, err)
        } catch {
          /* ignore secondary errors */
        }
      }
    }
  }

  const callPlugins = <K extends keyof Plugin<T>>(
    hook: K,
    ...args: Parameters<NonNullable<Plugin<T>[K]>>
  ) => {
    for (const plugin of plugins) {
      const fn = plugin[hook] as any
      if (typeof fn === 'function') {
        try {
          fn(pluginCtx, ...args)
        } catch (err) {
          handleError(err)
        }
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
    callPlugins('onNotifyStart')
    notifySelectors()
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch (err) {
        handleError(err)
      }
    }
    callPlugins('onNotifyEnd')
  }

  const recordWrite = (info: WriteInfo) => {
    callPlugins('onBeforeWrite', info)
    callPlugins('onAfterWrite', info)
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
        const info: WriteInfo = { path: path.concat(key), prev, next: value, source: 'proxy' }
        const res = Reflect.set(t, prop, value, receiver)
        recordWrite({ ...info, next: Reflect.get(t, prop, receiver) })
        return res
      },
      deleteProperty(t, prop) {
        const key = String(prop)
        const prev = Reflect.get(t, prop)
        const info: WriteInfo = { path: path.concat(key), prev, next: undefined, source: 'proxy' }
        const res = Reflect.deleteProperty(t, prop)
        recordWrite(info)
        return res
      }
    })

    proxyCache.set(target, proxy)
    return proxy
  }

  const proxyState = createProxy(state, []) as T

  const applyPatchOp = (op: PatchOp) => {
    callPlugins('onPatch', op)
    if (op.op === 'set') {
      setByPath(proxyState, op.path, op.value)
    } else if (op.op === 'delete') {
      deleteByPath(proxyState, op.path)
    }
  }

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

  const dispatch = (action: Action) => {
    callPlugins('onAction', action)
    if (dispatchHandler) {
      batch(() => {
        try {
          dispatchHandler(proxyState, action, pluginCtx)
        } catch (err) {
          handleError(err)
        }
      })
    }
  }

  const applyPatch = (patch: Patch) => {
    batch(() => {
      if (Array.isArray(patch)) {
        for (const op of patch) applyPatchOp(op)
      } else {
        applyPatchOp(patch)
      }
    })
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
      // best effort: still register with undefined to keep consistent length
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

  const use = (plugin: Plugin<T>) => {
    plugins.add(plugin)
    try {
      plugin.onInit?.(pluginCtx)
    } catch (err) {
      handleError(err)
    }
    return () => {
      plugins.delete(plugin)
    }
  }

  storeRef = {
    state: proxyState,
    get snapshot() {
      return state
    },
    subscribe,
    batch,
    subscribeSelector,
    getSnapshot,
    getReadonlySnapshot,
    dispatch,
    applyPatch,
    use
  }

  pluginCtx.store = storeRef

  if (options.plugins?.length) {
    for (const p of options.plugins) {
      use(p)
    }
  }

  return storeRef
}

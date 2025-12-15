import { toSelector } from '../context/paths'
import { ContextManager } from '../context/manager'
import type { BaseStore, Selector, Store } from '../types'
import type { Adapter, AdapterCapability, AdapterSelectOptions } from './types'

const fallbackScheduler = (fn: () => void) =>
  typeof queueMicrotask === 'function' ? queueMicrotask(fn) : setTimeout(fn, 0)

const createThrottle = <S>(
  fn: (val: S) => void,
  ms: number,
  scheduler: (fn: () => void) => void
) => {
  let timer: ReturnType<typeof setTimeout> | null = null
  let last: S
  const run = () => {
    timer = null
    fn(last)
  }
  return (val: S) => {
    last = val
    if (timer) return
    scheduler(() => {
      timer = setTimeout(run, ms)
    })
  }
}

const hasDispatch = <T extends object>(store: BaseStore<T>): store is Store<T> =>
  typeof (store as Store<T>).dispatch === 'function'

const hasPatch = <T extends object>(store: BaseStore<T>): store is Store<T> =>
  typeof (store as Store<T>).applyPatch === 'function'

export interface CreateAdapterOptions<T extends object> {
  store: BaseStore<T> | Store<T>
  manager?: ContextManager
  scopeId?: string
  defaultEqualityFn?: <S>(a: S, b: S) => boolean
  defaultScheduler?: (fn: () => void) => void
}

export const createAdapter = <T extends object>(
  options: CreateAdapterOptions<T>
): Adapter<T> => {
  const {
    store,
    manager,
    scopeId,
    defaultEqualityFn = Object.is,
    defaultScheduler = fallbackScheduler
  } = options

  const capabilities: AdapterCapability[] = ['readonly']
  if (hasPatch(store)) capabilities.push('patch')
  if (hasDispatch(store)) capabilities.push('dispatch')
  if (manager) capabilities.push('scope')

  const select = <S>(
    selector: Selector<T, S>,
    selectOptions?: AdapterSelectOptions<S>,
    cb?: (next: S) => void
  ) => {
    const selectorFn = typeof selector === 'string' ? toSelector(selector) : selector
    const equalityFn = selectOptions?.equalityFn ?? defaultEqualityFn
    const scheduler = selectOptions?.scheduler ?? defaultScheduler
    const throttleMs = selectOptions?.throttleMs
    const followFallback = selectOptions?.followFallback ?? true
    const receiver = cb ?? (() => {})
    const emit = receiver

    if (manager && scopeId) {
      const scopedEmit =
        throttleMs != null ? createThrottle(receiver, throttleMs, scheduler) : receiver
      return manager.subscribeValue(scopeId, selectorFn as any, scopedEmit, {
        equalityFn,
        followFallback
      })
    }

    return store.subscribeSelector(selectorFn, equalityFn, emit, {
      scheduler,
      throttleMs
    })
  }

  const withScope = (id: string): Adapter<T> =>
    createAdapter({
      store,
      manager,
      scopeId: id,
      defaultEqualityFn,
      defaultScheduler
    })

  const getValue = <S>(selector: Selector<T, S>) => {
    const selectorFn = typeof selector === 'string' ? toSelector(selector) : selector
    if (manager && scopeId) {
      return manager.getValue(scopeId, selectorFn as any) as S
    }
    return selectorFn(store.getSnapshot()) as S
  }

  const setValue = (path: string, value: any) => {
    if (!manager || !scopeId) return
    manager.setValue(scopeId, path, value)
  }

  const deleteValue = (path: string) => {
    if (!manager || !scopeId) return
    manager.deleteValue(scopeId, path)
  }

  return {
    capabilities,
    subscribe: store.subscribe,
    select,
    getSnapshot: store.getSnapshot,
    getReadonlySnapshot: store.getReadonlySnapshot,
    dispatch: hasDispatch(store) ? store.dispatch : undefined,
    applyPatch: hasPatch(store) ? store.applyPatch : undefined,
    batch: store.batch,
    withScope: manager ? withScope : undefined,
    getValue,
    setValue: manager ? setValue : undefined,
    deleteValue: manager ? deleteValue : undefined
  }
}

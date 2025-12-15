import { createCoreStore } from '../store/core'
import type { BaseStore } from '../types'
import { setByPath, toSelector, hasPath, deleteByPath } from './paths'

type ScopeId = string

export type WritePolicy =
  | 'self'
  | 'bubble'
  | ((scopeId: ScopeId, path: string) => ScopeId)

export interface ContextManagerOptions {
  writePolicy?: WritePolicy
  fallbackOnUndefined?: boolean
}

export interface SubscribeOptions {
  equalityFn?: (a: any, b: any) => boolean
  followFallback?: boolean
}

export class ContextManager {
  private contexts = new Map<ScopeId, BaseStore<Record<string, any>>>()
  private parents = new Map<ScopeId, ScopeId>()
  private writePolicy: WritePolicy
  private fallbackOnUndefined: boolean

  constructor(options: ContextManagerOptions = {}) {
    this.writePolicy = options.writePolicy ?? 'self'
    this.fallbackOnUndefined = options.fallbackOnUndefined ?? true
  }

  createContext(
    scopeId: ScopeId,
    initial: Record<string, any> = {},
    parentScopeId?: ScopeId
  ) {
    const store = createCoreStore<Record<string, any>>(initial)
    this.contexts.set(scopeId, store)
    if (parentScopeId) this.parents.set(scopeId, parentScopeId)
    return store
  }

  destroyContext(scopeId: ScopeId) {
    this.contexts.delete(scopeId)
    this.parents.delete(scopeId)
  }

  private collectChain(scopeId: ScopeId) {
    const chain: ScopeId[] = []
    let cur: ScopeId | undefined = scopeId
    while (cur) {
      chain.push(cur)
      cur = this.parents.get(cur)
    }
    return chain
  }

  private resolveValue(scopeId: ScopeId, selector: (s: any) => any) {
    let cur: ScopeId | undefined = scopeId
    while (cur) {
      const store = this.contexts.get(cur)
      if (store) {
        const snap = store.getSnapshot()
        const val = selector(snap)
        if (val !== undefined || !this.fallbackOnUndefined) {
          return val
        }
      }
      cur = this.parents.get(cur)
    }
    return undefined
  }

  private resolveWriteTarget(scopeId: ScopeId, path: string): ScopeId {
    if (typeof this.writePolicy === 'function') {
      return this.writePolicy(scopeId, path)
    }
    if (this.writePolicy === 'self') return scopeId
    if (this.writePolicy === 'bubble') {
      let cur: ScopeId | undefined = scopeId
      while (cur) {
        const store = this.contexts.get(cur)
        if (store && hasPath(store.getSnapshot(), path)) {
          return cur
        }
        cur = this.parents.get(cur)
      }
      return scopeId
    }
    return scopeId
  }

  getValue(scopeId: ScopeId, path: string | ((s: any) => any)) {
    const selector = toSelector(path as any)
    return this.resolveValue(scopeId, selector)
  }

  setValue(scopeId: ScopeId, path: string, value: any) {
    const targetScope = this.resolveWriteTarget(scopeId, path)
    const store = this.contexts.get(targetScope)
    if (!store) return
    setByPath(store.state, path, value)
  }

  deleteValue(scopeId: ScopeId, path: string) {
    const targetScope = this.resolveWriteTarget(scopeId, path)
    const store = this.contexts.get(targetScope)
    if (!store) return
    deleteByPath(store.state, path)
  }

  subscribeValue(
    scopeId: ScopeId,
    pathOrSelector: string | ((s: Record<string, any>) => any),
    cb: (next: any) => void,
    options: SubscribeOptions = {}
  ) {
    const selector = toSelector(pathOrSelector as any)
    const equalityFn = options.equalityFn ?? Object.is
    const followFallback = options.followFallback ?? true
    let last = this.resolveValue(scopeId, selector)
    const chain = followFallback ? this.collectChain(scopeId) : [scopeId]
    const unsubscribers: Array<() => void> = []

    const check = () => {
      const next = this.resolveValue(scopeId, selector)
      if (!equalityFn(last, next)) {
        last = next
        cb(next)
      }
    }

    for (const id of chain) {
      const store = this.contexts.get(id)
      if (store) {
        const unsub = store.subscribe(check)
        unsubscribers.push(unsub)
      }
    }

    return () => {
      for (const unsub of unsubscribers) unsub()
    }
  }

  getStore(scopeId: ScopeId) {
    return this.contexts.get(scopeId)
  }
}

// Backward-compatible singleton helpers
const defaultManager = new ContextManager()

export const createContext = defaultManager.createContext.bind(defaultManager)
export const destroyContext = defaultManager.destroyContext.bind(defaultManager)
export const getValue = defaultManager.getValue.bind(defaultManager)
export const setValue = defaultManager.setValue.bind(defaultManager)
export const deleteValue = defaultManager.deleteValue.bind(defaultManager)
export const subscribeValue = defaultManager.subscribeValue.bind(defaultManager)
export const getStore = defaultManager.getStore.bind(defaultManager)

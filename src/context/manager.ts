import { createStore, type Store } from '../store'
import { getByPath, setByPath, toSelector } from './paths'

type ScopeId = string

const contexts = new Map<ScopeId, Store<Record<string, any>>>()
const parents = new Map<ScopeId, ScopeId>()


export const createContext = (
  scopeId: ScopeId,
  initial: Record<string, any> = {},
  parentScopeId?: ScopeId
) => {
  const store = createStore<Record<string, any>>(initial)
  contexts.set(scopeId, store)
  if (parentScopeId) parents.set(scopeId, parentScopeId)
  return store
}

export const destroyContext = (scopeId: ScopeId) => {
  contexts.delete(scopeId)
  parents.delete(scopeId)
}

const resolveValue = (scopeId: ScopeId, path: string): any => {
  let cur: ScopeId | undefined = scopeId
  while (cur) {
    const store = contexts.get(cur)
    if (store) {
      const v = getByPath(store.getSnapshot(), path)
      if (v !== undefined) return v
    }
    cur = parents.get(cur)
  }
  return undefined
}

export const getValue = (scopeId: ScopeId, path: string) => {
  return resolveValue(scopeId, path)
}

export const setValue = (scopeId: ScopeId, path: string, value: any) => {
  const store = contexts.get(scopeId)
  if (!store) return
  setByPath(store.state, path, value)
}

export const subscribeValue = (
  scopeId: ScopeId,
  pathOrSelector: string | ((s: Record<string, any>) => any),
  cb: (next: any) => void,
  equalityFn: (a: any, b: any) => boolean = Object.is
) => {
  const store = contexts.get(scopeId)
  if (!store) return () => {}
  const selector = toSelector(pathOrSelector as any)
  return store.subscribeSelector(selector, equalityFn, cb)
}

export const getStore = (scopeId: ScopeId) => contexts.get(scopeId)

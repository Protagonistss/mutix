import type { Action, Patch, Selector } from '../types'
export type { Action, Patch, Selector }


export type AdapterCapability = 'readonly' | 'scope' | 'patch' | 'dispatch'

export interface AdapterSelectOptions<S = any> {
  equalityFn?: (a: S, b: S) => boolean
  throttleMs?: number
  scheduler?: (fn: () => void) => void
  followFallback?: boolean
}

export interface Adapter<T extends object> {
  capabilities: AdapterCapability[]
  subscribe(listener: () => void): () => void
  select<S>(
    selector: Selector<T, S>,
    options?: AdapterSelectOptions<S>,
    cb?: (next: S) => void
  ): () => void
  getSnapshot(): T
  getReadonlySnapshot?(opts?: { freeze?: boolean; shallow?: boolean }): T
  dispatch?(action: Action): void
  applyPatch?(patch: Patch): void
  batch?(fn: () => void): void
  withScope?(scopeId: string | symbol): Adapter<T>
  getValue?<S>(selector: Selector<T, S>): S
  setValue?(path: string, value: any): void
  deleteValue?(path: string): void
}

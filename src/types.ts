export interface Action<Payload = any, Meta = any> {
  type: string
  payload?: Payload
  meta?: Meta
  error?: boolean
}

export type PatchOp =
  | { op: 'set'; path: string; value: any }
  | { op: 'delete'; path: string }

export type Patch = PatchOp | PatchOp[]

export type Selector<T, S> = ((state: T) => S) | string

export interface SelectorOptions {
  scheduler?: (fn: () => void) => void
  throttleMs?: number
}

export type WriteSource = 'proxy' | 'patch' | 'dispatch'

export interface WriteInfo {
  path?: string[]
  prev: any
  next: any
  source: WriteSource
}

export interface PluginContext<T extends object> {
  store: Store<T>
  getSnapshot(): T
  dispatch(action: Action): void
  applyPatch(patch: Patch): void
  schedule(fn: () => void): void
}

export interface Plugin<T extends object> {
  name: string
  onInit?(ctx: PluginContext<T>): void
  onBeforeWrite?(ctx: PluginContext<T>, info: WriteInfo): void
  onAfterWrite?(ctx: PluginContext<T>, info: WriteInfo): void
  onAction?(ctx: PluginContext<T>, action: Action): void
  onPatch?(ctx: PluginContext<T>, patch: PatchOp): void
  onNotifyStart?(ctx: PluginContext<T>): void
  onNotifyEnd?(ctx: PluginContext<T>): void
  onError?(ctx: PluginContext<T>, error: unknown): void
}

export interface StoreHooks<T extends object> {
  onBeforeWrite?(info: WriteInfo): void
  onAfterWrite?(info: WriteInfo): void
  onNotifyStart?(): void
  onNotifyEnd?(): void
  onError?(error: unknown): void
}

export interface StoreOptions<T extends object> {
  plugins?: Plugin<T>[]
  scheduler?: (fn: () => void) => void
  dispatchHandler?: (state: T, action: Action, ctx: PluginContext<T>) => void
}

export interface BaseStore<T extends object> {
  state: T
  readonly snapshot: T
  subscribe: (listener: () => void) => () => void
  batch: (fn: () => void) => void
  subscribeSelector: <S>(
    selector: Selector<T, S>,
    equalityFn?: (a: S, b: S) => boolean,
    cb?: (next: S) => void,
    options?: SelectorOptions
  ) => () => void
  getSnapshot: () => T
  getReadonlySnapshot: (options?: { freeze?: boolean; shallow?: boolean }) => T
  withWriteSource: (source: WriteSource, fn: () => void) => void
}

export type CoreStore<T extends object> = BaseStore<T>

export interface Store<T extends object> extends BaseStore<T> {
  dispatch: (action: Action) => void
  applyPatch: (patch: Patch) => void
  use: (plugin: Plugin<T>) => () => void
}

export interface CoreStoreOptions<T extends object> {
  scheduler?: (fn: () => void) => void
  hooks?: StoreHooks<T>
}

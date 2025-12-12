import { deleteByPath, setByPath } from '../context/paths'
import { createCoreStore } from './core'
import {
  Action,
  Patch,
  PatchOp,
  Plugin,
  PluginContext,
  Store,
  StoreOptions
} from '../types'

const fallbackSchedule = (fn: () => void) => {
  if (typeof queueMicrotask === 'function') return queueMicrotask(fn)
  return setTimeout(fn, 0) as unknown as void
}

export function createStoreWithPlugins<T extends object>(
  initialState: T,
  options: StoreOptions<T> = {}
): Store<T> {
  const plugins = new Set<Plugin<T>>(options.plugins ?? [])
  const schedule = options.scheduler ?? fallbackSchedule
  const dispatchHandler = options.dispatchHandler

  let storeRef: Store<T>

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

  const core = createCoreStore(initialState, {
    scheduler: options.scheduler,
    hooks: {
      onBeforeWrite: (info) => callPlugins('onBeforeWrite', info),
      onAfterWrite: (info) => callPlugins('onAfterWrite', info),
      onNotifyStart: () => callPlugins('onNotifyStart'),
      onNotifyEnd: () => callPlugins('onNotifyEnd'),
      onError: (err) => handleError(err)
    }
  })

  const pluginCtx: PluginContext<T> = {
    getSnapshot: () => core.getSnapshot(),
    dispatch: (action: Action) => storeRef.dispatch(action),
    applyPatch: (patch: Patch) => storeRef.applyPatch(patch),
    schedule,
    // @ts-expect-error filled after storeRef created
    store: undefined
  }

  const applyPatchOp = (op: PatchOp) => {
    callPlugins('onPatch', op)
    core.withWriteSource('patch', () => {
      if (op.op === 'set') {
        setByPath(core.state, op.path, op.value)
      } else if (op.op === 'delete') {
        deleteByPath(core.state, op.path)
      }
    })
  }

  const applyPatch = (patch: Patch) => {
    core.batch(() => {
      if (Array.isArray(patch)) {
        for (const op of patch) applyPatchOp(op)
      } else {
        applyPatchOp(patch)
      }
    })
  }

  const dispatch = (action: Action) => {
    callPlugins('onAction', action)
    if (dispatchHandler) {
      core.batch(() => {
        core.withWriteSource('dispatch', () => {
          try {
            dispatchHandler(core.state, action, pluginCtx)
          } catch (err) {
            handleError(err)
          }
        })
      })
    }
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
    state: core.state,
    get snapshot() {
      return core.snapshot
    },
    subscribe: core.subscribe,
    batch: core.batch,
    subscribeSelector: core.subscribeSelector,
    getSnapshot: core.getSnapshot,
    getReadonlySnapshot: core.getReadonlySnapshot,
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

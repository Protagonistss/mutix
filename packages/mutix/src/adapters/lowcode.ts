import { ContextManager } from '../context/manager'
import { createAdapter } from '../adapter/createAdapter'
import type { Adapter } from '../adapter/types'

export interface LowCodeAdapterOptions {
  externals?: Record<string, any>
  evaluator?: (expression: string, context: Record<string, any>) => any
  fallbackOnUndefined?: boolean
}

export interface LowCodeExtensions {
  setExternal(key: string, value: any): void
  eval<R = any>(expression: string, context?: Record<string, any>): R
  getDataSource(): any
}

export type LowCodeAdapter<T extends object = any> = Adapter<T> & LowCodeExtensions

export const createLowCodeAdapter = <T extends object = any>(
  manager: ContextManager,
  scopeId: string,
  options: LowCodeAdapterOptions = {}
): LowCodeAdapter<T> => {
  const externals = options.externals || {}
  
  // Ensure store exists (auto-create if not present)
  let store = manager.getStore(scopeId)
  if (!store) {
    store = manager.createContext(scopeId)
  }

  // Create base adapter reusing core logic
  const baseAdapter = createAdapter<T>({
    store: store as any,
    manager,
    scopeId
  })

  // Implement LowCode extensions
  const setExternal = (key: string, value: any) => {
    externals[key] = value
  }

  const evalExpr = <R = any>(expression: string, additionalContext: Record<string, any> = {}): R => {
    // Create a context proxy that looks up variables in this order:
    // 1. additionalContext (local scope of expression)
    // 2. externals (global injected tools/libs)
    // 3. store (scope chain via ContextManager)
    
    const proxyContext = new Proxy({}, {
      get: (_target, prop) => {
        if (typeof prop === 'string') {
          if (prop in additionalContext) return additionalContext[prop]
          if (prop in externals) return externals[prop]
          
          const val = manager.getValue(scopeId, prop)
          if (val !== undefined) return val
        }
        return undefined
      },
      has: (_target, prop) => {
        if (typeof prop === 'string') {
          if (prop in additionalContext) return true
          if (prop in externals) return true
          return manager.getValue(scopeId, prop) !== undefined
        }
        return false
      }
    })

    if (options.evaluator) {
      return options.evaluator(expression, proxyContext)
    }

    // Default sandbox implementation
    try {
      const fn = new Function('context', `with(context) { return ${expression} }`)
      return fn(proxyContext)
    } catch (e) {
      console.warn(`[LowCodeAdapter] Expression evaluation failed: "${expression}"`, e)
      return undefined as any
    }
  }

  const getDataSource = () => baseAdapter.getSnapshot()

  // Return combined object
  return {
    ...baseAdapter,
    setExternal,
    eval: evalExpr,
    getDataSource,
    // Override withScope to return LowCodeAdapter instead of base Adapter
    withScope: (newScopeId: string) => 
      createLowCodeAdapter(manager, newScopeId, options)
  }
}

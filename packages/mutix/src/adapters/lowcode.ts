import { ContextManager } from '../context/manager'
import { createAdapter } from '../adapter/createAdapter'
import type { Adapter } from '../adapter/types'
import { Evaluator, defaultEvaluator } from '../expression'

// --- Types ---

export interface LowCodeAdapterOptions {
  externals?: Record<string, any>
  evaluator?: Evaluator
  fallbackOnUndefined?: boolean
}

export interface LowCodeExtensions {
  setExternal(key: string, value: any): void
  eval<R = any>(expression: string, context?: Record<string, any>): R
  getDataSource(): any
}

export type LowCodeAdapter<T extends object = any> = Adapter<T> & LowCodeExtensions

// --- Internal Helpers ---

/**
 * Creates a Proxy context that follows the lookup order:
 * 1. Local context (additionalContext)
 * 2. Externals
 * 3. Store Scope Chain (via ContextManager)
 */
const createContextProxy = (
  manager: ContextManager,
  scopeId: string,
  externals: Record<string, any>,
  additionalContext: Record<string, any>
) => {
  return new Proxy({}, {
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
}



// --- Factory ---

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
    // 1. Build the context with strict lookup order
    const proxyContext = createContextProxy(manager, scopeId, externals, additionalContext)
    
    // 2. Delegate execution to injected evaluator or default sandbox
    const evaluator = options.evaluator || defaultEvaluator
    return evaluator(expression, proxyContext)
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

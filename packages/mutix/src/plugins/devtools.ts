import type { Plugin, PluginContext, Store } from '../types'

interface DevToolsOptions {
  name?: string
  enabled?: boolean
}

interface DevToolsConnection {
  subscribe: (listener: (message: any) => void) => void
  unsubscribe: () => void
  send: (action: string | { type: string }, state: any) => void
  init: (state: any) => void
  error: (message: string) => void
}

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: {
      connect: (options?: { name?: string }) => DevToolsConnection
    }
  }
}

export const devtoolsPlugin = <T extends object>(
  options: DevToolsOptions = {}
): Plugin<T> => {
  const { name = 'Mutix Store', enabled = true } = options

  return {
    name: 'devtools',
    onInit(ctx: PluginContext<T>) {
      if (!enabled || typeof window === 'undefined' || !window.__REDUX_DEVTOOLS_EXTENSION__) {
        return
      }

      const devTools = (window.__REDUX_DEVTOOLS_EXTENSION__ as any).connect({ name })
      
      // Initialize with current state
      devTools.init(ctx.getSnapshot())

      // Subscribe to DevTools messages (Time Travel)
      devTools.subscribe((message: any) => {
        if (message.type === 'DISPATCH' && message.state) {
          if (
            message.payload.type === 'JUMP_TO_ACTION' ||
            message.payload.type === 'JUMP_TO_STATE'
          ) {
            try {
              const newState = JSON.parse(message.state)
              
              // Apply new state to the store
              // Since we don't have a replaceState method, we need to update properties
              // We use batch to ensure single notification if possible, though JUMP usually triggers one
              ctx.store.batch(() => {
                ctx.store.withWriteSource('patch', () => {
                   const currentState = ctx.getSnapshot()
                   
                   // 1. Update/Add existing keys
                   Object.keys(newState).forEach(key => {
                     // We use setByPath which handles nested, but here we are at root
                     // Assuming T is Record<string, any> for simplicity in context usage
                     // But strictly, we should update root keys.
                     // Accessing state directly via store.state (which is proxy)
                     
                     // We can't easily replace the root proxy target.
                     // So we sync keys.
                     (ctx.store.state as any)[key] = newState[key]
                   })

                   // 2. Remove keys that are not in newState
                   Object.keys(currentState).forEach(key => {
                     if (!(key in newState)) {
                       delete (ctx.store.state as any)[key]
                     }
                   })
                })
              })
            } catch (e) {
              console.error('Mutix DevTools: Failed to parse state', e)
            }
          }
        }
      })

      // We need to keep a reference to send updates
      // We can attach it to the plugin context or just use closure
      (ctx as any)._devtools = devTools
    },

    onNotifyEnd(ctx: PluginContext<T>) {
      const devTools = (ctx as any)._devtools as DevToolsConnection | undefined
      if (devTools) {
        let action: any = { type: 'Store Update' }
        
        if ((ctx as any)._lastAction) {
           action = (ctx as any)._lastAction
           delete (ctx as any)._lastAction
        } else if ((ctx as any)._lastWrite) {
           const info = (ctx as any)._lastWrite
           action = { 
             type: `SET ${info.path.join('.')}`, 
             payload: info.next,
             source: info.source
           }
           delete (ctx as any)._lastWrite
        }
        
        devTools.send(action, ctx.getSnapshot())
      }
    },

    onAction(ctx: PluginContext<T>, action) {
       // Ideally we send the specific action here
       // But onNotifyEnd is triggered after all changes.
       // Redux DevTools expects send(action, state). 
       // If we send here, state might not be updated yet depending on implementation.
       // Mutix dispatches are synchronous usually.
       
       const devTools = (ctx as any)._devtools as DevToolsConnection | undefined
       if (devTools) {
          // If we want accurate action logging, we might need to coordinate with onNotifyEnd
          // For now, let's rely on onNotifyEnd or just log action immediately if state is updated
          // store.dispatch calls handler then notifies.
          // So inside onAction, state might be old or new? 
          // createStoreWithPlugins calls onAction BEFORE dispatchHandler. So state is OLD.
          
          // We'll store the action to send it in onNotifyEnd?
          (ctx as any)._lastAction = action
       }
    },
    
    onAfterWrite(ctx, info) {
       // For direct writes (not actions), we can log them too
       // info has path, value, etc.
       if (info.source !== 'dispatch') {
         (ctx as any)._lastWrite = info
       }
    }
  }
}

export const attachDevTools = (store: Store<any>, options: DevToolsOptions = {}) => {
  return store.use(devtoolsPlugin(options))
}

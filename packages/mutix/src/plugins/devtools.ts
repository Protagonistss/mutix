import type { Plugin, PluginContext, Store } from '../types'

interface DevToolsOptions {
  name?: string
  enabled?: boolean
}

export const devtoolsPlugin = <T extends object>(
  options: DevToolsOptions = {}
): Plugin<T> => {
  const { name = 'Mutix Store', enabled = true } = options

  return {
    name: 'devtools',
    onInit(ctx: PluginContext<T>) {
      if (!enabled || typeof window === 'undefined' || !(window as any).__REDUX_DEVTOOLS_EXTENSION__) {
        return
      }

      const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__.connect({ name })
      devTools.init(ctx.getSnapshot())

      devTools.subscribe((message: any) => {
        if (message.type === 'DISPATCH' && message.state) {
          const payload = message.payload
          if (payload.type === 'JUMP_TO_ACTION' || payload.type === 'JUMP_TO_STATE') {
            try {
              const newState = JSON.parse(message.state)
              ctx.store.batch(() => {
                ctx.store.withWriteSource('patch', () => {
                   const currentState = ctx.getSnapshot()
                   Object.keys(newState).forEach(key => {
                     (ctx.store.state as any)[key] = newState[key]
                   })
                   Object.keys(currentState).forEach(key => {
                     if (!(key in newState)) {
                       delete (ctx.store.state as any)[key]
                     }
                   })
                })
              })
            } catch (e) {
              console.error('Mutix DevTools Parse Error', e)
            }
          }
        }
      });

      (ctx as any)._devtools = devTools
    },

    onNotifyEnd(ctx: PluginContext<T>) {
      const devTools = (ctx as any)._devtools
      if (!devTools) return

      let action: any = { type: 'Store Update' }
      
      if ((ctx as any)._lastAction) {
         action = (ctx as any)._lastAction
         delete (ctx as any)._lastAction
      } else if ((ctx as any)._lastWrite) {
         const info = (ctx as any)._lastWrite
         const path = info.path ? info.path.join('.') : ''
         action = { 
           type: `SET ${path}`, 
           payload: info.next,
           source: info.source
         }
         delete (ctx as any)._lastWrite
      }
      
      devTools.send(action, ctx.getSnapshot())
    },

    onAction(ctx: PluginContext<T>, action) {
       if ((ctx as any)._devtools) {
          (ctx as any)._lastAction = action
       }
    },
    
    onAfterWrite(ctx, info) {
       const devTools = (ctx as any)._devtools
       if (devTools && info.source !== 'dispatch') {
         const path = info.path ? info.path.join('.') : ''
         const action = { 
           type: `SET ${path}`, 
           payload: info.next,
           source: info.source
         }
         devTools.send(action, ctx.getSnapshot())
         delete (ctx as any)._lastWrite
       } else {
         if (info.source !== 'dispatch') {
            (ctx as any)._lastWrite = info
         }
       }
    }
  }
}

export const attachDevTools = (store: Store<any>, options: DevToolsOptions = {}) => {
  return store.use(devtoolsPlugin(options))
}
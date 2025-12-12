import type { Plugin } from '../types'
import type { Store } from '../store'

export type LogFn = (msg: { type: 'change'; snapshot: any; time: number }) => void

export const loggerPlugin = (log: LogFn = console.log): Plugin<any> => ({
  name: 'logger',
  onNotifyEnd(ctx) {
    log({ type: 'change', snapshot: ctx.getSnapshot(), time: Date.now() })
  }
})

export const attachLogger = (store: Store<any>, log: LogFn = console.log) => {
  return store.use(loggerPlugin(log))
}

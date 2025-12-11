import type { Store } from '../store'

export type LogFn = (msg: { type: 'change'; snapshot: any; time: number }) => void

export const attachLogger = (store: Store<any>, log: LogFn = console.log) => {
  let prev = store.getSnapshot()
  return store.subscribe(() => {
    const next = store.getSnapshot()
    log({ type: 'change', snapshot: next, time: Date.now() })
    prev = next
  })
}


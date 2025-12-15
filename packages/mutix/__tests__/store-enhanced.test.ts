import { describe, it, expect, vi } from 'vitest'
import { createStore } from '../src'
import type { Plugin } from '../src/types'

describe('store advanced features', () => {
  it('provides readonly snapshot with freeze option', () => {
    const store = createStore({ nested: { value: 1 } })
    const snap = store.getReadonlySnapshot({ freeze: true })
    expect(() => {
      ;(snap as any).nested.value = 2
    }).toThrow()
    store.state.nested.value = 3
    expect(store.getSnapshot().nested.value).toBe(3)
    expect(snap.nested.value).toBe(1)
  })

  it('supports path-based selectors and scheduler', async () => {
    const store = createStore({ a: { x: 1 } })
    const cb = vi.fn()
    store.subscribeSelector('a.x', Object.is, cb, {
      scheduler: (fn) => setTimeout(fn, 0)
    })
    store.state.a.x = 2
    expect(cb).toHaveBeenCalledTimes(0)
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('dispatch handler can mutate state', () => {
    const handler = (state: { count: number }, action: { type: string; payload?: number }) => {
      if (action.type === 'inc') state.count += action.payload ?? 1
    }
    const store = createStore({ count: 0 }, { dispatchHandler: handler })
    store.dispatch({ type: 'inc', payload: 2 })
    expect(store.state.count).toBe(2)
  })

  it('invokes plugin hooks around writes and notify', () => {
    const events: string[] = []
    const plugin: Plugin<any> = {
      name: 'tracker',
      onBeforeWrite: (_, info) => events.push(`before:${info.path?.join('.')}`),
      onAfterWrite: (_, info) => events.push(`after:${info.path?.join('.')}`),
      onNotifyStart: () => events.push('notify:start'),
      onNotifyEnd: () => events.push('notify:end')
    }
    const store = createStore({ v: 1 }, { plugins: [plugin] })
    store.state.v = 2
    expect(events).toEqual(['before:v', 'after:v', 'notify:start', 'notify:end'])
  })
})

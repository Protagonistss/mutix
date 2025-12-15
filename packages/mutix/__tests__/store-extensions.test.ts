import { describe, it, expect, vi } from 'vitest'
import { createStore } from '../src/index'

describe('store extensions', () => {
  it('batch aggregates notifications', () => {
    const store = createStore({ a: 0, b: 0 })
    const listener = vi.fn()
    store.subscribe(listener)
    store.batch(() => {
      store.state.a = 1
      store.state.b = 2
      store.state.a = 3
    })
    expect(store.state.a).toBe(3)
    expect(store.state.b).toBe(2)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('subscribeSelector only triggers on slice change', () => {
    const store = createStore({ a: { x: 1 }, b: 0 })
    const cb = vi.fn()
    const unsub = store.subscribeSelector((s) => s.a.x, Object.is, cb)
    store.state.b = 1
    expect(cb).toHaveBeenCalledTimes(0)
    store.state.a.x = 2
    expect(cb).toHaveBeenCalledTimes(1)
    unsub()
    store.state.a.x = 3
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('getSnapshot returns stable value', () => {
    const store = createStore({ a: 1 })
    const s1 = store.getSnapshot()
    const s2 = store.getSnapshot()
    expect(s1).toBe(s2)
    store.state.a = 2
    const s3 = store.getSnapshot()
    expect(s3.a).toBe(2)
  })
})


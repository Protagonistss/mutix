import { describe, it, expect, vi } from 'vitest'
import { createStore } from '../src/index'

describe('createStore', () => {
  it('should create store with initial state', () => {
    const store = createStore({ count: 0 })
    expect(store.state.count).toBe(0)
    expect(store.snapshot).toEqual({ count: 0 })
  })

  it('should update state and notify listeners', () => {
    const store = createStore({ count: 0 })
    const listener = vi.fn()
    
    const unsubscribe = store.subscribe(listener)
    
    store.state.count++
    
    expect(store.state.count).toBe(1)
    expect(listener).toHaveBeenCalledTimes(1)
    
    unsubscribe()
    store.state.count++
    expect(listener).toHaveBeenCalledTimes(1) // Should not be called again
  })

  it('should handle nested objects', () => {
    const store = createStore({ 
      user: { 
        name: 'Bar',
        profile: { age: 18 } 
      } 
    })
    const listener = vi.fn()
    store.subscribe(listener)

    store.state.user.name = 'Protagonist'
    expect(store.state.user.name).toBe('Protagonist')
    expect(listener).toHaveBeenCalledTimes(1)

    store.state.user.profile.age = 19
    expect(store.state.user.profile.age).toBe(19)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('should handle property deletion', () => {
    const store = createStore<{ a?: number }>({ a: 1 })
    const listener = vi.fn()
    store.subscribe(listener)

    delete store.state.a
    expect(store.state.a).toBeUndefined()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

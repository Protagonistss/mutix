import { describe, it, expect } from 'vitest'
import { createMutix } from '../src/index'

describe('mutix', () => {
  it('should create store', () => {
    const store = createMutix({ count: 0 })
    expect(store).toBeDefined()
    // expect(store.state.count).toBe(0) // Not implemented yet
  })
})

import { describe, it, expect } from 'vitest'
import { mutix } from '../index'

describe('mutix', () => {
  it('should return hello', () => {
    expect(mutix()).toBe('Hello Mutix')
  })
})

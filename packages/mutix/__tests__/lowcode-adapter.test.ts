import { describe, expect, test, vi } from 'vitest'
import { ContextManager } from '../src/context/manager'
import { createLowCodeAdapter } from '../src/adapters/lowcode'

describe('LowCodeAdapter', () => {
  test('should reuse base adapter capabilities', () => {
    const manager = new ContextManager()
    const adapter = createLowCodeAdapter(manager, 'root')
    
    // Test base write/read
    adapter.setValue('user.name', 'Alice')
    expect(adapter.getValue('user.name')).toBe('Alice')
    expect(adapter.getSnapshot()).toEqual({ user: { name: 'Alice' } })
  })

  test('should support expression evaluation with default sandbox', () => {
    const manager = new ContextManager()
    const adapter = createLowCodeAdapter(manager, 'root')
    
    adapter.setValue('a', 10)
    adapter.setValue('b', 20)
    
    // Eval simple math
    expect(adapter.eval('a + b')).toBe(30)
    
    // Eval string concat
    adapter.setValue('str', 'hello')
    expect(adapter.eval('str + " world"')).toBe('hello world')
  })

  test('should support externals injection', () => {
    const manager = new ContextManager()
    const adapter = createLowCodeAdapter(manager, 'root', {
      externals: {
        toUpper: (s: string) => s.toUpperCase(),
        PI: 3.14
      }
    })
    
    adapter.setValue('name', 'bob')
    
    expect(adapter.eval('toUpper(name)')).toBe('BOB')
    expect(adapter.eval('PI * 2')).toBe(6.28)
    
    // Runtime injection
    adapter.setExternal('offset', 100)
    expect(adapter.eval('offset + 1')).toBe(101)
  })

  test('should support custom evaluator', () => {
    const manager = new ContextManager()
    const mockEvaluator = vi.fn((expr, ctx) => {
      if (expr === 'custom_expr') return ctx.value * 2
      return 'fallback'
    })
    
    const adapter = createLowCodeAdapter(manager, 'root', {
      evaluator: mockEvaluator
    })
    
    adapter.setValue('value', 21)
    
    const result = adapter.eval('custom_expr')
    expect(result).toBe(42)
    expect(mockEvaluator).toHaveBeenCalledTimes(1)
    
    // Check context passed to evaluator
    const contextArg = mockEvaluator.mock.calls[0][1]
    expect(contextArg.value).toBe(21)
  })

  test('should handle scope chain in eval', () => {
    const manager = new ContextManager()
    
    // Parent scope
    manager.createContext('parent', { theme: 'dark' })
    // Child scope
    manager.createContext('child', { user: 'me' }, 'parent')
    
    const adapter = createLowCodeAdapter(manager, 'child')
    
    // Should access own and parent data
    expect(adapter.eval('user')).toBe('me')
    expect(adapter.eval('theme')).toBe('dark')
    expect(adapter.eval('user + "-" + theme')).toBe('me-dark')
  })

  test('should prioritize: local context > externals > store', () => {
    const manager = new ContextManager()
    const adapter = createLowCodeAdapter(manager, 'root', {
      externals: { a: 'external' }
    })
    adapter.setValue('a', 'store')
    
    // 1. Local overrides everything
    expect(adapter.eval('a', { a: 'local' })).toBe('local')
    
    // 2. External overrides store
    expect(adapter.eval('a')).toBe('external')
    
    // 3. Store fallback (if external removed/not present)
    const adapter2 = createLowCodeAdapter(manager, 'root')
    adapter2.setValue('a', 'store')
    expect(adapter2.eval('a')).toBe('store')
  })
  
  test('withScope should return new LowCodeAdapter', () => {
    const manager = new ContextManager()
    const adapter = createLowCodeAdapter(manager, 'root')
    
    const childAdapter = adapter.withScope!('child')
    
    // Check if it has LowCode specific methods
    expect(typeof (childAdapter as any).eval).toBe('function')
    expect(typeof (childAdapter as any).setExternal).toBe('function')
  })
})

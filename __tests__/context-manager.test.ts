import { describe, it, expect, vi } from 'vitest'
import {
  ContextManager,
  createContext,
  destroyContext,
  getValue,
  setValue,
  subscribeValue
} from '../src/context/manager'

describe('ContextManager', () => {
  it('create and resolve values with fallback', () => {
    const appId = 'app'
    const pageId = 'page1'
    const compId = 'comp1'
    createContext(appId, { vars: { theme: 'light' } })
    createContext(pageId, { vars: { title: 'Home' } }, appId)
    createContext(compId, { state: { visible: false } }, pageId)

    expect(getValue(compId, 'state.visible')).toBe(false)
    expect(getValue(compId, 'vars.title')).toBe('Home')
    expect(getValue(compId, 'vars.theme')).toBe('light')

    setValue(compId, 'state.visible', true)
    expect(getValue(compId, 'state.visible')).toBe(true)
  })

  it('subscribeValue reacts to path changes', () => {
    const pageId = 'page2'
    createContext(pageId, { vars: { count: 0 } })
    const cb = vi.fn()
    const unsub = subscribeValue(pageId, 'vars.count', cb)
    setValue(pageId, 'vars.count', 1)
    expect(cb).toHaveBeenCalledTimes(1)
    unsub()
    setValue(pageId, 'vars.count', 2)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('destroyContext cleans up', () => {
    const pageId = 'page3'
    createContext(pageId, { vars: {} })
    destroyContext(pageId)
    expect(getValue(pageId, 'vars.x')).toBeUndefined()
  })

  it('respects fallbackOnUndefined option', () => {
    const mgr = new ContextManager({ fallbackOnUndefined: false })
    const parentId = 'parent-x'
    const childId = 'child-x'
    mgr.createContext(parentId, { vars: { theme: 'dark' } })
    mgr.createContext(childId, { vars: { theme: undefined } }, parentId)
    expect(mgr.getValue(childId, 'vars.theme')).toBeUndefined()
  })

  it('subscribeValue follows fallback chain when parent changes', () => {
    const mgr = new ContextManager()
    const parentId = 'parent-y'
    const childId = 'child-y'
    mgr.createContext(parentId, { vars: { theme: 'light' } })
    mgr.createContext(childId, {}, parentId)
    const cb = vi.fn()
    const unsub = mgr.subscribeValue(childId, 'vars.theme', cb)
    mgr.setValue(parentId, 'vars.theme', 'dark')
    expect(cb).toHaveBeenCalledWith('dark')
    unsub()
  })

  it('writePolicy bubble writes to ancestor when path exists', () => {
    const mgr = new ContextManager({ writePolicy: 'bubble' })
    const parentId = 'parent-z'
    const childId = 'child-z'
    mgr.createContext(parentId, { vars: { lang: 'en' } })
    mgr.createContext(childId, {}, parentId)
    mgr.setValue(childId, 'vars.lang', 'fr')
    expect(mgr.getValue(parentId, 'vars.lang')).toBe('fr')
  })
})

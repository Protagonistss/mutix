export { createStore, createCoreStore } from './store'
export type { Store, CoreStore, BaseStore } from './types'
export * from './types'
export {
  ContextManager,
  createContext,
  destroyContext,
  getValue,
  setValue,
  deleteValue,
  subscribeValue,
  getStore
} from './context/manager'
export { attachLogger, loggerPlugin } from './plugins/logger'
export { attachDevTools, devtoolsPlugin } from './plugins/devtools'


// Core Adapter API (types & factory)
export * from './adapter'

// Built-in Adapters (implementations)
export * from './adapters'

import { createStore, createCoreStore } from './store'
import {
  ContextManager,
  createContext,
  destroyContext,
  getValue,
  setValue,
  deleteValue,
  subscribeValue,
  getStore
} from './context/manager'
import { attachLogger, loggerPlugin } from './plugins/logger'
import { attachDevTools, devtoolsPlugin } from './plugins/devtools'

// Keep named exports unchanged while adding default export compatibility.
const mutix = {
  createStore,
  createCoreStore,
  ContextManager,
  createContext,
  destroyContext,
  getValue,
  setValue,
  deleteValue,
  subscribeValue,
  getStore,
  attachLogger,
  loggerPlugin,
  attachDevTools,
  devtoolsPlugin
}

export default mutix

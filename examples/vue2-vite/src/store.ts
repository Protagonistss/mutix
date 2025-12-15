import { createStore, ContextManager, createLowCodeAdapter } from 'mutix'

// Existing simple store
export interface AppState {
  count: number
  user: {
    name: string
  }
}

export const store = createStore<AppState>({
  count: 0,
  user: {
    name: 'Vue 2 User'
  }
})

export const increment = () => {
  store.state.count++
}

export const updateName = (name: string) => {
  store.state.user.name = name
}

// --- LowCode 3-Layer Demo Setup ---

export const manager = new ContextManager()

// 1. App Layer (Root)
// Contains global config and user info
manager.createContext('app', {
  theme: 'dark',
  user: 'Admin',
  config: {
    env: 'production',
    version: '1.0.0'
  }
})

// 2. Page Layer (Child of App)
// Contains page-specific title and status
manager.createContext('page-1', {
  title: 'Dashboard',
  status: 'active',
  // Inherits 'theme', 'user', 'config' from app
}, 'app')

// 3. Component Layer (Child of Page)
// Contains local state, and shadows 'theme'
manager.createContext('comp-1', {
  theme: 'light', // Shadows app theme
  counter: 0,
  localName: 'Widget A'
}, 'page-1')

// Create adapters for UI interaction
export const appAdapter = createLowCodeAdapter(manager, 'app')
export const pageAdapter = createLowCodeAdapter(manager, 'page-1')
export const compAdapter = createLowCodeAdapter(manager, 'comp-1', {
  externals: {
    toUpper: (s: string) => s?.toUpperCase() || ''
  }
})

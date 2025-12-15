import { createStore } from 'mutix'

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

<template>
  <div class="app">
    <h1>Mutix + Vue 2 Example</h1>
    <div class="card">
      <p>Count is: {{ count }}</p>
      <button @click="inc">Increment</button>
    </div>
    <div class="card">
      <p>User: {{ name }}</p>
      <input :value="name" @input="onInput" />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { store, increment, updateName } from './store'

export default Vue.extend({
  data() {
    return {
      count: store.state.count,
      name: store.state.user.name,
      unsubscribe: null as null | (() => void)
    }
  },
  mounted() {
    // Subscribe to store changes to update local state
    // Since Mutix uses Proxy which Vue 2 doesn't observe automatically
    this.unsubscribe = store.subscribe(() => {
      this.count = store.state.count
      this.name = store.state.user.name
    })
  },
  beforeDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
  },
  methods: {
    inc() {
      increment()
    },
    onInput(e: Event) {
      const target = e.target as HTMLInputElement
      updateName(target.value)
    }
  }
})
</script>

<style scoped>
.app {
  font-family: sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}
.card {
  border: 1px solid #ccc;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 4px;
}
</style>

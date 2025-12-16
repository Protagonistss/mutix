<template>
  <div id="app">
    <list-page />
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import ListPage from './pages/list/index.vue'

export default Vue.extend({
  name: 'App',
  components: {
    ListPage
  }
})
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>

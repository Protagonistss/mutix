<template>
  <div class="app">
    <h1>Mutix + Vue 2 Example</h1>
    
    <!-- Original Store Demo -->
    <div class="card">
      <h3>Standard Store</h3>
      <p>Count is: {{ count }}</p>
      <button @click="inc">Increment</button>
      <div style="margin-top: 10px">
        <label>User: </label>
        <input :value="name" @input="onInput" />
      </div>
    </div>

    <!-- LowCode 3-Layer Demo -->
    <div class="lowcode-demo">
      <h2>LowCode Scope Hierarchy</h2>
      
      <!-- App Layer -->
      <div class="layer-card app-layer">
        <div class="layer-header">
          <span class="badge">App Scope</span>
          <span class="info">Theme: {{ appData.theme }} (Dark)</span>
        </div>
        <div class="control-group">
          <label>Global User:</label>
          <input :value="appData.user" @input="e => updateAppUser(e.target.value)" />
        </div>
      </div>

      <!-- Page Layer -->
      <div class="layer-card page-layer">
        <div class="layer-header">
          <span class="badge">Page Scope (Inherits App)</span>
          <span class="info">Parent: App</span>
        </div>
        <div class="control-group">
          <label>Page Title:</label>
          <input :value="pageData.title" @input="e => updatePageTitle(e.target.value)" />
        </div>
      </div>

      <!-- Component Layer -->
      <div class="layer-card comp-layer">
        <div class="layer-header">
          <span class="badge">Component Scope</span>
          <span class="info">Theme: {{ compData.theme }} (Shadows App)</span>
        </div>
        
        <div class="eval-box">
          <h4>Dynamic Expression Evaluator</h4>
          <p class="hint">Try accessing: user, title, theme, toUpper(user)</p>
          <textarea v-model="expression" placeholder="Enter expression..."></textarea>
          
          <div class="result-display">
            <strong>Result: </strong>
            <span :class="{ error: isError }">{{ evalResult }}</span>
          </div>
        </div>

        <div class="data-preview">
          <h4>Resolved Data (Inheritance Check)</h4>
          <ul>
            <li><strong>user (from App):</strong> {{ compResolved.user }}</li>
            <li><strong>title (from Page):</strong> {{ compResolved.title }}</li>
            <li><strong>theme (Shadowed):</strong> {{ compResolved.theme }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { 
  store, increment, updateName, 
  appAdapter, pageAdapter, compAdapter 
} from './store'

export default Vue.extend({
  data() {
    return {
      // Standard store
      count: store.state.count,
      name: store.state.user.name,
      
      // LowCode state
      appData: appAdapter.getSnapshot(),
      pageData: pageAdapter.getSnapshot(),
      compData: compAdapter.getSnapshot(),
      
      // Resolved values from component perspective
      compResolved: {
        user: compAdapter.getValue('user'),
        title: compAdapter.getValue('title'),
        theme: compAdapter.getValue('theme')
      },
      
      // Expression playground
      expression: "toUpper(user) + ' is viewing ' + title + ' (' + theme + ')'",
      evalResult: '',
      isError: false,
      
      unsubscribers: [] as Array<() => void>
    }
  },
  mounted() {
    // Standard store sub
    this.unsubscribers.push(store.subscribe(() => {
      this.count = store.state.count
      this.name = store.state.user.name
    }))

    // App Layer sub
    this.unsubscribers.push(appAdapter.subscribe(() => {
      this.appData = { ...appAdapter.getSnapshot() }
      this.refreshCompResolved()
    }))

    // Page Layer sub
    this.unsubscribers.push(pageAdapter.subscribe(() => {
      this.pageData = { ...pageAdapter.getSnapshot() }
      this.refreshCompResolved()
    }))

    // Component Layer sub
    this.unsubscribers.push(compAdapter.subscribe(() => {
      this.compData = { ...compAdapter.getSnapshot() }
      this.refreshCompResolved()
    }))

    // Initial eval
    this.runEval()
  },
  watch: {
    expression: 'runEval',
    // Re-run eval when any data changes
    compResolved: {
      deep: true,
      handler: 'runEval'
    }
  },
  beforeDestroy() {
    this.unsubscribers.forEach(u => u())
  },
  methods: {
    inc() {
      increment()
    },
    onInput(e: Event) {
      const target = e.target as HTMLInputElement
      updateName(target.value)
    },
    
    // LowCode Updates
    updateAppUser(val: string) {
      appAdapter.setValue('user', val)
    },
    updatePageTitle(val: string) {
      pageAdapter.setValue('title', val)
    },
    
    refreshCompResolved() {
      this.compResolved = {
        user: compAdapter.getValue('user'),
        title: compAdapter.getValue('title'),
        theme: compAdapter.getValue('theme')
      }
    },
    
    runEval() {
      try {
        this.isError = false
        this.evalResult = compAdapter.eval(this.expression)
      } catch (e) {
        this.isError = true
        this.evalResult = 'Error: ' + (e as Error).message
      }
    }
  }
})
</script>

<style scoped>
.app {
  font-family: 'Segoe UI', sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  color: #333;
}

.card {
  border: 1px solid #ddd;
  padding: 1rem;
  margin-bottom: 2rem;
  border-radius: 8px;
  background: #f9f9f9;
}

.lowcode-demo {
  border-top: 2px solid #eee;
  padding-top: 1rem;
}

.layer-card {
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
  position: relative;
  transition: all 0.3s ease;
}

.app-layer { background: #e3f2fd; border-color: #bbdefb; }
.page-layer { background: #e8f5e9; border-color: #c8e6c9; margin-left: 20px; }
.comp-layer { background: #fff3e0; border-color: #ffe0b2; margin-left: 40px; }

.layer-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.badge {
  font-weight: bold;
  text-transform: uppercase;
  font-size: 0.8rem;
  background: rgba(0,0,0,0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.control-group {
  margin-top: 0.5rem;
}

.control-group label {
  display: inline-block;
  width: 80px;
  font-weight: 500;
}

.eval-box {
  background: #fff;
  border: 1px solid #ffe0b2;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
}

textarea {
  width: 100%;
  height: 60px;
  margin: 5px 0;
  padding: 5px;
  font-family: monospace;
}

.result-display {
  background: #f5f5f5;
  padding: 5px;
  border-radius: 4px;
  font-family: monospace;
}

.data-preview {
  margin-top: 10px;
  font-size: 0.85rem;
  color: #666;
}

.data-preview ul {
  list-style: none;
  padding: 0;
  margin: 5px 0;
}
</style>

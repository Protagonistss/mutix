# Mutix

A lightweight, high-performance state management library based on `Proxy`, designed for low-code, multi-platform, and complex transaction scenarios.

## Design Goals
- **Single Source of Truth**: A Proxy-driven Store serves as the source of truth, intercepting and dispatching all changes.
- **Progressive Enhancement**: Keeps the core minimal while supporting complex needs through Batch, Selectors, and Plugins.
- **Context Layering**: Adapts to App/Page/Component hierarchies, supporting scope isolation and parent chain fallback.

## Core Capabilities
1) **Reactive State**: Directly modify `store.state` to trigger subscriptions without boilerplate.
2) **Batch Updates**: `store.batch(fn)` merges multiple writes into a single notification.
3) **Selector Subscriptions**: `subscribeSelector` triggers only when the selected slice changes.
4) **Stable Snapshots**: `store.getSnapshot()` provides a read-only view of the current state.

## LowCode Adapter
Designed specifically for low-code scenarios, separating **Business Logic (Externals)** from **Data State (Store)** to achieve logic reuse and state isolation.

- **Logic Definition**: Define a set of business logic (e.g., `fetchList`, `submitForm`) via `createLowCodeAdapter`.
- **State Isolation**: Bind the same logic to different Scope IDs via `withScope(id)` to achieve multi-instance reuse.
- **Dynamic Execution**: Built-in `eval(expression)` capability for safe logic execution in low-code environments.

## Best Practices: Component Libraries & Multi-Instance Reuse

When building reusable business component libraries, the **Dependency Injection** pattern is recommended:

1.  **Project-Level Singleton**: The host application (App) is responsible for creating a globally unique `ContextManager`.
2.  **Dependency Injection**: Pass the Manager to components via Props or Provide/Inject.
3.  **Dynamic Binding**: Inside the component, dynamically create adapter instances using `adapter.withScope(id)` based on the passed `scopeId`.

```typescript
// Component Implementation Example
const props = defineProps(['scopeId'])
const manager = inject('contextManager') // Inject global Manager
const adapter = pageAdapterDef.withScope(props.scopeId) // Bind to current component instance
```

This pattern perfectly solves the "multi-instance state conflict" problem and is the standard solution for building reusable business components.

## Quick Start
```typescript
import { createStore } from 'mutix'

const store = createStore({ count: 0, user: { name: 'Bar' } })

// Subscribe to changes
const unsub = store.subscribe(() => {
  console.log('count =', store.snapshot.count)
})

store.state.count++
```

## Context Management
- Provide context Store based on scope ID: `createContext(scopeId, initial?, parentScopeId?)`.
- **Symbol ID**: Using `Symbol('page-id')` as Scope ID is recommended to completely avoid ID conflicts.
- **Scope Inheritance**: Child Scopes can read data from Parent Scopes (e.g., Modal reading Page data).

## Plugin System
- Logger: `attachLogger(store)` subscribes to changes and outputs logs.
- Extensible Action/Patch pipeline supporting Undo/Redo, Persistence, etc.

## Directory Structure
- `packages/mutix/`: Core library source code
- `examples/vue2-vite/`: Vue 2.7 + Vite integration example (including LowCode Adapter demo)

## Development Guide
This project uses pnpm workspace.

```bash
pnpm install
pnpm -r run build
pnpm -r run test
```

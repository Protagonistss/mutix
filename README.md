# Mutix

A lightweight, high-performance state management library based on `Proxy`, designed for low-code, multi-platform, and complex transaction scenarios.

## Documentation

- [中文文档](./README.zh.md) (Detailed Chinese Documentation)
- [English Documentation](./README.en.md) (Detailed English Documentation)

## Installation

```bash
npm install mutix
# or
pnpm add mutix
# or
yarn add mutix
```

## Features at a Glance

- **Proxy-driven**: Single source of truth, reactive by default.
- **Context Management**: Scope-based state isolation with inheritance support.
- **LowCode Adapter**: Decouple business logic from state for maximum reusability.
- **Plugin System**: Extensible architecture for logging, persistence, and devtools.

## Quick Start

```typescript
import { createStore } from 'mutix'

const store = createStore({ count: 0 })

store.subscribe(() => {
  console.log(store.snapshot.count)
})

store.state.count++
```

For more advanced usage like **LowCode Adapter** and **Component Library Integration**, please refer to the detailed documentation linked above.

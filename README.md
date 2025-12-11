# Mutix

一个基于 `Proxy` 的轻量级、高性能状态管理库，专为低代码平台与复杂交互场景设计。

## 核心设计理念

本项目旨在提供一个**内聚、可控且高性能**的状态管理内核。

- **单一可信内核**：以 `Proxy` 驱动的 `Store` 为核心，所有状态变更收敛于此。
- **渐进式增强**：在保持内核轻量的基础上，通过增量扩展（Batch, Selectors）满足复杂需求。
- **分层上下文**：针对低代码场景，提供基于层级（App -> Page -> Component）的上下文管理能力。

## 核心特性 (Core Features)

### 1. 响应式状态 (Reactive State)
基于 ES6 `Proxy`，支持深层对象的直接修改与自动通知。无需样板代码，直接操作 `store.state` 即可。

### 2. 批处理 (Batch Updates)
提供 `batch` API，支持将多次状态修改聚合为一次通知，避免高频交互下的渲染风暴。
```typescript
store.batch(() => {
  store.state.count++;
  store.state.text = "updated";
}); // 仅触发一次订阅通知
```

### 3. 精确订阅 (Selector Subscription)
支持基于选择器（Selector）的细粒度订阅。仅当派生值发生变化时才触发回调，内置浅比较优化。
```typescript
store.subscribeSelector(
  (state) => state.user.name,
  (newName) => console.log('Name changed:', newName)
);
```

### 4. 稳定快照 (Stable Snapshots)
明确的 `snapshot` 语义，提供状态的只读视图，确保渲染期的数据一致性。

---

## 低代码上下文管理 (Context Management)

针对低代码平台“组件交互产生数据、需要上下文取值与更新”的诉求，我设计了 `ContextManager`。

### 设计模式：层级多 Store + 就近回退
- **独立作用域**：为 App、Page、Component 创建独立的 Store 实例。
- **层级关系**：支持父子作用域关联（如 Component -> Page -> App）。
- **读写分离策略**：
  - **读 (Read)**：就近查找，未命中则沿父链向上回退（Scope Hoisting）。
  - **写 (Write)**：默认写入当前作用域，保证组件状态的内聚性，避免隐式修改全局状态。

### ContextManager API

```typescript
import { ContextManager } from './src/context/manager';

const ctx = new ContextManager();

// 1. 创建上下文
ctx.createContext('app-root', { theme: 'dark' });
ctx.createContext('page-1', { title: 'Home' }, 'app-root'); // 关联父级

// 2. 取值 (支持路径与回退)
// 在 page-1 找不到 theme，会自动向上回退到 app-root 查找
const theme = ctx.getValue('page-1', 'theme'); 

// 3. 更新 (支持路径)
ctx.setValue('page-1', 'formData.name', 'Protagonist');

// 4. 订阅 (支持路径)
ctx.subscribeValue('page-1', 'formData.name', (val) => {
  console.log('Name updated:', val);
});
```

---

## 目录结构

- `src/store.ts`: 核心状态库实现（State, Proxy, Batch, Selector）。
- `src/context/`: 上下文管理模块。
  - `manager.ts`: 作用域管理、层级解析。
  - `paths.ts`: 路径解析与选择器适配工具。
- `src/plugins/`: 插件系统（如 Logger）。

## 快速开始

### 安装
```bash
npm install
```

### 测试
```bash
npm run test
```

## 演进路线

1.  **Core**: 基础 Proxy Store (已完成)
2.  **Enhancement**: Batch & Selectors (已完成)
3.  **Context**: ContextManager & Scoping (已完成)
4.  **Plugins**: Logger (已完成), Persistence (计划中)
5.  **Adapters**: React Hooks / Vue Composables (计划中)

# Mutix

一款基于 `Proxy` 的轻量高性能状态管理库，面向低代码、多端与复合交易等场景。

## 设计目标
- 单一可变源：以 Proxy 驱动的 Store 作为真值源，所有变更都可被截获与分发。
- 渐进式增强：在保持核心精简的前提下，通过 Batch、Selector、插件体系满足复杂需求。
- 上下文分层：适配 App/Page/Component 等层级场景，支持作用域隔离与父链回退。

## 核心能力
1) **响应式状态**：直接修改 `store.state` 即可触发订阅，无需样板代码。
2) **批量更新**：`store.batch(fn)` 将多次写合并为一次通知，降低抖动。
3) **选择器订阅**：`subscribeSelector` 仅在选中片段变化时触发。
4) **稳定快照**：`store.getSnapshot()` 提供当前状态的只读视图。

## 低代码适配器 (LowCode Adapter)
专为低代码场景设计，核心思想是将**业务逻辑（Externals）**与**数据状态（Store）**解耦，实现逻辑复用与状态隔离。

- **逻辑定义**：通过 `createLowCodeAdapter` 定义一套业务逻辑（如 `fetchList`, `submitForm`）。
- **状态隔离**：通过 `withScope(id)` 将同一套逻辑绑定到不同的 Scope ID，实现多实例复用。
- **动态执行**：内置 `eval(expression)` 能力，支持在低代码环境中安全执行逻辑。

## 最佳实践：组件库与多实例复用

在构建通用业务组件库时，推荐采用 **依赖注入 (Dependency Injection)** 模式：

1.  **项目级单例**：宿主应用（App）负责创建全局唯一的 `ContextManager`。
2.  **依赖注入**：通过 Props 或 Provide/Inject 将 Manager 传递给组件。
3.  **动态绑定**：组件内部根据传入的 `scopeId`，使用 `adapter.withScope(id)` 动态创建适配器实例。

```typescript
// 组件内部实现示例
const props = defineProps(['scopeId'])
const manager = inject('contextManager') // 注入全局 Manager
const adapter = pageAdapterDef.withScope(props.scopeId) // 绑定到当前组件实例
```

这种模式完美解决了“多实例状态冲突”问题，是构建可复用业务组件的标准解法。

## 快速上手
```typescript
import { createStore } from 'mutix'

const store = createStore({ count: 0, user: { name: 'Bar' } })

// 订阅整体变更
const unsub = store.subscribe(() => {
  console.log('count =', store.snapshot.count)
})

store.state.count++
```

## 上下文管理
- 提供基于作用域 ID 的上下文 Store：`createContext(scopeId, initial?, parentScopeId?)`。
- 支持 **Symbol ID**：推荐使用 `Symbol('page-id')` 作为 Scope ID，彻底避免 ID 冲突。
- 支持 **Scope 继承**：子 Scope 可以读取父 Scope 的数据（如 Modal 读取 Page 数据）。

## 插件体系
- Logger：`attachLogger(store)`，订阅变更并输出日志。
- 可扩展 Action/Patch 管线，支持撤销重做、持久化等高级功能。

## 目录结构
- `packages/mutix/`: 核心库源代码
- `examples/vue2-vite/`: Vue 2.7 + Vite 集成示例（包含 LowCode Adapter 演示）

## 开发指引
本项目使用 pnpm workspace 管理。

```bash
pnpm install
pnpm -r run build
pnpm -r run test
```

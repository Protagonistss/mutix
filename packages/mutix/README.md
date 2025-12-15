# Mutix

一款基于 `Proxy` 的轻量高性能状态管理库，面向低代码、多端与复合交易等场景。

## 设计目标
- 单一可变源：以 Proxy 驱动的 Store 作为真值源，所有变更都可被截获与分发。
- 渐进式增强：在保持核心精简的前提下，通过 Batch、Selector、插件体系满足复杂需求。
- 上下文分层：适配 App/Page/Component 等层级场景，支持作用域隔离与父链回退。

## 核心能力（已实现）
1) 响应式状态：直接修改 `store.state` 即可触发订阅，无需样板代码。
2) 批量更新：`store.batch(fn)` 将多次写合并为一次通知，降低抖动。
3) 选择器订阅：`subscribeSelector(selector, equalityFn?, cb?)` 仅在选中片段变化时触发。
4) 稳定快照：`store.snapshot`/`store.getSnapshot()` 提供当前状态的只读视图（引用稳定）。

## 扩展能力（新增）
- 只读快照选项：`store.getReadonlySnapshot({ freeze?, shallow? })` 支持冻结或浅/深拷贝。
- 插件与管线：`store.use(plugin)`、`dispatch(action)`、`applyPatch(patch)`，插件可监听 write/action/patch/notify/error。
- 选择器增强：支持路径字符串 selector、可选 `scheduler`/`throttleMs`。
- 示例插件：Logger 作为插件挂载（`loggerPlugin`/`attachLogger`）。

## 快速上手
```typescript
import { createStore } from 'mutix'

const store = createStore({ count: 0, user: { name: 'Bar' } })

// 订阅整体变更
const unsub = store.subscribe(() => {
  console.log('count =', store.snapshot.count)
})

store.state.count++        // 通知一次
store.batch(() => {
  store.state.count += 1   // 批内多次写
  store.state.user.name = 'Protagonist'
})                         // 批结束后再通知一次

// 订阅切片
const unsubName = store.subscribeSelector(
  (s) => s.user.name,
  Object.is,
  (name) => console.log('name ->', name)
)

// 快照读取
const snap = store.getSnapshot()
console.log('snapshot name', snap.user.name)

unsub()
unsubName()
```

## 上下文管理（当前）
- 提供基于作用域 ID 的上下文 Store：`createContext(scopeId, initial?, parentScopeId?)` / `destroyContext(scopeId)`。
- 支持类实例：`new ContextManager({ fallbackOnUndefined?, writePolicy? })`，可并存多棵树。
- 读取：`getValue(scopeId, path)`，默认遇到 `undefined` 会向父作用域回退查找。
- 写入：`setValue(scopeId, path, value)`，默认只写当前作用域；`writePolicy: 'bubble'` 可向上冒泡写入已有路径。
- 订阅：`subscribeValue(scopeId, pathOrSelector, cb, equalityFn?)` 支持路径或自定义 selector。
- 用法示例：
```typescript
import { createContext, getValue, setValue, subscribeValue } from 'mutix/context/manager'

const appId = 'app'
const pageId = 'page1'
const compId = 'comp1'
createContext(appId, { vars: { theme: 'light' } })
createContext(pageId, { vars: { title: 'Home' } }, appId)
createContext(compId, { state: { visible: false } }, pageId)

console.log(getValue(compId, 'vars.theme')) // light（向上回退）
setValue(compId, 'state.visible', true)
const unsub = subscribeValue(compId, 'state.visible', (v) => console.log('visible ->', v))
```

## 插件（当前）
- Logger：`attachLogger(store, logFn?)`，订阅变更并输出 `{ type: 'change', snapshot, time }`。

## 目录结构
- `src/store/core.ts`：纯内核 Store（Proxy、Batch、Selector、只读快照）。
- `src/store/extensions.ts`：增强层（插件管线、dispatch、applyPatch）。
- `src/store/index.ts`：Store 出口，默认导出增强版，同时导出 `createCoreStore`。
- `src/context/`：上下文管理（路径工具与作用域管理）。
- `src/plugins/`：插件示例（Logger）。
- `__tests__/`：核心、扩展、上下文测试。

## 开发指引
```bash
npm install
npm run test
npm run build
```

## 迭代路线 / 执行计划

**阶段路线（状态）**
1. Core: 基础 Proxy Store（已完成）
2. Enhancement: Batch & Selectors（已完成）
3. Context: ContextManager & Scoping（已完成基础版本）
4. Plugins: Logger（已完成）、Persistence（规划中）
5. Adapters: React Hooks / Vue Composables（规划中）

**近期执行**
1) 统一约定与类型：定义 CoreStore/Plugin/Action/Patch/ContextManager 类型，约束状态修改入口、通知顺序、错误隔离。
2) Store 重构：WeakMap 缓存嵌套代理；只读快照 API（冻结/浅深拷贝选项）；selector 支持路径和自定义调度；批量合并通知。
3) 插件与 action 管线：提供 dispatch/applyPatch；插件生命周期 hook（before/after write、action、patch、notify、error）；Logger/DevTools/Persistence 基于此。
4) Context 管理：ContextManager 类封装多棵树；配置写入/回退策略；支持跨作用域订阅；销毁清理。
5) 测试与文档：补充边界/性能测试；更新文档示例（含适配器用法）；明确错误策略。

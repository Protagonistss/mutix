import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  target: 'es2019', // 避免产出 ??、?. 等 ES2020 语法，兼容未转译 node_modules 的构建环境
  dts: true,
  clean: true,
  sourcemap: true,
})

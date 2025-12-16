import { Evaluator } from './types'

export type { Evaluator }

/**
 * Default sandbox implementation using 'new Function' + 'with'
 */
export const defaultEvaluator: Evaluator = (expression, context) => {
  try {
    // Using 'with' to emulate a scope where properties are variables
    const fn = new Function('context', `with(context) { return ${expression} }`)
    return fn(context)
  } catch (e) {
    console.warn(`[Evaluator] Expression evaluation failed: "${expression}"`, e)
    return undefined
  }
}

export const splitPath = (path: string) => path.split('.').filter(Boolean)

export const getByPath = (obj: any, path: string) => {
  const keys = splitPath(path)
  let cur = obj
  for (const k of keys) {
    if (cur == null) return undefined
    cur = cur[k]
  }
  return cur
}

export const setByPath = (obj: any, path: string, value: any) => {
  const keys = splitPath(path)
  let cur = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    if (cur[k] == null || typeof cur[k] !== 'object') {
      cur[k] = {}
    }
    cur = cur[k]
  }
  cur[keys[keys.length - 1]] = value
}

export const toSelector = (
  pathOrSelector: string | ((s: any) => any)
): ((s: any) => any) => {
  if (typeof pathOrSelector === 'string') {
    return (s: any) => getByPath(s, pathOrSelector)
  }
  return pathOrSelector
}


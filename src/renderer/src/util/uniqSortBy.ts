export const uniqSortBy = <T, K>(
  array: T[],
  toKey: (value: T) => K,
  sortBy: (value: T) => number
): T[] => {
  const map = new Map<K, T[]>()
  const sortValues = new Map<T, number>()
  const keys: K[] = []
  for (let i = 0; i < array.length; i++) {
    const item = array[i]
    const key = toKey(item)
    keys.push(key)
    sortValues.set(item, sortBy(item))
    let group = map.get(key)
    if (!group) {
      group = []
      map.set(key, group)
    }
    group.push(item)
  }
  for (const group of map.values()) {
    group.sort((a, b) => sortValues.get(a)! - sortValues.get(b)!)
  }
  return array.filter((item, i) => {
    const key = keys[i]
    return map.get(key)![0] === item
  })
}

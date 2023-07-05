export const set = <T>(set: Set<T>) => ({
  add: (value: T) => {
    const newSet = new Set(set)
    newSet.add(value)
    return newSet
  },
  delete: (value: T) => {
    const newSet = new Set(set)
    newSet.delete(value)
    return newSet
  }
})

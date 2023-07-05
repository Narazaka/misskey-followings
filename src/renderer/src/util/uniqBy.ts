export const uniqBy = <T>(array: T[], toKey: (value: T) => unknown): T[] => {
  const seen = new Set()
  return array.filter((item) => {
    const key = toKey(item)
    return seen.has(key) ? false : seen.add(key)
  })
}

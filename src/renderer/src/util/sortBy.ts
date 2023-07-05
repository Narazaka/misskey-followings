export const sortBy = <T, K extends number | string>(array: T[], by: (value: T) => K): T[] => {
  const sorts = new Map<T, K>()
  for (let i = 0; i < array.length; i++) {
    sorts.set(array[i], by(array[i]))
  }
  return array.sort((a, b) => {
    const sortA = sorts.get(a)!
    const sortB = sorts.get(b)!
    if (sortA < sortB) return -1
    if (sortA > sortB) return 1
    return 0
  })
}

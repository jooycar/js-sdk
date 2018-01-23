export const internalProp = store => obj => {
  if (!store.has(obj)) {
    store.set(obj, {})
  }

  return  store.get(obj)
}
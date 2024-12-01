export const handleObjectUpdate = (
  payload: Record<string, any>,
  updatedData: Record<string, any>,
  prefix: string
) => {
  if (payload && Object.keys(payload).length > 0) {
    Object.keys(payload).forEach(key => {
      // Construct the dynamic key with the prefix
      const updatedKey = `${prefix}.${key}`

      // Assign the value from payload to updatedData with the new key
      updatedData[updatedKey] = payload[key]
    })
  }

  return updatedData
}

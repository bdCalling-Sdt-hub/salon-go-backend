import { userSearchableFields } from './user.constants'
import { User } from './user.model'

const getLastIdBasedOnRole = async (role: string) => {
  const lastCustomId = await User.findOne({ role: role }, { id: 1, _id: 0 })
    .sort({ createdAt: -1 })
    .lean()

  return lastCustomId?.id ? lastCustomId.id.substring(4) : undefined
}

export const generateCustomIdBasedOnRole = async (role: string) => {
  switch (role) {
    case 'CUSTOMER':
      return await generateCustomCustomerId()
    case 'VENDOR':
      return await generateCustomVendorId()
    case 'ADMIN':
      return await generateCustomAdminId()
  }
}

const generateCustomVendorId = async () => {
  const currentId =
    (await getLastIdBasedOnRole('VENDOR')) || (0).toString().padStart(5, '0')


  let incrementedId = (parseInt(currentId) + 1).toString().padStart(5, '0')
  incrementedId = `VD${incrementedId}`
  return incrementedId
}

const generateCustomCustomerId = async () => {
  const currentId =
    (await getLastIdBasedOnRole('CUSTOMER')) || (0).toString().padStart(5, '0')


  let incrementedId = (parseInt(currentId) + 1).toString().padStart(5, '0')
  incrementedId = `CS${incrementedId}`
  return incrementedId
}

const generateCustomAdminId = async () => {
  const currentId =
    (await getLastIdBasedOnRole('ADMIN')) || (0).toString().padStart(5, '0')


  let incrementedId = (parseInt(currentId) + 1).toString().padStart(5, '0')
  incrementedId = `AD${incrementedId}`
  return incrementedId
}

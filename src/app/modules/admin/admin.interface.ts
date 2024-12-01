import { Model } from 'mongoose'

export type IAdmin = {
  id: string
  name: string
  email: string
  contact: string
  address: string
  profileImg: string
}

export type AdminModel = Model<IAdmin>

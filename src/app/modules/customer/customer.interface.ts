import { Model } from 'mongoose'
type Point = {
  type: 'Point'
  coordinates: [number, number] // [longitude, latitude]
}

type IAddress = {
  street: string
  apartmentOrSuite: string
  city: string
  state: string
  zip: string
  country: string
}

type IDeliveryOption = 'Leave at the front door' | 'Call upon arrival'

export type ICustomer = {
  id: string
  name: string
  email: string
  contact?: string
  profileImg?: string
  address: IAddress
  deliveryOption: IDeliveryOption
  receivePromotionalNotification: boolean
  location: Point
}

export type CustomerModel = Model<ICustomer>

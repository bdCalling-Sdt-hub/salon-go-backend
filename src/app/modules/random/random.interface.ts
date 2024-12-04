import { Model, Types } from 'mongoose';
  
  export type IRandom = {
    field1: string;
  field2: Array<string>;
  field3: Types.ObjectId;
  field4: [Types.ObjectId]
  };
  
  export type RandomModel = Model<IRandom>;

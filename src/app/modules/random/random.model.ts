import { Schema, model } from 'mongoose';
  import { IRandom, RandomModel } from './random.interface';
  
  const randomSchema = new Schema<IRandom, RandomModel>({
    field1: { type: String, required: true },
  field2: {type: [String], required: true },
  field3: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  field4: {
                type: [{ type: Schema.Types.ObjectId, ref: 'customer'},],
                required: true
              }
  }, { timestamps: true });
  
  export const Random = model<IRandom, RandomModel>('Random', randomSchema);

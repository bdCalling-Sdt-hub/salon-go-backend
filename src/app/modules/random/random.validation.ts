import { z } from 'zod';
        
  const createRandomZodSchema = z.object({
    body: z.object({
      field1: z.string({ required_error:"field1 is required", invalid_type_error:"field1 should be type string" }),
      field2: z.array(z.string({ required_error:"field2 is required", invalid_type_error:"field2 array item should have type string" })),
      field3: z.string({ required_error:"field3 is required", invalid_type_error:"field3 should be type objectID or string" }),
      field4: z.array(z.string({required_error:"field4 is required", invalid_type_error:"field4 array item should have type string" }))
    }),
  });
  
  const updateRandomZodSchema = z.object({
    body: z.object({
      field1: z.string({ invalid_type_error:"field1 should be type string" }).optional(),
      field2: z.array(z.string({ invalid_type_error:"field2 array item should have type string" })).optional(),
      field3: z.string({ invalid_type_error:"field3 should be type string" }).optional(),
      field4: z.array(z.string({ invalid_type_error:"field4 array item should have type string" })).optional()
    }),
  });
  
  export const RandomValidation = {
    createRandomZodSchema,
    updateRandomZodSchema
  };

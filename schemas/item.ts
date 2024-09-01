import { z } from "zod";

export const ItemSchema: z.ZodType<Item> = z.object({
  name: z.string(),
  description: z.string().optional(),
  ean: z.string().regex(/^\d{13}$/, "EAN must be a 13-digit number").optional(), // EAN ist optional
  category: z.string().optional(),
  quantity: z.number().int().nonnegative().optional(),
});

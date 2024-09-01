import { z } from "zod";
import { ItemSchema } from "./item";

export const StorageUnitSchema: z.ZodType<StorageUnit> = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  items: z.array(ItemSchema),
});
import { z } from "zod";
import { StorageUnitSchema } from "./storageunit";

const GenericResponseSchema: z.ZodType<GenericResponse> = z.object({
    chat_response: z.string().describe('message from assistanz to user about input'),
    input_text: z.string().optional(),
    input_prompt: z.string().optional(),
    response_code: z.enum(["OK", "ERROR", "SEARCH_RESULT", "CAPTURE_RESULT"]),
    storageunits: z.array(StorageUnitSchema)
});

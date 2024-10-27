import { extractParam, extractSessionId, getStorageUnit, getStorageUnits } from '@/lib/elephound_lib';
import { ItemSchema } from '@/schemas/item';
import { StorageUnitSchema } from '@/schemas/storageunit';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { nanoid } from 'nanoid';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function GET(req: Request) {
  return await handleRequest(req);
}

export async function POST(req: Request) {
  return await handleRequest(req);
}


async function handleRequest(req: Request) {
  const body = await req.json();
  const sessionId = await extractSessionId(req, body);

  if (!sessionId) {
    return new Response('Session ID not provided', { status: 400 });
  }

  const storageUnits = await getStorageUnits(sessionId);
  console.log("units für sessionid: ", sessionId, " - ", storageUnits)

  const user_message = await extractParam(req, body, "message");

  const system_prompt = `You are an helpful AI assistant and help user to search for items in their storage units. 
        `;
  const input_prompt = `Classify user intent of the following request:
  ---
  `+ user_message + `
  ---


  If user searches for items, look into the json-structure storageUnits and return als storageunit ids containing a matching items.

Give a proper, friendly and funny chat_response to the user with maximum of 12 words : 

- If user just wants to CHAT, give a friendly and funny chat_response.
- If user is looking for items, tell him whether you something and what you found.

  
  json-structure storageUnits:
  --- 
        `+ JSON.stringify(storageUnits);

  console.log("message: ", input_prompt);

  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: z.object({
      chat_response: z.string()/*.describe("response text from ")*/,
      user_intent: z.enum(["SEARCH_ITEMS", "CHAT"]),
      storageunit_ids: z.array(z.string()).describe("id of storage units containing items the user looks for")
    }),
    system: system_prompt,
    prompt: input_prompt,
  });

  console.log(object);

  const selectedUnits: StorageUnit[] = [];
  const suPromises = object.storageunit_ids.map(async (suId) => {
    const su = await getStorageUnit(suId, sessionId);
    if (su) selectedUnits.push(su);
  });
  
  await Promise.all(suPromises);

  const response: GenericResponse = {
    response_code: (object.user_intent == "SEARCH_ITEMS") ? "SEARCH_RESULT" : "OK",
    input_text: "" + user_message,
    input_prompt: input_prompt,
    storageunits: selectedUnits,
    chat_response: object.chat_response
  };

  console.log(response);

  return Response.json(response);
}
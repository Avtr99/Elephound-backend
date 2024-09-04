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
  let body: any;
  try {
    body = await req.json();
    console.log("Request body:", body);
  } catch (error) {
    console.log("JSON Parsing Error:", error);
    return new Response('Invalid JSON in request body', { status: 400 });
  }
  const sessionId = await extractSessionId(req, body);
  if (!sessionId) {
    console.log("Invalid or missing session ID");
    return new Response('Session ID not provided', { status: 400 });
  }

  const storageUnits = await getStorageUnits(sessionId);
  if (!storageUnits) {
    return new Response('Could not retrieve storage units', { status: 500 });
  }

  const user_message = await extractParam(req, body, "message");
  if (!user_message) {
    console.log("Missing or empty message");
    return new Response('Message not provided', { status: 400 });
  }
  const system_prompt = `You are a helpful AI assistant and help user to search for items in their storage units.`;

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
  console.log("System Prompt:", system_prompt);
  console.log("Input Prompt:", input_prompt);

  let object;
  try {
    const result = await generateObject({
      model: openai('gpt-4o'), // Ensure this is correct
      schema: z.object({
        chat_response: z.string(),
        user_intent: z.enum(["SEARCH_ITEMS", "CHAT"]),
        storageunit_ids: z.array(z.string())
      }),
      system: system_prompt,
      prompt: input_prompt,
    });
    object = result.object;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return new Response('Error generating response from AI model', { status: 500 });
  }


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

  return new Response(JSON.stringify(response), {
    headers: { 'Cache-Control': 's-maxage=86400' } // Cache for 24 hours
  });
}



import { ItemSchema } from '@/schemas/item';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { kv } from '@vercel/kv';
import { extractSessionId, saveStorageUnit } from '@/lib/elephound_lib';


export const maxDuration = 30;

export async function GET(req: Request) {
  // Extract the sessionId from the query parameters
  const url = new URL(req.url);
  const body = await req.json();
  const sessionId = await extractSessionId(req, body);

  if (!sessionId) {
    return new Response('Session ID not provided', { status: 400 });
  }

  const storageUnitId = url.searchParams.get('storageUnitId');
  if (!storageUnitId) {
    return new Response('storageUnitId not provided', { status: 400 });
  }

  const user_prompt = `Okay, mal sehen... Hier haben wir als Erstes einen Hammer, den ich neulich benutzt habe. Er sieht noch in Ordnung aus.

Ah, da ist ein Schraubenzieher. Ein Kreuzschlitz, wenn ich das richtig sehe. Scheint der einzige in der Schublade zu sein.

Ein Satz Inbusschlüssel... Ich glaube, das sind sieben Stück, ja, sieben. Sie scheinen vollständig zu sein.

Oh, da liegt ein Maßband. Fünf Meter Länge... ja, genau, das müsste stimmen.

Ein paar Schrauben... Hm, ungefähr zehn Stück, würde ich sagen. Die sehen unterschiedlich aus, verschiedene Größen.

Hier sind auch noch einige Nägel. Schätze, es sind etwa zwanzig, vielleicht mehr. Die meisten sind mittelgroß.

Klebeband, ein bisschen gebraucht, aber da ist noch genug übrig.

Zwei Zangen, eine normale und eine Spitzzange. Beide sehen noch gut aus.

Was haben wir noch? Ein paar Dübel... Vielleicht fünfzehn? Ja, das müsste hinkommen.

Oh, fast übersehen – ein kleiner Notizblock, aber keine Stifte... sollte ich vielleicht auffüllen.

Und hier hinten, noch eine Rolle Isolierband. Das ist fast voll, könnte noch eine Weile halten.

Das war's, denke ich. Scheint alles Wichtige da zu sein.`;

  const user_prompt2 = `Oben links haben wir einen Stapel Papier, Druckerpapier, das müsste noch eine halbe Packung sein. Daneben liegt ein Notizbuch, kaum benutzt, vielleicht ein paar Seiten beschrieben.

Weiter rechts steht ein kleiner Kasten mit Stiften und Markern. Mal sehen... etwa fünf Kugelschreiber, zwei Textmarker, und ein Bleistift. Ein paar von den Kugelschreibern sind wahrscheinlich leer, sollte ich überprüfen.

Im mittleren Fach sind Ordner. Der erste ist der blaue, da sind die Steuerunterlagen drin. Der zweite ist grün, das müsste der Projektordner sein. Der dritte, der schwarze, enthält allgemeine Dokumente. Sieht so aus, als wären sie alle noch gut sortiert.

Da ist auch noch ein Buch, das ich wohl zur Seite gelegt habe... Ah, das ist der Roman, den ich letzten Monat angefangen, aber noch nicht fertig gelesen habe.

Im unteren Fach stehen ein paar technische Geräte. Das alte Laptop, das ich nicht mehr benutze, und das Tablet. Das Tablet sollte noch aufgeladen werden, der Akku ist fast leer. Da ist auch ein externer Lautsprecher, den ich immer mal wieder für Musik nutze.

Weiter unten ist eine Schachtel mit Kabeln und Ladegeräten. Ich sehe ein paar USB-Kabel, ein HDMI-Kabel, und zwei alte Handy-Ladegeräte, die ich eigentlich aussortieren könnte.

Ganz unten steht der Drucker. Der müsste noch ausreichend Tinte haben, zumindest die schwarze Patrone. Ich sollte aber bald Ersatz besorgen, bevor sie leer wird.`;

  const input_prompt = `You are an expert for analysing description of storageunits like drawer, cabinets and wall units made by humans. 
        You extract as much details as possible and generate a structures json output. 
        
        ---
        Storageunit description:
        ` + user_prompt2 + `
        ---
        `;

  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: z.object({
      items: z.array(ItemSchema),
      name_of_storage: z.string().describe("name of storage if mentioned, otherwise empty string")
    }),
    //system: 'H',
    prompt: input_prompt,
  });

  const storageUnit1: StorageUnit = {
    id: storageUnitId,
    items: object.items,
    name: !object.name_of_storage ? "Storage Unit " + storageUnitId : object.name_of_storage
  };

  await saveStorageUnit(storageUnit1, sessionId);

  const response: GenericResponse = {
    response_code: "OK",
    input_text: user_prompt2,
    input_prompt: input_prompt,
    storageunits: [storageUnit1],
    chat_response: "Danke, Oklahoma"
  };
  return Response.json(response);
}
import { ItemSchema } from '@/schemas/item';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { extractParam, extractSessionId, removeStorageUnit, saveStorageUnit } from '@/lib/elephound_lib';


// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
async function readLocalTestImage() {
    const filePath = path.resolve('./test_data', 'justin_stuff.jpg');
    //const filePath = path.resolve('./test_data', 'ratsche_und_nuesse.jpg');
    //const filePath = path.resolve('./test_data', 'schublade_werkzeug.jpg');
    //const filePath = path.resolve('./test_data', 'schublade_werkzeug.jpg'); justin_stuff
    const fileBuffer = fs.readFileSync(filePath);
    const base64Image = fileBuffer.toString('base64');

    return base64Image;
}




export async function POST(req: Request) {
    return await handleRequest(req);
}

async function handleRequest(req: Request) {
    const body = await req.json();
    const sessionId = await extractSessionId(req, body);

    if (!sessionId) {
        return new Response('sessionId not provided', { status: 400 });
    }

    //const base64Image = readLocalTestImage();
    let base64Image = await extractParam(req, body, "captureImage");
    //base64Image = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD02iiigD//2Q==";
    if (!base64Image || base64Image == "") {
        return new Response('captureImage not provided', { status: 400 });
        //base64Image = await readLocalTestImage();
    }

    //const base64Image = readLocalTestImage();
    const storageUnitName = await extractParam(req, body, "storageUnitName");

    //const base64Image = readLocalTestImage();
    const storageUnitId = await extractParam(req, body, "storageUnitId");
    if (!storageUnitId) {
        return new Response('storageUnitId not provided', { status: 400 });
    }

    //console.info("base64 :");
    //console.info(base64Image);
    

    const input_prompt_image = `Your name is "Eli" and your are an expert for analysing images of storageunits like drawer, cabinets and wall units. 
        Analyze the image and generate as much details as possible about tools and items. be very precise about quantities and double check them. choose a category and add available details like colors to description of every item. 
        if there are no items, give back an empty array.

        as second step figure out a good fitting storage unit name the items are located in.

        as third step add a friendly and funny chat_response for the user with maximum of 10 words if you recognized what the storage unit contains.
        `;

    const { object } = await generateObject({
        model: openai('gpt-4o'),
        schema: z.object({
            items: z.array(ItemSchema),
            storageUnitName: z.string().describe("good fitting storage unit name where the image was taken"),
            chat_response: z.string()
        }),
        //system: 'H',
        //prompt: input_prompt_image,
        temperature: 0,
        messages: [{
            role: 'user',
            content: [
                { type: 'text', text: input_prompt_image },
                { type: 'image', image: base64Image },
            ],
        }]
    });

    const storageUnit1: StorageUnit = {
        id: storageUnitId,
        items: object.items,

    };

    if (storageUnitName && storageUnitName != null && storageUnitName != undefined && storageUnitName != "")
        storageUnit1.name = storageUnitName;
    else
        storageUnit1.name = object.storageUnitName;

    await removeStorageUnit(storageUnitId, sessionId);
    await saveStorageUnit(storageUnit1, sessionId);

    const response: GenericResponse = {
        response_code: "OK",
        input_text: "",
        input_prompt: input_prompt_image,
        storageunits: [storageUnit1],
        chat_response: object.chat_response
    };
    return Response.json(response);
}
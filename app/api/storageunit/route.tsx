import { ItemSchema } from '@/schemas/item';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { kv } from '@vercel/kv';
import { extractSessionId, getStorageUnits } from '@/lib/elephound_lib';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function GET(req: Request) {
    const body = await req.json();
    const sessionId = await extractSessionId(req, body);

    if (!sessionId) {
        return new Response('Session ID not provided', { status: 400 });
    }

    const units = await getStorageUnits(sessionId);
    return new Response(JSON.stringify(units), {
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const sessionId = await extractSessionId(req, body);

        if (!sessionId) {
            return new Response('Session ID not provided', { status: 400 });
        }

        const units = await getStorageUnits(sessionId);
        return new Response(JSON.stringify(units), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response('Invalid JSON body', { status: 400 });
    }
}
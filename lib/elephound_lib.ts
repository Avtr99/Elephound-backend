"use server"

import { kv } from '@vercel/kv'

export async function extractParam(req: Request, body: any, paramName: string): Promise<string | null> {
    let paramValue: string | null = null;
    //console.log("paramName: ", paramName);

    if (req.method === 'GET') {
        const url = new URL(req.url);
        paramValue = url.searchParams.get(paramName);
    }
    //console.log("paramValue 1: ", paramValue);

    // If sessionId isn't set, check if it's a POST request and try to get sessionId from the JSON body
    if (!paramValue && req.method === 'POST') {
        try {
            //console.log("body: ", body);
            paramValue = body[paramName] || null;
        } catch (error) {

        }
    }
    //console.log("paramValue 2: ", paramValue);


    // If sessionId still isn't set, check the headers
    if (!paramValue) {
        paramValue = req.headers.get(paramName);
    }
    //console.log("paramValue 3: ", paramValue);

    return paramValue;

}

export async function extractSessionId(req: Request, body: any): Promise<string | null> {
    return await extractParam(req, body, "sessionId");
}

export async function getStorageUnits(sessionId?: string | null) {
    if (!sessionId) {
        return []
    }

    try {
        const pipeline = kv.pipeline()
        const storageunits: string[] = await kv.zrange(`session:storageunit:${sessionId}`, 0, -1, {
            rev: true
        })

        for (const storageunit of storageunits) {
            pipeline.hgetall(storageunit)
        }

        const results = await pipeline.exec()

        return results as StorageUnit[]
    } catch (error) {
        return []
    }
}

export async function getStorageUnit(id: string, sessionId?: string | null) {
    if (!sessionId) {
        return null;
    }

    const suData = await kv.hgetall<Record<string, unknown>>(`storageunit:${id}`);
    if (!suData) {
        return null;
    }

    // Manuelle Umwandlung von Record<string, unknown> zu StorageUnit
    const su: StorageUnit = {
        id: suData.id as string,
        name: suData.name as string | undefined,
        description: suData.description as string | undefined,
        items: suData.items as Item[] // Achtung: Hier müssen Sie sicherstellen, dass `items` tatsächlich ein `Item[]` ist
    };
    /*
    
    const su = await kv.hgetall<StorageUnit>(`storageunit:${id}`);

    if (!su) {
        return null;
    }
    */

    return su;
}

export async function clearStorageUnits(sessionId?: string | null) {
    if (!sessionId) {
        return {
            error: 'unknown sessionId'
        }
    }

    const storageunits: string[] = await kv.zrange(`session:storageunit:${sessionId}`, 0, -1)
    if (!storageunits.length) {
        return;
    }
    const pipeline = kv.pipeline()

    for (const storageunit of storageunits) {
        pipeline.del(storageunit)
        pipeline.zrem(`session:storageunit:${sessionId}`, storageunit)
    }

    await pipeline.exec()
}

export async function saveStorageUnit(storageunit: StorageUnit, sessionId?: string | null) {

    if (sessionId) {
        console.log("toStorageUnitRecord: ", toStorageUnitRecord(storageunit));
        const pipeline = kv.pipeline()
        pipeline.hmset(`storageunit:${storageunit.id}`, toStorageUnitRecord(storageunit))
        pipeline.zadd(`session:storageunit:${sessionId}`, {
            score: Date.now(),
            member: `storageunit:${storageunit.id}`
        })
        await pipeline.exec()
    } else {
        return
    }
}

export async function removeStorageUnit(storageunitId: string, sessionId?: string | null) {
    if (!sessionId) {
        return {
            error: 'Unauthorized'
        }
    }


    await kv.del(`storageunit:${storageunitId}`);
    await kv.zrem(`session:storageunit:${sessionId}`, `storageunit:${storageunitId}`);

}

function toStorageUnitRecord(storageUnit: StorageUnit): Record<string, unknown> {
    return {
        id: storageUnit.id,
        name: (storageUnit.name == undefined) ? "" : storageUnit.name,
        description: (storageUnit.description == undefined) ? "" : storageUnit.description,
        items: storageUnit.items,
    };
}
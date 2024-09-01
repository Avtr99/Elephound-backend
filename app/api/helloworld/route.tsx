
// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function GET(req: Request) {

  return Response.json({message: "Hello Olkahoma!"});
}

export async function POST(req: Request, resp: Response) {
  return Response.json({message: "Hello Olkahoma POST!"});
}

import { NextResponse } from 'next/server';
import { conductResearch } from '@/lib/security';
import type { DocumentRecord, UserContext } from '@/lib/sample-data';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { user: UserContext; documents: DocumentRecord[]; prompt: string };
    if (!body?.user || !Array.isArray(body.documents) || typeof body.prompt !== 'string' || !body.prompt.trim()) {
      return NextResponse.json({ error: 'A user, document list, and question are required.' }, { status: 400 });
    }
    return NextResponse.json(conductResearch(body.user, body.documents, body.prompt));
  } catch {
    return NextResponse.json({ error: 'Unable to process research request.' }, { status: 400 });
  }
}

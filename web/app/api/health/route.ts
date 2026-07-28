import { dbGet } from '@/lib/db/connection';

export async function GET() {
  const row = await dbGet<{ ok: number }>('SELECT 1 as ok');
  return Response.json({ db: row });
}

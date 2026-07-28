export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { initDatabase } = await import('@/lib/db/database');
  await initDatabase();
}

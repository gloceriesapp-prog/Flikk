type DatabaseError = { code: string; message: string };

export async function withQuickTabScope<T extends { error: DatabaseError | null }>(
  read: (scoped: boolean) => PromiseLike<T>,
) {
  const result = await read(true);
  // Older schemas have no scoped products. Fall back only when Postgres
  // confirms the column is missing, never for access or network failures.
  if (result.error?.code === '42703' && /\bcolumn\b[^\n]*\bquick_tab_key\b[^\n]*does not exist/i.test(result.error.message)) {
    return { ...await read(false), supportsQuickTabScope: false };
  }
  return { ...result, supportsQuickTabScope: true };
}

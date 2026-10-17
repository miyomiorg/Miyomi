/** Adapt legacy form column names at the endpoint boundary; JSON values stay opaque. */
export function contentPayload(row: Record<string, unknown>, selectedGroupIds: string[]): Record<string, unknown> {
  return {
    ...Object.fromEntries(Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()), value,
    ])),
    selectedGroupIds,
  };
}

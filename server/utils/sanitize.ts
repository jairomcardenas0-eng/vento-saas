export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const sanitizePlainText = (value: unknown, maxLength = 500): string =>
  sanitizeHtml(String(value || '').trim()).slice(0, maxLength)

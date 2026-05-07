// Platform deep-link helpers. Keep all link generation here so components stay clean.

export const isMobileUA = (): boolean =>
  typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

/**
 * Returns a deep link to compose an email.
 * - Mobile → mailto: (native mail app)
 * - Desktop → Gmail web compose
 */
export const getEmailLink = (email: string, subject: string, body: string): string => {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  const to = encodeURIComponent(email || '');
  if (isMobileUA()) {
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
  }
  return `https://mail.google.com/mail/?view=cm&to=${to}&su=${encodedSubject}&body=${encodedBody}`;
};

/** Direct Instagram DM deep link via ig.me. Strips leading @. */
export const getInstagramDMLink = (username: string): string => {
  const u = (username || '').replace(/^@/, '').trim();
  return `https://ig.me/m/${u}`;
};

// Only staff with a company address may create an account. This is checked here for a friendly
// message, and enforced again in the database (supabase/migrations/0006_email_domain.sql), which is
// the check that cannot be bypassed. Change the domain in BOTH places.
export const ALLOWED_EMAIL_DOMAIN = "selangorproperties.com.my";

export function isAllowedEmail(email: string): boolean {
  const parts = email.trim().toLowerCase().split("@");
  return parts.length === 2 && parts[0].length > 0 && parts[1] === ALLOWED_EMAIL_DOMAIN;
}

export const EMAIL_DOMAIN_MESSAGE = `Only @${ALLOWED_EMAIL_DOMAIN} email addresses can sign up.`;

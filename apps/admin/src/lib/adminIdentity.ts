// The single admin identity for the standalone emailed-OTP sign-in. There is
// no Supabase user session anymore (login is a signed cookie, not a GoTrue
// session), so "who the admin is" comes from env, not from getUser():
//
//  - ADMIN_USER_ID  — the founder's existing Supabase auth user id (uuid).
//    NOT a secret. It is the OTP challenge key (admin_otp_challenges.user_id,
//    FK to auth.users) AND the acting-admin id that audit RPCs record
//    (p_actor / p_admin / p_reviewer / updated_by — all typed uuid, several
//    with an `id = … AND role = 'admin'` check or an auth.users FK). A
//    fabricated value would fail those at the database, so this must be the
//    real founder uuid that already exists in auth.users / public.users.
//  - ADMIN_OTP_EMAIL — where the code is emailed, and the email audit RPCs
//    record for p_admin_email.
//
// Both throw if unset: a misconfigured deploy fails closed (no admin acts
// with an empty identity) rather than silently writing bad rows.

export function adminUserId(): string {
  const id = process.env.ADMIN_USER_ID?.trim();
  if (!id) throw new Error('ADMIN_USER_ID must be set (the admin Supabase user id).');
  return id;
}

export function adminEmail(): string {
  const email = process.env.ADMIN_OTP_EMAIL?.trim();
  if (!email) throw new Error('ADMIN_OTP_EMAIL must be set.');
  return email;
}

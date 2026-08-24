/**
 * Self-registration stays open through the whole day before the session and
 * closes right as game day begins — `session.date` is already stored as
 * midnight of game day, so that instant is the cutoff.
 */
export function isRegistrationExpired(sessionDate: Date): boolean {
  return new Date() >= sessionDate;
}

/** Internal only: never sent to the client, which always sees { ok: true }. */
export type JoinWaitlistOutcome = 'created' | 'duplicate';

export interface JoinWaitlistParams {
  email: string;
  name?: string;
  sourcePage?: string;
}

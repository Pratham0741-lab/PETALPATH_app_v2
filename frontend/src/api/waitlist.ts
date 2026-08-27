import { api } from './client';

export interface JoinWaitlistPayload {
  name: string;
  email: string;
}

export interface JoinWaitlistResponse {
  success: boolean;
  message: string;
}

export async function joinWaitlist(payload: JoinWaitlistPayload): Promise<JoinWaitlistResponse> {
  return api.post<JoinWaitlistResponse>('/waitlist', payload);
}

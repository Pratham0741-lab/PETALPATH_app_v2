/**
 * Public, unauthenticated app configuration. Only booleans that let the app
 * describe what the server can do; never values, hosts or keys.
 */
import { getEmailService } from '../../shared/services/email.service.js';

export interface PublicConfig {
  /** True only when SES_FROM and a region are set, so reset emails are really sent. */
  passwordResetEmail: boolean;
}

export const publicConfigService = {
  get(): PublicConfig {
    return { passwordResetEmail: getEmailService().enabled };
  },
};

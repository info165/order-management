import type { School } from '../types';
import { collectSchoolEmails } from './emailMessage';

export interface SchoolContactForm {
  phone: string;
  address: string;
  tan: string;
  email: string;
}

// What the School Registry's contact editor sends to updateSchool().
//
// The email is only included when the person actually changed it. updateSchool()
// copies any email it receives onto every order linked to the school, and many
// schools have no email in the registry while their orders still carry one: if
// the untouched, empty box were always sent, saving just a new phone number
// would blank every one of those orders' emails.
export function buildSchoolContactUpdates(
  school: Pick<School, 'email'>,
  form: SchoolContactForm
): { updates: Partial<School>; error?: string } {
  const updates: Partial<School> = {
    contactPhone: form.phone.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
    tan: form.tan.trim().toUpperCase()
  };

  const typed = form.email.trim();
  if (typed !== (school.email || '').trim()) {
    // Several addresses in one box are allowed (the email buttons already accept
    // that), so only reject text that contains no valid address at all.
    if (typed !== '' && collectSchoolEmails(typed).length === 0) {
      return { updates, error: 'Enter a valid email address, or leave it blank.' };
    }
    updates.email = typed;
  }

  return { updates };
}

// Server-side enforcement of proposal DESIGN entitlement.
//
// The client pickers lock designs a plan does not include, but that is
// presentation only — `template_id` arrives in the request body and was
// previously written straight through by /api/proposals/generate,
// /api/proposals and /api/proposals/[id]. This module is the authoritative
// check those routes call.
//
// Not marked "use server": it is a plain server-only helper, so route handlers
// can import it directly without every export becoming a server action.

import { createClient } from "@/lib/supabase/server";

/** Message returned to the client on a 403. Deliberately non-specific. */
export const DESIGN_NOT_ENTITLED_MESSAGE =
  "Your plan does not include this proposal design.";

/**
 * Whether `userId` may use design `templateId`.
 *
 * Fails closed: a missing profile, an inactive or unknown template, a template
 * with no tier rows, or any query error all deny.
 */
export async function userCanAccessTemplate(
  userId: string,
  templateId: string,
): Promise<boolean> {
  if (!templateId) return false;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("can_user_access_template", {
      user_uuid: userId,
      template_uuid: templateId,
    });
    if (error) return false;
    return data === true;
  } catch (error) {
    console.error("Error checking design entitlement:", error);
    return false;
  }
}

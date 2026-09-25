import { z } from "zod";
import { INVITABLE_ROLES } from "../constants/roles";

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  role: z.enum(INVITABLE_ROLES, {
    errorMap: () => ({ message: "Select a role" }),
  }),
});

export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

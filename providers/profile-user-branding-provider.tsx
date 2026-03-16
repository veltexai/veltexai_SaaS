 "use client";

 import { createContext, useContext } from "react";
 import type { User } from "@supabase/supabase-js";
 import type { Profile } from "@/types/database";
 import type { BrandingSettingsInterface } from "@/features/settings";

 interface ProfileUserBrandingContextValue {
   user: User;
   profile: Profile | null;
   brandingSettings: BrandingSettingsInterface | null;
 }

 const ProfileUserBrandingContext =
   createContext<ProfileUserBrandingContextValue | undefined>(undefined);

 interface ProfileUserBrandingProviderProps {
   value: ProfileUserBrandingContextValue;
   children: React.ReactNode;
 }

 export function ProfileUserBrandingProvider({
   value,
   children,
 }: ProfileUserBrandingProviderProps) {
   return (
     <ProfileUserBrandingContext.Provider value={value}>
       {children}
     </ProfileUserBrandingContext.Provider>
   );
 }

 export function useProfileUserBranding() {
   const context = useContext(ProfileUserBrandingContext);

   if (!context) {
     throw new Error(
       "useProfileUserBranding must be used within a ProfileUserBrandingProvider",
     );
   }

   return context;
 }


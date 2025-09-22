'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

declare global {
  interface Window {
    fbq: any;
  }
}

const FacebookPixelTracker = () => {
  useEffect(() => {
    const checkNewSignup = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.user_metadata?.signup_completed) {
        if (typeof window !== 'undefined' && window.fbq) {
          window.fbq('track', 'CompleteRegistration', {
            value: 0.0,
            currency: 'USD',
          });

          console.log('✅ Facebook Pixel: CompleteRegistration tracked');
        }

        await supabase.auth.updateUser({
          data: { signup_completed: null },
        });
      }
    };

    checkNewSignup();
  }, []);

  return null;
};

export default FacebookPixelTracker;

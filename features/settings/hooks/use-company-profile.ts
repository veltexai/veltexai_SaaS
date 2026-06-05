import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface CompanyProfile {
  id: string;
  user_id: string;
  company_name: string;
  contact_info: {
    primary_contact?: string;
    phone?: string;
    email?: string;
    address?: string;
    billing_contact?: string;
    emergency_contact?: string;
  };
  logo_url?: string | null;
  company_background?: string;
  service_references: Array<{
    client_name?: string;
    service_type?: string;
    duration?: string;
    contact_info?: string;
    testimonial?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface CompanyProfileUpdate {
  company_name?: string;
  contact_info?: {
    primary_contact?: string;
    phone?: string;
    email?: string;
    address?: string;
    billing_contact?: string;
    emergency_contact?: string;
  };
  logo_url?: string | null;
  company_background?: string;
  service_references?: Array<{
    client_name?: string;
    service_type?: string;
    duration?: string;
    contact_info?: string;
    testimonial?: string;
  }>;
}

export function useCompanyProfile() {
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanyProfile = useCallback(async (): Promise<CompanyProfile | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/company-profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch company profile');
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch company profile';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCompanyProfile = useCallback(async (profileData: CompanyProfileUpdate): Promise<CompanyProfile | null> => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch('/api/company-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create company profile');
      }

      const result = await response.json();
      toast.success('Company profile created successfully');
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create company profile';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const updateCompanyProfile = useCallback(async (profileData: CompanyProfileUpdate): Promise<CompanyProfile | null> => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch('/api/company-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update company profile');
      }

      const result = await response.json();
      toast.success('Company profile updated successfully');
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update company profile';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const deleteCompanyProfile = useCallback(async (): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch('/api/company-profile', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete company profile');
      }

      toast.success('Company profile deleted successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete company profile';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return {
    isLoading,
    isUpdating,
    error,
    fetchCompanyProfile,
    createCompanyProfile,
    updateCompanyProfile,
    deleteCompanyProfile,
  };
}
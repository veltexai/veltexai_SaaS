import { exportProposalToPDF, PDFExportOptions } from '@/lib/pdf-export';
import { type Database } from '@/types/database';

type Proposal = Database['public']['Tables']['proposals']['Row'];

interface ProposalWithCompanyProfile extends Proposal {
  company_profiles?: {
    company_name: string;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
  } | null;
}

export async function generateProposalPDF(
  proposal: ProposalWithCompanyProfile
): Promise<Buffer> {
  try {
    // Prepare export options
    const exportOptions: Partial<PDFExportOptions> = {
      template: 'professional',
      includeServiceDetails: true,
      includePricingBreakdown: true,
      includeServiceReferences: false,
    };

    // Add company info if available
    if (proposal.company_profiles) {
      exportOptions.companyProfile = {
        company_name: proposal.company_profiles.company_name,
        logo_url: proposal.company_profiles.logo_url,
        contact_info: {},
      };
    }

    // Generate PDF using the existing export function
    const pdfBytes = await exportProposalToPDF(proposal, exportOptions);
    
    // Convert Uint8Array to Buffer for Node.js compatibility
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { type Database } from '@/types/database';
import { formatDate, formatCurrency as formatCurrencyUtil } from '@/lib/utils';
import { ServiceType } from '@/lib/validations/proposal';

type Proposal = Database['public']['Tables']['proposals']['Row'];

export interface PDFExportOptions {
  proposal: Proposal;
  companyInfo?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo?: string;
  };
  companyProfile?: {
    company_name: string;
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
  };
  template?: 'modern' | 'classic' | 'minimal' | 'professional';
  includeServiceDetails?: boolean;
  includePricingBreakdown?: boolean;
  includeServiceReferences?: boolean;
}

export class PDFExporter {
  private pdf: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;

  constructor() {
    this.pdf = new jsPDF('p', 'mm', 'a4');
    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.pageHeight = this.pdf.internal.pageSize.getHeight();
    this.margin = 20;
    this.currentY = this.margin;
  }

  async exportProposal(options: PDFExportOptions): Promise<Blob> {
    const {
      proposal,
      companyInfo,
      companyProfile,
      template = 'modern',
      includeServiceDetails = true,
      includePricingBreakdown = true,
      includeServiceReferences = true,
    } = options;

    // Apply template-specific styling
    this.applyTemplateStyles(template);

    // Add header with company branding
    await this.addBrandedHeader(companyInfo, companyProfile, template);

    // Add proposal title with enhanced styling
    this.addEnhancedTitle(proposal.title, template);

    // Add proposal overview section
    // this.addProposalOverview(proposal, template);

    // Add client information section
    // this.addClientInformation(proposal, template);

    // Add service details if available
    // if (includeServiceDetails && proposal.service_specific_data) {
    //   this.addServiceDetails(
    //     proposal.service_type as ServiceType,
    //     proposal.service_specific_data as any,
    //     template
    //   );
    // }

    // Add enhanced facility details if available
    // if (proposal.facility_details) {
    //   this.addFacilityDetails(proposal.facility_details as any, template);
    // }

    // Add pricing breakdown with enhanced styling
    // if (includePricingBreakdown && proposal.pricing_data) {
    //   this.addEnhancedPricingBreakdown(proposal.pricing_data as any, template);
    // }

    // Add generated content with better formatting
    if (proposal.generated_content) {
      this.addEnhancedContent(proposal.generated_content, template);
    }

    // Add service references if available and requested
    if (
      includeServiceReferences &&
      companyProfile?.service_references?.length
    ) {
      this.addServiceReferences(companyProfile.service_references, template);
    }

    // Add company background if available
    if (companyProfile?.company_background) {
      this.addCompanyBackground(companyProfile.company_background, template);
    }

    // Add enhanced footer
    this.addEnhancedFooter(companyInfo, companyProfile, template);

    return this.pdf.output('blob');
  }

  private async addHeader(companyInfo?: PDFExportOptions['companyInfo']) {
    // Add logo if available
    if (companyInfo?.logo) {
      try {
        // Fetch the image data
        const response = await fetch(companyInfo.logo);
        if (!response.ok) {
          throw new Error(`Failed to fetch logo: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        // Force PNG format for transparency support
        const dataUrl = `data:image/png;base64,${base64}`;

        console.log('Image MIME type:', response.headers.get('content-type'));
        console.log('Data URL length:', dataUrl.length);

        // Always use PNG format for transparency
        const mimeType = response.headers.get('content-type') || 'image/png';

        // Calculate logo dimensions (larger size, max 50mm width)
        const maxWidth = 40;
        const maxHeight = 40;

        // Center logo horizontally
        const logoX = (this.pageWidth - maxWidth) / 2;

        // Determine format based on MIME type for better transparency handling
        let format = 'PNG';
        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
          format = 'JPEG';
        } else if (mimeType.includes('gif')) {
          format = 'GIF';
        }

        // Add image with proper format detection - USE THE DETECTED FORMAT
        this.pdf.addImage(
          dataUrl,
          format, // Changed from 'PNG' to use detected format
          logoX,
          this.currentY,
          maxWidth,
          maxHeight,
          undefined, // alias
          'NONE' // compression to preserve quality
        );
        this.currentY += maxHeight + 10;
      } catch (error) {
        console.error('Failed to load logo:', error);
        // Fallback to text
        // this.addCompanyNameText(companyInfo);
      }
    } else {
      // this.addCompanyNameText(companyInfo);
    }

    // Add company details if provided
    // if (companyInfo) {
    //   this.pdf.setFontSize(10);
    //   this.pdf.setFont('helvetica', 'normal');
    //   this.pdf.setTextColor(100, 100, 100);

    //   let headerY = this.currentY + 5;

    //   if (companyInfo.address) {
    //     const addressText = this.pdf.splitTextToSize(
    //       companyInfo.address,
    //       this.pageWidth - 2 * this.margin
    //     );
    //     this.pdf.text(addressText, this.pageWidth / 2, headerY, {
    //       align: 'center',
    //     });
    //     headerY += addressText.length * 4;
    //   }

    //   if (companyInfo.phone || companyInfo.email) {
    //     const contactInfo = [companyInfo.phone, companyInfo.email]
    //       .filter(Boolean)
    //       .join(' | ');
    //     this.pdf.text(contactInfo, this.pageWidth / 2, headerY, {
    //       align: 'center',
    //     });
    //     headerY += 4;
    //   }

    //   if (companyInfo.website) {
    //     this.pdf.text(companyInfo.website, this.pageWidth / 2, headerY, {
    //       align: 'center',
    //     });
    //     headerY += 4;
    //   }

    //   this.currentY = headerY + 10;
    // } else {
    //   this.currentY += 15;
    // }

    // Add horizontal line
    this.pdf.setDrawColor(200, 200, 200);
    this.pdf.line(
      this.margin,
      this.currentY,
      this.pageWidth - this.margin,
      this.currentY
    );
    this.currentY += 10;
  }

  // private addCompanyNameText(companyInfo?: PDFExportOptions['companyInfo']) {
  //   this.pdf.setFontSize(24);
  //   this.pdf.setFont('helvetica', 'bold');
  //   this.pdf.setTextColor(0, 0, 0); // Blue color
  //   const companyName = companyInfo?.name || 'Veltex';
  //   this.pdf.text(companyName, this.pageWidth / 2, this.currentY, {
  //     align: 'center',
  //   });
  //   this.currentY += 15;
  // }

  private addTitle(title: string) {
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text('PROPOSAL', this.margin, this.currentY);
    this.currentY += 10;

    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'normal');
    const titleLines = this.pdf.splitTextToSize(
      title,
      this.pageWidth - 2 * this.margin
    );
    this.pdf.text(titleLines, this.margin, this.currentY);
    this.currentY += titleLines.length * 6 + 10;
  }

  // private addProposalDetails(proposal: Proposal) {
  //   // Create a details box
  //   this.pdf.setFillColor(248, 250, 252); // Light gray background
  //   this.pdf.rect(
  //     this.margin,
  //     this.currentY,
  //     this.pageWidth - 2 * this.margin,
  //     35,
  //     'F'
  //   );

  //   this.pdf.setFontSize(12);
  //   this.pdf.setFont('helvetica', 'bold');
  //   this.pdf.setTextColor(0, 0, 0);

  //   let detailsY = this.currentY + 8;
  //   const pricingData = proposal.pricing_data as any;

  //   // Left column - use direct proposal fields instead of global_inputs
  //   this.pdf.text('Client:', this.margin + 5, detailsY);
  //   this.pdf.setFont('helvetica', 'normal');
  //   this.pdf.text(proposal.client_name || 'N/A', this.margin + 25, detailsY);

  //   detailsY += 6;
  //   this.pdf.setFont('helvetica', 'bold');
  //   this.pdf.text('Email:', this.margin + 5, detailsY);
  //   this.pdf.setFont('helvetica', 'normal');
  //   this.pdf.text(proposal.client_email || 'N/A', this.margin + 25, detailsY);

  //   detailsY += 6;
  //   this.pdf.setFont('helvetica', 'bold');
  //   this.pdf.text('Service Type:', this.margin + 5, detailsY);
  //   this.pdf.setFont('helvetica', 'normal');
  //   const serviceTypeLabel = this.getServiceTypeLabel(
  //     proposal.service_type as ServiceType
  //   );
  //   this.pdf.text(serviceTypeLabel, this.margin + 35, detailsY);

  //   // Right column
  //   detailsY = this.currentY + 8;
  //   const rightColumnX = this.pageWidth / 2 + 10;

  //   this.pdf.setFont('helvetica', 'bold');
  //   this.pdf.text('Date:', rightColumnX, detailsY);
  //   this.pdf.setFont('helvetica', 'normal');
  //   this.pdf.text(formatDate(proposal.created_at), rightColumnX + 20, detailsY);

  //   detailsY += 6;
  //   this.pdf.setFont('helvetica', 'bold');
  //   this.pdf.text('Status:', rightColumnX, detailsY);
  //   this.pdf.setFont('helvetica', 'normal');
  //   this.pdf.text(
  //     proposal.status?.toUpperCase() || 'DRAFT',
  //     rightColumnX + 20,
  //     detailsY
  //   );

  //   detailsY += 6;
  //   this.pdf.setFont('helvetica', 'bold');
  //   this.pdf.text('Total:', rightColumnX, detailsY);
  //   this.pdf.setFont('helvetica', 'normal');
  //   const total = pricingData?.total || 0;
  //   this.pdf.text(formatCurrencyUtil(total), rightColumnX + 20, detailsY);

  //   this.currentY += 40;
  // }

  private getServiceTypeLabel(serviceType: ServiceType): string {
    const labels = {
      residential: 'Residential Cleaning',
      commercial: 'Commercial Cleaning',
      carpet: 'Carpet Cleaning',
      window: 'Window Cleaning',
      floor: 'Floor Cleaning',
    };
    return labels[serviceType] || 'Unknown Service';
  }

  // private addClientInformation(proposal: Proposal) {
  //   this.pdf.setFontSize(14);
  //   this.pdf.setFont('helvetica', 'bold');
  //   this.pdf.setTextColor(0, 0, 0);
  //   this.pdf.text('Client Information', this.margin, this.currentY);
  //   this.currentY += 10;

  //   // Create client info box
  //   this.pdf.setFillColor(252, 252, 252);
  //   this.pdf.rect(
  //     this.margin,
  //     this.currentY,
  //     this.pageWidth - 2 * this.margin,
  //     25,
  //     'F'
  //   );

  //   this.pdf.setFontSize(10);
  //   this.pdf.setTextColor(0, 0, 0);
  //   let infoY = this.currentY + 6;

  //   // Left column
  //   if (proposal.client_name) {
  //     this.pdf.setFont('helvetica', 'bold');
  //     this.pdf.text('Name:', this.margin + 5, infoY);
  //     this.pdf.setFont('helvetica', 'normal');
  //     this.pdf.text(proposal.client_name, this.margin + 25, infoY);
  //     infoY += 5;
  //   }

  //   if (proposal.client_company) {
  //     this.pdf.setFont('helvetica', 'bold');
  //     this.pdf.text('Company:', this.margin + 5, infoY);
  //     this.pdf.setFont('helvetica', 'normal');
  //     this.pdf.text(proposal.client_company, this.margin + 30, infoY);
  //     infoY += 5;
  //   }

  //   // Right column
  //   infoY = this.currentY + 6;
  //   const rightColumnX = this.pageWidth / 2 + 10;

  //   if (proposal.contact_phone) {
  //     this.pdf.setFont('helvetica', 'bold');
  //     this.pdf.text('Phone:', rightColumnX, infoY);
  //     this.pdf.setFont('helvetica', 'normal');
  //     this.pdf.text(proposal.contact_phone, rightColumnX + 20, infoY);
  //     infoY += 5;
  //   }

  //   if (proposal.service_location) {
  //     this.pdf.setFont('helvetica', 'bold');
  //     this.pdf.text('Address:', rightColumnX, infoY);
  //     this.pdf.setFont('helvetica', 'normal');
  //     const addressLines = this.pdf.splitTextToSize(
  //       proposal.service_location,
  //       80
  //     );
  //     this.pdf.text(addressLines, rightColumnX + 25, infoY);
  //   }

  //   this.currentY += 30;
  // }

  private addServiceDetails(
    serviceType: ServiceType,
    serviceData: any,
    template: string = 'modern'
  ) {
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text('Service Details', this.margin, this.currentY);
    this.currentY += 10;

    this.pdf.setFontSize(10);
    this.pdf.setTextColor(0, 0, 0);

    // Render service-specific data based on type
    switch (serviceType) {
      case 'residential':
        this.addResidentialDetails(serviceData);
        break;
      case 'commercial':
        this.addCommercialDetails(serviceData);
        break;
      case 'carpet':
        this.addCarpetDetails(serviceData);
        break;
      case 'window':
        this.addWindowDetails(serviceData);
        break;
      case 'floor':
        this.addFloorDetails(serviceData);
        break;
    }

    this.currentY += 10;
  }

  private addResidentialDetails(data: any) {
    if (data.rooms?.length > 0) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Rooms to Clean:', this.margin, this.currentY);
      this.currentY += 5;

      data.rooms.forEach((room: any) => {
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(
          `• ${room.type} (${room.size})`,
          this.margin + 10,
          this.currentY
        );
        if (room.special_requirements) {
          this.currentY += 4;
          this.pdf.text(
            `  Special: ${room.special_requirements}`,
            this.margin + 15,
            this.currentY
          );
        }
        this.currentY += 5;
      });
    }
  }

  private addCommercialDetails(data: any) {
    if (data.areas?.length > 0) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Areas to Clean:', this.margin, this.currentY);
      this.currentY += 5;

      data.areas.forEach((area: any) => {
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(
          `• ${area.type} - ${area.size} sq ft`,
          this.margin + 10,
          this.currentY
        );
        if (area.frequency) {
          this.pdf.text(
            ` (${area.frequency})`,
            this.margin + 80,
            this.currentY
          );
        }
        this.currentY += 5;
      });
    }
  }

  private addCarpetDetails(data: any) {
    if (data.carpets?.length > 0) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Carpet Areas:', this.margin, this.currentY);
      this.currentY += 5;

      data.carpets.forEach((carpet: any) => {
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(
          `• ${carpet.room} - ${carpet.size} sq ft`,
          this.margin + 10,
          this.currentY
        );
        if (carpet.material) {
          this.pdf.text(
            ` (${carpet.material})`,
            this.margin + 80,
            this.currentY
          );
        }
        this.currentY += 5;
      });
    }
  }

  private addWindowDetails(data: any) {
    if (data.windows?.length > 0) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Window Details:', this.margin, this.currentY);
      this.currentY += 5;

      data.windows.forEach((window: any) => {
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(
          `• ${window.location} - ${window.count} windows`,
          this.margin + 10,
          this.currentY
        );
        if (window.type) {
          this.pdf.text(` (${window.type})`, this.margin + 80, this.currentY);
        }
        this.currentY += 5;
      });
    }
  }

  private addFloorDetails(data: any) {
    if (data.floors?.length > 0) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Floor Areas:', this.margin, this.currentY);
      this.currentY += 5;

      data.floors.forEach((floor: any) => {
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(
          `• ${floor.room} - ${floor.size} sq ft`,
          this.margin + 10,
          this.currentY
        );
        if (floor.material) {
          this.pdf.text(
            ` (${floor.material})`,
            this.margin + 80,
            this.currentY
          );
        }
        this.currentY += 5;
      });
    }
  }

  // private addPricingBreakdown(pricingData: any) {
  //   this.pdf.setFontSize(14);
  //   this.pdf.setFont('helvetica', 'bold');
  //   this.pdf.setTextColor(0, 0, 0);
  //   this.pdf.text('Pricing Breakdown', this.margin, this.currentY);
  //   this.currentY += 10;

  //   // Create pricing table
  //   this.pdf.setFillColor(248, 250, 252);
  //   this.pdf.rect(
  //     this.margin,
  //     this.currentY,
  //     this.pageWidth - 2 * this.margin,
  //     60,
  //     'F'
  //   );

  //   this.pdf.setFontSize(10);
  //   let pricingY = this.currentY + 8;

  //   // Base price
  //   this.pdf.setFont('helvetica', 'normal');
  //   this.pdf.text('Base Price:', this.margin + 5, pricingY);
  //   this.pdf.text(
  //     formatCurrencyUtil(pricingData.base_price || 0),
  //     this.pageWidth - this.margin - 30,
  //     pricingY
  //   );
  //   pricingY += 6;

  //   // Labor
  //   if (pricingData.labor_hours > 0) {
  //     this.pdf.text(
  //       `Labor (${pricingData.labor_hours} hours):`,
  //       this.margin + 5,
  //       pricingY
  //     );
  //     this.pdf.text(
  //       formatCurrencyUtil(pricingData.labor_cost || 0),
  //       this.pageWidth - this.margin - 30,
  //       pricingY
  //     );
  //     pricingY += 6;
  //   }

  //   // Overhead
  //   if (pricingData.overhead_cost > 0) {
  //     this.pdf.text(
  //       `Overhead (${pricingData.overhead_percentage}%):`,
  //       this.margin + 5,
  //       pricingY
  //     );
  //     this.pdf.text(
  //       formatCurrencyUtil(pricingData.overhead_cost),
  //       this.pageWidth - this.margin - 30,
  //       pricingY
  //     );
  //     pricingY += 6;
  //   }

  //   // Margin
  //   if (pricingData.margin_cost > 0) {
  //     this.pdf.text(
  //       `Margin (${pricingData.margin_percentage}%):`,
  //       this.margin + 5,
  //       pricingY
  //     );
  //     this.pdf.text(
  //       formatCurrencyUtil(pricingData.margin_cost),
  //       this.pageWidth - this.margin - 30,
  //       pricingY
  //     );
  //     pricingY += 6;
  //   }

  //   // Adjustments
  //   if (
  //     pricingData.adjustments &&
  //     Object.keys(pricingData.adjustments).length > 0
  //   ) {
  //     Object.entries(pricingData.adjustments).forEach(
  //       ([key, value]: [string, any]) => {
  //         if (value !== 0) {
  //           this.pdf.text(
  //             `${key.replace('_', ' ').toUpperCase()}:`,
  //             this.margin + 5,
  //             pricingY
  //           );
  //           this.pdf.text(
  //             formatCurrencyUtil(value),
  //             this.pageWidth - this.margin - 30,
  //             pricingY
  //           );
  //           pricingY += 6;
  //         }
  //       }
  //     );
  //   }

  //   // Subtotal line
  //   pricingY += 3;
  //   this.pdf.setDrawColor(150, 150, 150);
  //   this.pdf.line(
  //     this.margin + 5,
  //     pricingY,
  //     this.pageWidth - this.margin - 5,
  //     pricingY
  //   );
  //   pricingY += 6;

  //   // Total
  //   this.pdf.setFont('helvetica', 'bold');
  //   this.pdf.setFontSize(12);
  //   this.pdf.text('TOTAL:', this.margin + 5, pricingY);
  //   this.pdf.text(
  //     formatCurrencyUtil(pricingData.total || 0),
  //     this.pageWidth - this.margin - 30,
  //     pricingY
  //   );

  //   this.currentY += 65;
  // }

  private addContent(content: string) {
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text('Additional Details', this.margin, this.currentY);
    this.currentY += 10;

    // Parse and format content
    const sections = this.parseContent(content);

    sections.forEach((section) => {
      this.addSection(section.title, section.content);
    });
  }

  private parseContent(
    content: string
  ): Array<{ title: string; content: string }> {
    const lines = content.split('\n');
    const sections: Array<{ title: string; content: string }> = [];
    let currentSection: { title: string; content: string } | null = null;

    lines.forEach((line) => {
      if (line.startsWith('#')) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: line.replace(/^#+\s*/, ''),
          content: '',
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      } else {
        if (sections.length === 0) {
          sections.push({ title: 'Overview', content: '' });
        }
        if (sections[sections.length - 1]) {
          sections[sections.length - 1].content += line + '\n';
        }
      }
    });

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  private addSection(title: string, content: string) {
    if (this.currentY > this.pageHeight - 50) {
      this.pdf.addPage();
      this.currentY = this.margin;
    }

    // Section title - remove markdown formatting
    const cleanTitle = title.replace(/\*\*(.*?)\*\*/g, '$1');
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text(cleanTitle, this.margin, this.currentY);
    this.currentY += 8;

    // Parse and render markdown content
    this.renderMarkdownContent(content.trim());
    this.currentY += 5;
  }

  private renderMarkdownContent(content: string) {
    const lines = content.split('\n');
    let inList = false;
    let listIndent = 0;

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        this.currentY += 3;
        inList = false;
        return;
      }

      // Handle numbered lists (1. 2. etc.)
      if (/^\d+\.\s/.test(trimmedLine)) {
        if (!inList) {
          this.currentY += 2;
          inList = true;
          listIndent = this.margin + 10;
        }
        const text = trimmedLine.replace(/^\d+\.\s*/, '');
        this.renderFormattedText(text, listIndent);
        this.currentY += 4;
        return;
      }

      // Handle bullet points (- or *)
      if (/^[-*]\s/.test(trimmedLine)) {
        if (!inList) {
          this.currentY += 2;
          inList = true;
          listIndent = this.margin + 10;
        }
        const text = trimmedLine.replace(/^[-*]\s*/, '');
        // Add bullet point
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(0, 0, 0);
        this.pdf.text('•', this.margin + 5, this.currentY);
        this.renderFormattedText(text, listIndent);
        this.currentY += 4;
        return;
      }

      // Regular paragraph
      inList = false;
      this.renderFormattedText(trimmedLine, this.margin);
      this.currentY += 4;
    });
  }

  private renderFormattedText(text: string, x: number) {
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(0, 0, 0);

    // Clean markdown formatting from text
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markers
      .replace(/`(.*?)`/g, '$1') // Remove code markers
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/^[-*+]\s/gm, '• ') // Convert list markers to bullets
      .replace(/^\d+\.\s/gm, '• '); // Convert numbered lists to bullets

    // Split text by remaining bold markers (if any)
    const parts = cleanText.split(/\*\*(.*?)\*\*/g);
    let currentX = x;

    parts.forEach((part, index) => {
      if (this.currentY > this.pageHeight - 20) {
        this.pdf.addPage();
        this.currentY = this.margin;
        currentX = x;
      }

      if (index % 2 === 1) {
        // Bold text
        this.pdf.setFont('helvetica', 'bold');
      } else {
        // Normal text
        this.pdf.setFont('helvetica', 'normal');
      }

      if (part) {
        // Handle line wrapping
        const maxWidth = this.pageWidth - currentX - this.margin;
        const lines = this.pdf.splitTextToSize(part, maxWidth);

        lines.forEach((line: string, lineIndex: number) => {
          if (lineIndex > 0) {
            this.currentY += 4;
            currentX = x;
          }
          this.pdf.text(line, currentX, this.currentY);
          currentX += this.pdf.getTextWidth(line);
        });
      }
    });
  }

  // Enhanced methods for better PDF generation

  private applyTemplateStyles(template: string) {
    // Set template-specific colors and styles
    switch (template) {
      case 'professional':
        this.pdf.setProperties({
          title: 'Professional Service Proposal',
          subject: 'Service Proposal Document',
          creator: 'Veltex AI',
        });
        break;
      case 'modern':
        this.pdf.setProperties({
          title: 'Modern Service Proposal',
          subject: 'Service Proposal Document',
          creator: 'Veltex AI',
        });
        break;
      case 'classic':
        this.pdf.setProperties({
          title: 'Classic Service Proposal',
          subject: 'Service Proposal Document',
          creator: 'Veltex AI',
        });
        break;
      default:
        this.pdf.setProperties({
          title: 'Service Proposal',
          subject: 'Service Proposal Document',
          creator: 'Veltex AI',
        });
    }
  }

  private async addBrandedHeader(
    companyInfo?: PDFExportOptions['companyInfo'],
    companyProfile?: PDFExportOptions['companyProfile'],
    template: string = 'modern'
  ) {
    const logoUrl = companyProfile?.logo_url || companyInfo?.logo;
    const companyName =
        companyProfile?.company_name || companyInfo?.name || 'Veltex AI';

    // Add background color for professional template
    if (template === 'professional') {
      this.pdf.setFillColor(41, 128, 185); // Professional blue
      this.pdf.rect(0, 0, this.pageWidth, 40, 'F');
    }

    // Add logo if available
    if (logoUrl) {
      try {
        const response = await fetch(logoUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');

          // Always force PNG format for transparency support and add white background
          const dataUrl = `data:image/png;base64,${base64}`;

          // Set flexible dimensions that work for all logo types
          const maxWidth = 50;
          const maxHeight = 35;

          // Use a balanced approach - logos will fit within these bounds
          // This prevents squishing while maintaining reasonable size
          let logoWidth = maxWidth;
          let logoHeight = maxHeight;

          // For most logos, use a 3:2 aspect ratio which works well for both landscape and portrait
          // This is a safe middle ground that prevents extreme squishing
          const aspectRatio = 1.4; // 3:2 ratio (width:height)

          if (logoWidth / logoHeight > aspectRatio) {
            // Logo is too wide, constrain by height
            logoHeight = maxHeight;
            logoWidth = logoHeight * aspectRatio;
          } else {
            // Logo is too tall, constrain by width
            logoWidth = maxWidth;
            logoHeight = logoWidth / aspectRatio;
          }

          // Ensure we don't exceed maximum bounds
          if (logoWidth > maxWidth) {
            logoWidth = maxWidth;
            logoHeight = logoWidth / aspectRatio;
          }
          if (logoHeight > maxHeight) {
            logoHeight = maxHeight;
            logoWidth = logoHeight * aspectRatio;
          }

          // Calculate center position for logo
          const centerX = (this.pageWidth - logoWidth) / 2;

          // Add the image with PNG format for transparency support
          this.pdf.addImage(
            dataUrl,
            'PNG', // Always use PNG for transparency
            centerX,
            this.currentY,
            logoWidth,
            logoHeight,
            undefined, // alias
            'NONE' // No compression to preserve quality
          );

          this.currentY += logoHeight + 10;
        }
      } catch (error) {
        console.error('Failed to load logo:', error);
      }
    }

    // Add company name and contact info
    const textColor = template === 'professional' ? [255, 255, 255] : [0, 0, 0];
    this.pdf.setTextColor(textColor[0], textColor[1], textColor[2]);

    this.pdf.setFontSize(18);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(
      companyName ? '' : '',
      logoUrl ? this.margin + 35 : this.margin,
      this.currentY + 12
    );

    // Add contact information
    if (companyProfile?.contact_info || companyInfo) {
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'normal');

      const contactInfo = companyProfile?.contact_info;
      const email = contactInfo?.email || companyInfo?.email;
      const phone = contactInfo?.phone || companyInfo?.phone;
      const website = companyInfo?.website;

      let contactY = this.currentY + 18;

      // if (email) {
      //   this.pdf.text(
      //     `Email: ${email}`,
      //     logoUrl ? this.margin + 35 : this.margin,
      //     contactY
      //   );
      //   contactY += 4;
      // }

      // if (phone) {
      //   this.pdf.text(
      //     `Phone: ${phone}`,
      //     logoUrl ? this.margin + 35 : this.margin,
      //     contactY
      //   );
      //   contactY += 4;
      // }

      // if (website) {
      //   this.pdf.text(
      //     `Website: ${website}`,
      //     logoUrl ? this.margin + 35 : this.margin,
      //     contactY
      //   );
      // }
    }

    this.currentY += 15;

    // Add separator line
    this.pdf.setDrawColor(200, 200, 200);
    this.pdf.line(
      this.margin,
      this.currentY,
      this.pageWidth - this.margin,
      this.currentY
    );
    this.currentY += 5;
  }

  private addEnhancedTitle(title: string, template: string = 'modern') {
    // Add background for title based on template
    if (template === 'professional') {
      this.pdf.setFillColor(52, 152, 219);
      this.pdf.rect(
        this.margin,
        this.currentY - 5,
        this.pageWidth - 2 * this.margin,
        20,
        'F'
      );
      this.pdf.setTextColor(255, 255, 255);
    } else {
      this.pdf.setTextColor(0, 0, 0);
    }

    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');

    const titleWidth = this.pdf.getTextWidth(title);
    const centerX = (this.pageWidth - titleWidth) / 2;

    this.pdf.text(title, centerX, this.currentY + 8);
    this.currentY += 25;
  }

  // private addProposalOverview(proposal: Proposal, template: string = 'modern') {
  //   this.pdf.setTextColor(0, 0, 0);
  //   this.pdf.setFontSize(14);
  //   this.pdf.setFont('helvetica', 'bold');
  //   this.pdf.text('Proposal Overview', this.margin, this.currentY);
  //   this.currentY += 10;

  //   // Create overview box
  //   const boxColor = template === 'professional' ? [248, 249, 250] : [252, 252, 252];
  //   this.pdf.setFillColor(boxColor[0], boxColor[1], boxColor[2]);
  //   this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 35, 'F');

  //   this.pdf.setFontSize(10);
  //   let overviewY = this.currentY + 8;

  //   // Left column
  //   this.pdf.setFont('helvetica', 'bold');
  //   this.pdf.text('Proposal ID:', this.margin + 5, overviewY);
  //   this.pdf.setFont('helvetica', 'normal');
  //   this.pdf.text(proposal.id.substring(0, 8), this.margin + 30, overviewY);

  //   overviewY += 6;
  //   this.pdf.setFont('helvetica', 'bold');
  //   this.pdf.text('Service Type:', this.margin + 5, overviewY);
  //   this.pdf.setFont('helvetica', 'normal');
  //   this.pdf.text(this.getServiceTypeLabel(proposal.service_type as ServiceType), this.margin + 35, overviewY);

  //   overviewY += 6;
  //   this.pdf.setFont('helvetica', 'bold');
  //   this.pdf.text('Status:', this.margin + 5, overviewY);
  //   this.pdf.setFont('helvetica', 'normal');
  //   this.pdf.text(proposal.status?.toUpperCase() || 'DRAFT', this.margin + 25, overviewY);

  //   // Right column
  //   overviewY = this.currentY + 8;
  //   const rightColumnX = this.pageWidth / 2 + 10;

  //   this.pdf.setFont('helvetica', 'bold');
  //   this.pdf.text('Created:', rightColumnX, overviewY);
  //   this.pdf.setFont('helvetica', 'normal');
  //   this.pdf.text(formatDate(proposal.created_at), rightColumnX + 25, overviewY);

  //   overviewY += 6;
  //   if (proposal.pricing_data) {
  //     const pricingData = proposal.pricing_data as any;
  //     this.pdf.setFont('helvetica', 'bold');
  //     this.pdf.text('Total Value:', rightColumnX, overviewY);
  //     this.pdf.setFont('helvetica', 'normal');
  //     this.pdf.text(formatCurrencyUtil(pricingData.total || 0), rightColumnX + 30, overviewY);
  //   }

  //   this.currentY += 40;
  // }

  private addClientInformation(
    proposal: Proposal,
    template: string = 'modern'
  ) {
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text('Client Information', this.margin, this.currentY);
    this.currentY += 10;

    // Create client info box
    const boxColor =
      template === 'professional' ? [248, 249, 250] : [252, 252, 252];
    this.pdf.setFillColor(boxColor[0], boxColor[1], boxColor[2]);
    this.pdf.rect(
      this.margin,
      this.currentY,
      this.pageWidth - 2 * this.margin,
      25,
      'F'
    );

    this.pdf.setFontSize(10);
    let infoY = this.currentY + 8;

    // Extract client info from global_inputs
    const globalInputs = proposal.global_inputs as any;

    if (globalInputs?.client_name) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Client Name:', this.margin + 5, infoY);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(globalInputs.client_name, this.margin + 30, infoY);
      infoY += 6;
    }

    if (globalInputs?.client_email) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Email:', this.margin + 5, infoY);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(globalInputs.client_email, this.margin + 25, infoY);
    }

    // Right column
    infoY = this.currentY + 8;
    const rightColumnX = this.pageWidth / 2 + 10;

    if (globalInputs?.contact_phone) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Phone:', rightColumnX, infoY);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(globalInputs.contact_phone, rightColumnX + 25, infoY);
      infoY += 6;
    }

    if (globalInputs?.property_address) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Address:', rightColumnX, infoY);
      this.pdf.setFont('helvetica', 'normal');
      const addressText = this.pdf.splitTextToSize(
        globalInputs.property_address,
        60
      );
      this.pdf.text(addressText, rightColumnX + 25, infoY);
    }

    this.currentY += 30;
  }

  private addFacilityDetails(
    facilityDetails: any,
    template: string = 'modern'
  ) {
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text('Facility Details', this.margin, this.currentY);
    this.currentY += 10;

    if (facilityDetails.building_type) {
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Building Type:', this.margin, this.currentY);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(
        facilityDetails.building_type,
        this.margin + 35,
        this.currentY
      );
      this.currentY += 6;
    }

    if (facilityDetails.total_area) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Total Area:', this.margin, this.currentY);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(
        `${facilityDetails.total_area} sq ft`,
        this.margin + 30,
        this.currentY
      );
      this.currentY += 6;
    }

    if (facilityDetails.floors) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Number of Floors:', this.margin, this.currentY);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(
        facilityDetails.floors.toString(),
        this.margin + 45,
        this.currentY
      );
      this.currentY += 6;
    }

    if (facilityDetails.special_features?.length > 0) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Special Features:', this.margin, this.currentY);
      this.currentY += 6;

      facilityDetails.special_features.forEach((feature: string) => {
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(`• ${feature}`, this.margin + 5, this.currentY);
        this.currentY += 5;
      });
    }

    this.currentY += 10;
  }

  private addEnhancedPricingBreakdown(
    pricingData: any,
    template: string = 'modern'
  ) {
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text('Pricing Breakdown', this.margin, this.currentY);
    this.currentY += 10;

    // Create pricing table
    const tableStartY = this.currentY;
    const rowHeight = 8;
    const colWidth = (this.pageWidth - 2 * this.margin) / 2;

    // Table header
    const headerColor =
      template === 'professional' ? [52, 152, 219] : [240, 240, 240];
    this.pdf.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    this.pdf.rect(
      this.margin,
      this.currentY,
      this.pageWidth - 2 * this.margin,
      rowHeight,
      'F'
    );

    const textColor = template === 'professional' ? [255, 255, 255] : [0, 0, 0];
    this.pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Description', this.margin + 5, this.currentY + 5);
    this.pdf.text('Amount', this.margin + colWidth + 5, this.currentY + 5);

    this.currentY += rowHeight;
    this.pdf.setTextColor(0, 0, 0);

    // Add pricing rows
    const pricingItems = [
      { label: 'Base Cost', value: pricingData.base_cost || 0 },
      { label: 'Labor Cost', value: pricingData.labor_cost || 0 },
      { label: 'Material Cost', value: pricingData.material_cost || 0 },
      { label: 'Equipment Cost', value: pricingData.equipment_cost || 0 },
      { label: 'Overhead', value: pricingData.overhead_cost || 0 },
      { label: 'Margin', value: pricingData.margin_cost || 0 },
    ];

    pricingItems.forEach((item, index) => {
      if (item.value > 0) {
        const bgColor = index % 2 === 0 ? [255, 255, 255] : [248, 248, 248];
        this.pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        this.pdf.rect(
          this.margin,
          this.currentY,
          this.pageWidth - 2 * this.margin,
          rowHeight,
          'F'
        );

        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(item.label, this.margin + 5, this.currentY + 5);
        this.pdf.text(
          formatCurrencyUtil(item.value),
          this.margin + colWidth + 5,
          this.currentY + 5
        );
        this.currentY += rowHeight;
      }
    });

    // Total row
    this.pdf.setFillColor(220, 220, 220);
    this.pdf.rect(
      this.margin,
      this.currentY,
      this.pageWidth - 2 * this.margin,
      rowHeight,
      'F'
    );
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('TOTAL', this.margin + 5, this.currentY + 5);
    this.pdf.text(
      formatCurrencyUtil(pricingData.total || 0),
      this.margin + colWidth + 5,
      this.currentY + 5
    );

    this.currentY += rowHeight + 10;
  }

  private addEnhancedContent(content: string, template: string = 'modern') {
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text('Proposal Content', this.margin, this.currentY);
    this.currentY += 10;

    // Parse and render content sections
    const sections = this.parseContent(content);

    sections.forEach((section) => {
      this.addEnhancedSection(section.title, section.content, template);
    });
  }

  private addEnhancedSection(
    title: string,
    content: string,
    template: string = 'modern'
  ) {
    // Check if we need a new page
    if (this.currentY > this.pageHeight - 50) {
      this.pdf.addPage();
      this.currentY = this.margin;
    }

    // Add section title with background
    if (template === 'professional') {
      this.pdf.setFillColor(236, 240, 241);
      this.pdf.rect(
        this.margin,
        this.currentY - 2,
        this.pageWidth - 2 * this.margin,
        12,
        'F'
      );
    }

    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text(title, this.margin + 2, this.currentY + 6);
    this.currentY += 15;

    // Add content
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    this.renderEnhancedMarkdownContent(content);
    this.currentY += 10;
  }

  private renderEnhancedMarkdownContent(content: string) {
    const maxWidth = this.pageWidth - 2 * this.margin - 10;
    const lines = content.split('\n');

    lines.forEach((line) => {
      if (this.currentY > this.pageHeight - 30) {
        this.pdf.addPage();
        this.currentY = this.margin;
      }

      if (line.trim() === '') {
        this.currentY += 4;
        return;
      }

      // Handle different markdown elements
      if (line.startsWith('# ')) {
        this.pdf.setFontSize(14);
        this.pdf.setFont('helvetica', 'bold');
        const text = line.substring(2);
        this.pdf.text(text, this.margin + 5, this.currentY);
        this.currentY += 8;
      } else if (line.startsWith('## ')) {
        this.pdf.setFontSize(12);
        this.pdf.setFont('helvetica', 'bold');
        const text = line.substring(3);
        this.pdf.text(text, this.margin + 5, this.currentY);
        this.currentY += 7;
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'normal');
        const text = line.substring(2);
        this.pdf.text('•', this.margin + 5, this.currentY);
        const wrappedText = this.pdf.splitTextToSize(text, maxWidth - 10);
        this.pdf.text(wrappedText, this.margin + 12, this.currentY);
        this.currentY += wrappedText.length * 4;
      } else {
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'normal');
        const wrappedText = this.pdf.splitTextToSize(line, maxWidth);
        this.pdf.text(wrappedText, this.margin + 5, this.currentY);
        this.currentY += wrappedText.length * 4;
      }

      this.currentY += 2;
    });
  }

  private addServiceReferences(references: any[], template: string = 'modern') {
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text('Service References', this.margin, this.currentY);
    this.currentY += 10;

    references.forEach((ref, index) => {
      if (this.currentY > this.pageHeight - 60) {
        this.pdf.addPage();
        this.currentY = this.margin;
      }

      // Reference box
      const boxColor =
        template === 'professional' ? [248, 249, 250] : [252, 252, 252];
      this.pdf.setFillColor(boxColor[0], boxColor[1], boxColor[2]);
      this.pdf.rect(
        this.margin,
        this.currentY,
        this.pageWidth - 2 * this.margin,
        40,
        'F'
      );

      let refY = this.currentY + 8;

      if (ref.client_name) {
        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(ref.client_name, this.margin + 5, refY);
        refY += 6;
      }

      if (ref.service_type) {
        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(`Service: ${ref.service_type}`, this.margin + 5, refY);
        refY += 5;
      }

      if (ref.duration) {
        this.pdf.text(`Duration: ${ref.duration}`, this.margin + 5, refY);
        refY += 5;
      }

      if (ref.testimonial) {
        this.pdf.setFont('helvetica', 'italic');
        const testimonialText = this.pdf.splitTextToSize(
          `"${ref.testimonial}"`,
          this.pageWidth - 2 * this.margin - 20
        );
        this.pdf.text(testimonialText, this.margin + 5, refY);
      }

      this.currentY += 45;
    });
  }

  private addCompanyBackground(
    background: string,
    template: string = 'modern'
  ) {
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text('About Our Company', this.margin, this.currentY);
    this.currentY += 10;

    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    const maxWidth = this.pageWidth - 2 * this.margin - 10;
    const wrappedText = this.pdf.splitTextToSize(background, maxWidth);
    this.pdf.text(wrappedText, this.margin + 5, this.currentY);
    this.currentY += wrappedText.length * 4 + 10;
  }

  private addEnhancedFooter(
    companyInfo?: PDFExportOptions['companyInfo'],
    companyProfile?: PDFExportOptions['companyProfile'],
    template: string = 'modern'
  ) {
    const pageCount = this.pdf.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.pdf.setPage(i);

      // Footer background for professional template
      if (template === 'professional') {
        this.pdf.setFillColor(41, 128, 185);
        this.pdf.rect(0, this.pageHeight - 20, this.pageWidth, 20, 'F');
        this.pdf.setTextColor(255, 255, 255);
      } else {
        this.pdf.setTextColor(100, 100, 100);
      }

      // Add footer line
      if (template !== 'professional') {
        this.pdf.setDrawColor(200, 200, 200);
        this.pdf.line(
          this.margin,
          this.pageHeight - 15,
          this.pageWidth - this.margin,
          this.pageHeight - 15
        );
      }

      // Add page number
      this.pdf.setFontSize(8);
      this.pdf.setFont('helvetica', 'normal');
      const pageText = `Page ${i} of ${pageCount}`;
      const textWidth = this.pdf.getTextWidth(pageText);
      this.pdf.text(
        pageText,
        this.pageWidth - this.margin - textWidth,
        this.pageHeight - 10
      );

      // Add company name in footer
      const companyName =
        companyProfile?.company_name || companyInfo?.name || 'Veltex AI';
      this.pdf.text(
        `Generated by ${companyName}`,
        this.margin,
        this.pageHeight - 10
      );
    }
  }

  private addFooter() {
    const pageCount = this.pdf.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.pdf.setPage(i);

      // Add page number
      this.pdf.setFontSize(8);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(100, 100, 100);

      const pageText = `Page ${i} of ${pageCount}`;
      const textWidth = this.pdf.getTextWidth(pageText);
      this.pdf.text(
        pageText,
        this.pageWidth - this.margin - textWidth,
        this.pageHeight - 10
      );

      // Add footer line
      this.pdf.setDrawColor(200, 200, 200);
      this.pdf.line(
        this.margin,
        this.pageHeight - 15,
        this.pageWidth - this.margin,
        this.pageHeight - 15
      );

      // Add generated by text
      this.pdf.text('Generated by Veltex', this.margin, this.pageHeight - 10);
    }
  }
}

// Utility functions - formatCurrency imported from @/lib/utils

export async function exportProposalToPDF(
  proposal: Proposal,
  options: Partial<PDFExportOptions> = {}
): Promise<Uint8Array> {
  const exporter = new PDFExporter();
  const exportOptions: PDFExportOptions = {
    proposal,
    ...options,
  };
  const blob = await exporter.exportProposal(exportOptions);
  return new Uint8Array(await blob.arrayBuffer());
}

export function downloadPDF(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

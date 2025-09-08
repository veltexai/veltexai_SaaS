import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  template?: 'modern' | 'classic' | 'minimal';
  includeServiceDetails?: boolean;
  includePricingBreakdown?: boolean;
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
      template = 'modern',
      includeServiceDetails = true,
      includePricingBreakdown = true
    } = options;

    // Add header
    this.addHeader(companyInfo);

    // Add proposal title
    this.addTitle(proposal.title);

    // Add proposal details
    this.addProposalDetails(proposal);

    // Add client information
    if (proposal.global_inputs) {
      this.addClientInformation(proposal.global_inputs as any);
    }

    // Add service details
    if (includeServiceDetails && proposal.service_specific_data) {
      this.addServiceDetails(proposal.service_type as ServiceType, proposal.service_specific_data as any);
    }

    // Add pricing breakdown
    if (includePricingBreakdown && proposal.pricing_data) {
      this.addPricingBreakdown(proposal.pricing_data as any);
    }

    // Add content sections (if available)
    // Note: content field will be added in future updates

    // Add footer
    this.addFooter();

    return this.pdf.output('blob');
  }

  private addHeader(companyInfo?: PDFExportOptions['companyInfo']) {
    // Add logo/company name
    this.pdf.setFontSize(24);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(59, 130, 246); // Blue color
    this.pdf.text(companyInfo?.name || 'Veltex', this.margin, this.currentY);

    // Add company details if provided
    if (companyInfo) {
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(100, 100, 100);

      let headerY = this.currentY + 5;

      if (companyInfo.address) {
        this.pdf.text(companyInfo.address, this.margin, headerY);
        headerY += 4;
      }

      if (companyInfo.phone || companyInfo.email) {
        const contactInfo = [companyInfo.phone, companyInfo.email]
          .filter(Boolean)
          .join(' | ');
        this.pdf.text(contactInfo, this.margin, headerY);
        headerY += 4;
      }

      if (companyInfo.website) {
        this.pdf.text(companyInfo.website, this.margin, headerY);
        headerY += 4;
      }

      this.currentY = headerY + 10;
    } else {
      this.currentY += 15;
    }

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

  private addProposalDetails(proposal: Proposal) {
    // Create a details box
    this.pdf.setFillColor(248, 250, 252); // Light gray background
    this.pdf.rect(
      this.margin,
      this.currentY,
      this.pageWidth - 2 * this.margin,
      35,
      'F'
    );

    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);

    let detailsY = this.currentY + 8;
    const globalInputs = proposal.global_inputs as any;
    const pricingData = proposal.pricing_data as any;

    // Left column
    this.pdf.text('Client:', this.margin + 5, detailsY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(globalInputs?.client_name || 'N/A', this.margin + 25, detailsY);

    detailsY += 6;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Email:', this.margin + 5, detailsY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(globalInputs?.email || 'N/A', this.margin + 25, detailsY);

    detailsY += 6;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Service Type:', this.margin + 5, detailsY);
    this.pdf.setFont('helvetica', 'normal');
    const serviceTypeLabel = this.getServiceTypeLabel(proposal.service_type as ServiceType);
    this.pdf.text(serviceTypeLabel, this.margin + 35, detailsY);

    // Right column
    detailsY = this.currentY + 8;
    const rightColumnX = this.pageWidth / 2 + 10;

    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Date:', rightColumnX, detailsY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(formatDate(proposal.created_at), rightColumnX + 20, detailsY);

    detailsY += 6;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Status:', rightColumnX, detailsY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(proposal.status?.toUpperCase() || 'DRAFT', rightColumnX + 20, detailsY);

    detailsY += 6;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Total:', rightColumnX, detailsY);
    this.pdf.setFont('helvetica', 'normal');
    const total = pricingData?.total || 0;
    this.pdf.text(formatCurrencyUtil(total), rightColumnX + 20, detailsY);

    this.currentY += 40;
  }

  private getServiceTypeLabel(serviceType: ServiceType): string {
    const labels = {
      residential: 'Residential Cleaning',
      commercial: 'Commercial Cleaning',
      carpet: 'Carpet Cleaning',
      window: 'Window Cleaning',
      floor: 'Floor Cleaning'
    };
    return labels[serviceType] || 'Unknown Service';
  }

  private addClientInformation(globalInputs: any) {
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text('Client Information', this.margin, this.currentY);
    this.currentY += 10;

    // Create client info box
    this.pdf.setFillColor(252, 252, 252);
    this.pdf.rect(
      this.margin,
      this.currentY,
      this.pageWidth - 2 * this.margin,
      25,
      'F'
    );

    this.pdf.setFontSize(10);
    this.pdf.setTextColor(0, 0, 0);
    let infoY = this.currentY + 6;

    // Left column
    if (globalInputs.client_name) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Name:', this.margin + 5, infoY);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(globalInputs.client_name, this.margin + 25, infoY);
      infoY += 5;
    }

    if (globalInputs.company) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Company:', this.margin + 5, infoY);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(globalInputs.company, this.margin + 30, infoY);
      infoY += 5;
    }

    // Right column
    infoY = this.currentY + 6;
    const rightColumnX = this.pageWidth / 2 + 10;

    if (globalInputs.phone) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Phone:', rightColumnX, infoY);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(globalInputs.phone, rightColumnX + 20, infoY);
      infoY += 5;
    }

    if (globalInputs.address) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Address:', rightColumnX, infoY);
      this.pdf.setFont('helvetica', 'normal');
      const addressLines = this.pdf.splitTextToSize(globalInputs.address, 80);
      this.pdf.text(addressLines, rightColumnX + 25, infoY);
    }

    this.currentY += 30;
  }

  private addServiceDetails(serviceType: ServiceType, serviceData: any) {
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
        this.pdf.text(`• ${room.type} (${room.size})`, this.margin + 10, this.currentY);
        if (room.special_requirements) {
          this.currentY += 4;
          this.pdf.text(`  Special: ${room.special_requirements}`, this.margin + 15, this.currentY);
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
        this.pdf.text(`• ${area.type} - ${area.size} sq ft`, this.margin + 10, this.currentY);
        if (area.frequency) {
          this.pdf.text(` (${area.frequency})`, this.margin + 80, this.currentY);
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
        this.pdf.text(`• ${carpet.room} - ${carpet.size} sq ft`, this.margin + 10, this.currentY);
        if (carpet.material) {
          this.pdf.text(` (${carpet.material})`, this.margin + 80, this.currentY);
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
        this.pdf.text(`• ${window.location} - ${window.count} windows`, this.margin + 10, this.currentY);
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
        this.pdf.text(`• ${floor.room} - ${floor.size} sq ft`, this.margin + 10, this.currentY);
        if (floor.material) {
          this.pdf.text(` (${floor.material})`, this.margin + 80, this.currentY);
        }
        this.currentY += 5;
      });
    }
  }

  private addPricingBreakdown(pricingData: any) {
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text('Pricing Breakdown', this.margin, this.currentY);
    this.currentY += 10;

    // Create pricing table
    this.pdf.setFillColor(248, 250, 252);
    this.pdf.rect(
      this.margin,
      this.currentY,
      this.pageWidth - 2 * this.margin,
      60,
      'F'
    );

    this.pdf.setFontSize(10);
    let pricingY = this.currentY + 8;

    // Base price
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Base Price:', this.margin + 5, pricingY);
    this.pdf.text(formatCurrencyUtil(pricingData.base_price || 0), this.pageWidth - this.margin - 30, pricingY);
    pricingY += 6;

    // Labor
    if (pricingData.labor_hours > 0) {
      this.pdf.text(`Labor (${pricingData.labor_hours} hours):`, this.margin + 5, pricingY);
      this.pdf.text(formatCurrencyUtil(pricingData.labor_cost || 0), this.pageWidth - this.margin - 30, pricingY);
      pricingY += 6;
    }

    // Overhead
    if (pricingData.overhead_cost > 0) {
      this.pdf.text(`Overhead (${pricingData.overhead_percentage}%):`, this.margin + 5, pricingY);
      this.pdf.text(formatCurrencyUtil(pricingData.overhead_cost), this.pageWidth - this.margin - 30, pricingY);
      pricingY += 6;
    }

    // Margin
    if (pricingData.margin_cost > 0) {
      this.pdf.text(`Margin (${pricingData.margin_percentage}%):`, this.margin + 5, pricingY);
      this.pdf.text(formatCurrencyUtil(pricingData.margin_cost), this.pageWidth - this.margin - 30, pricingY);
      pricingY += 6;
    }

    // Adjustments
    if (pricingData.adjustments && Object.keys(pricingData.adjustments).length > 0) {
      Object.entries(pricingData.adjustments).forEach(([key, value]: [string, any]) => {
        if (value !== 0) {
          this.pdf.text(`${key.replace('_', ' ').toUpperCase()}:`, this.margin + 5, pricingY);
          this.pdf.text(formatCurrencyUtil(value), this.pageWidth - this.margin - 30, pricingY);
          pricingY += 6;
        }
      });
    }

    // Subtotal line
    pricingY += 3;
    this.pdf.setDrawColor(150, 150, 150);
    this.pdf.line(this.margin + 5, pricingY, this.pageWidth - this.margin - 5, pricingY);
    pricingY += 6;

    // Total
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(12);
    this.pdf.text('TOTAL:', this.margin + 5, pricingY);
    this.pdf.text(formatCurrencyUtil(pricingData.total || 0), this.pageWidth - this.margin - 30, pricingY);

    this.currentY += 65;
  }

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
    this.pdf.setTextColor(59, 130, 246);
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
    
    // Split text by bold markers
    const parts = text.split(/\*\*(.*?)\*\*/g);
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
    ...options
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

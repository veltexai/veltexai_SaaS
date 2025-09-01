import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Proposal } from '@/types/database';
import { formatDate, formatCurrency } from '@/lib/utils';

export interface PDFExportOptions {
  proposal: Proposal;
  companyInfo?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  template?: 'modern' | 'classic' | 'minimal';
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
    const { proposal, companyInfo, template = 'modern' } = options;

    // Add header
    this.addHeader(companyInfo);

    // Add proposal title
    this.addTitle(proposal.title);

    // Add proposal details
    this.addProposalDetails(proposal);

    // Add content sections
    this.addContent(proposal.content || 'No content generated yet');

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
      30,
      'F'
    );

    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);

    let detailsY = this.currentY + 8;

    // Left column
    this.pdf.text('Client:', this.margin + 5, detailsY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(proposal.client_name, this.margin + 25, detailsY);

    detailsY += 6;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Email:', this.margin + 5, detailsY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(proposal.client_email || 'N/A', this.margin + 25, detailsY);

    // Right column
    detailsY = this.currentY + 8;
    const rightColumnX = this.pageWidth / 2 + 10;

    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Date:', rightColumnX, detailsY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(formatDate(proposal.created_at), rightColumnX + 20, detailsY);

    detailsY += 6;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Total:', rightColumnX, detailsY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(formatCurrency(proposal.value), rightColumnX + 20, detailsY);

    detailsY += 6;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Service:', rightColumnX, detailsY);
    this.pdf.setFont('helvetica', 'normal');
    // this.pdf.text(proposal.service_type || 'Not specified', rightColumnX + 20, detailsY)

    detailsY += 6;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Frequency:', rightColumnX, detailsY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(
      proposal.service_frequency || 'Not specified',
      rightColumnX + 20,
      detailsY
    );

    this.currentY += 35;
  }

  private addContent(content: string) {
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text('Proposal Details', this.margin, this.currentY);
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

// Utility function to export proposal as PDF
export async function exportProposalToPDF(
  proposal: Proposal,
  options?: Partial<PDFExportOptions>
): Promise<Blob> {
  const exporter = new PDFExporter();
  return await exporter.exportProposal({
    proposal,
    ...options,
  });
}

// Function to download PDF
export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

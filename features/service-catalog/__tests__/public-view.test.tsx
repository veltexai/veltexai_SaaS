/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PublicProposalView } from '@/features/proposals/components/public-proposal-view';
import { composeCatalogProposal } from '../proposal';
import { defaultJob } from '../catalog';
import { catalogDocumentText } from '../document';
jest.mock('../components/catalog-document', () => ({ CatalogDocument: ({ content }: { content: string }) => <div>{catalogDocumentText(content)}</div> }));
it('shows the catalog turnover agreement without contradictory legacy metadata or an empty email row', () => {
 const p = composeCatalogProposal({ job: defaultJob('airbnb_turnover'), client: { client_name: 'Sample', client_email: 'sample@example.com', contact_phone: '555', service_location: 'Test', facility_size: 1500, service_frequency: 'one-time' } });
 const { container } = render(<PublicProposalView proposal={{ id: 'test', title: p.title, client_name: 'Sample', client_company: '', service_location: 'Test', service_type: 'residential', service_frequency: 'one-time', facility_size: 1500, generated_content: p.generated_content!, pricing_enabled: true, pricing_data: p.pricing_data, status: 'draft', created_at: '2026-09-22', catalog_document: true, company_profiles: { company_name: 'Keystone Cleaning' } }} tracking={{ id: 'test', tracking_id: 'test', proposal_id: 'test', recipient_email: '', delivery_method: 'online', track_opens: true, track_downloads: true, view_count: 0, download_count: 0 }} />);
 expect(screen.queryByText('Service Details')).not.toBeInTheDocument();
 expect(container.textContent).not.toMatch(/one-time|residential/);
 expect(container.querySelector('.lucide-mail')).toBeNull();
 expect(container.textContent).toContain('per-turn service agreement');
});

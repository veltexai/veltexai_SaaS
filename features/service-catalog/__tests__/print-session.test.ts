import { generateProposalPDFWithPlaywright } from '@/features/proposals/services/pdf/playwright-generator';
const addCookies = jest.fn(), pdf = jest.fn(), close = jest.fn();
let denied = false;
jest.mock('playwright', () => ({ chromium: { launch: async () => ({ close, newPage: async () => ({
  context: () => ({ addCookies }), goto: jest.fn(), emulateMedia: jest.fn(),
  getByText: () => ({ count: async () => denied ? 1 : 0 }), pdf,
}) }) } }));
beforeEach(() => { jest.clearAllMocks(); denied = false; pdf.mockResolvedValue(Buffer.from('test-pdf')); });
it('forwards caller session to the protected print page', async () => {
  await generateProposalPDFWithPlaywright('owned-id', [{ name: 'session', value: 'test-session' }]);
  expect(addCookies).toHaveBeenCalledWith([expect.objectContaining({ name: 'session', value: 'test-session', httpOnly: true, path: '/' })]);
  expect(pdf).toHaveBeenCalled(); expect(close).toHaveBeenCalled();
});
it('does not attach a PDF containing an authorization error', async () => {
  denied = true;
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try { await expect(generateProposalPDFWithPlaywright('other-id')).rejects.toThrow('Failed to generate PDF'); }
  finally { log.mockRestore(); }
  expect(pdf).not.toHaveBeenCalled(); expect(close).toHaveBeenCalled();
});

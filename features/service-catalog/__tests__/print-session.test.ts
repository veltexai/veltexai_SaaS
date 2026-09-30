import {
  generateProposalPDFWithPlaywright,
  generateTrackedProposalPDFWithPlaywright,
  TRACKED_PRINT_COOKIE,
} from '@/features/proposals/services/pdf/playwright-generator';
const addCookies = jest.fn(), pdf = jest.fn(), close = jest.fn(), goto = jest.fn();
const mockLaunch = jest.fn(async () => ({ close, newPage: async () => ({
  context: () => ({ addCookies }), goto, emulateMedia: jest.fn(),
  getByText: () => ({ count: async () => denied ? 1 : 0 }), pdf,
}) }));
let denied = false;
jest.mock('playwright', () => ({ chromium: { launch: mockLaunch } }));
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
it('uses the configured local Chrome executable for attachment generation', async () => {
  const previous = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  try {
    await generateProposalPDFWithPlaywright('owned-id');
    expect(mockLaunch).toHaveBeenCalledWith({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    });
  } finally {
    if (previous === undefined) delete process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    else process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = previous;
  }
});

it('keeps tracked tokens out of the URL and inside a path-scoped secure cookie', async () => {
  await generateTrackedProposalPDFWithPlaywright('proposal-id', 'tracking-token-value');
  expect(addCookies).toHaveBeenCalledWith([
    expect.objectContaining({
      name: TRACKED_PRINT_COOKIE,
      value: 'tracking-token-value',
      path: '/print/tracked/proposal-id',
      httpOnly: true,
      sameSite: 'Strict',
    }),
  ]);
  expect(goto).toHaveBeenCalledWith(
    expect.stringContaining('/print/tracked/proposal-id'),
    { waitUntil: 'networkidle' },
  );
  expect(goto.mock.calls[0][0]).not.toContain('tracking-token-value');
});

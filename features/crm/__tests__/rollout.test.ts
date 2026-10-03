import { isCrmWorkspaceEnabled } from '../rollout';

const original = process.env.CRM_WORKSPACE_ENABLED;

afterEach(() => {
  if (original === undefined) delete process.env.CRM_WORKSPACE_ENABLED;
  else process.env.CRM_WORKSPACE_ENABLED = original;
});

it('is enabled by default for the established workspace', () => {
  delete process.env.CRM_WORKSPACE_ENABLED;
  expect(isCrmWorkspaceEnabled()).toBe(true);
});

it('supports a server-side emergency disable without exposing a public flag', () => {
  process.env.CRM_WORKSPACE_ENABLED = 'false';
  expect(isCrmWorkspaceEnabled()).toBe(false);
});

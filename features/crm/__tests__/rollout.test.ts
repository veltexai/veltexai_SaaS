import { isCrmWorkspaceEnabled } from '../rollout';

const original = process.env.CRM_WORKSPACE_ENABLED;

afterEach(() => {
  if (original === undefined) delete process.env.CRM_WORKSPACE_ENABLED;
  else process.env.CRM_WORKSPACE_ENABLED = original;
});

describe('CRM server-side rollout literal', () => {
  it('supports the exact lowercase emergency-disable value', () => {
    process.env.CRM_WORKSPACE_ENABLED = 'false';
    expect(isCrmWorkspaceEnabled()).toBe(false);
  });

  it.each([
    ['unset', undefined],
    ['blank', ''],
    ['mixed-case False', 'False'],
    ['uppercase FALSE', 'FALSE'],
    ['zero', '0'],
    ['true', 'true'],
    ['typo', 'flase'],
  ])('does not mistake %s for the exact disable literal', (_label, value) => {
    if (value === undefined) delete process.env.CRM_WORKSPACE_ENABLED;
    else process.env.CRM_WORKSPACE_ENABLED = value;

    expect(isCrmWorkspaceEnabled()).toBe(true);
  });
});

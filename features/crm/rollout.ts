export function isCrmWorkspaceEnabled() {
  return process.env.CRM_WORKSPACE_ENABLED !== 'false';
}

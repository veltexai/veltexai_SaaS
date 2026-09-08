import { detectTemplateType } from '../utils/utils';
it('does not grant Executive Premium by omitting template_id', () => {
  expect(detectTemplateType(undefined)).toBe('basic');
  expect(detectTemplateType(null)).toBe('basic');
});

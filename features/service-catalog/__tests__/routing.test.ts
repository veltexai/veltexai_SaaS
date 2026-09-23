import { catalogPath } from '../routing';
it('preserves signup/demo/design context when adapting a quick proposal', () => {
 const url = new URL(catalogPath('airbnb_turnover', { source: 'signup', demoType: 'residential', designTemplateType: 'premium', templateId: 'test' }), 'http://localhost');
 expect(Object.fromEntries(url.searchParams)).toEqual({ job: 'airbnb_turnover', source: 'signup', demoType: 'residential', designTemplateType: 'premium', templateId: 'test' });
});

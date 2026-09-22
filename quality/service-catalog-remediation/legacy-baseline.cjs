// Capture the actual approved base's pure pricing/scope outputs, never live data.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const ts = require('typescript');
function loadBase(path) {
 const source = execFileSync('git', ['show', `a4deb7c:${path}`], { encoding: 'utf8' });
 const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
 const module = { exports: {} }; new Function('module','exports',compiled)(module,module.exports); return module.exports;
}
const { PricingEngine } = loadBase('features/proposals/services/pricing-engine.ts');
const { SCOPE_TEMPLATE_IDS, getScopeTemplate } = loadBase('features/proposals/quick/constants/scope-templates.ts');
const settings = { id: 'synthetic', user_id: 'synthetic', labor_rate: 35, overhead_percentage: 15, margin_percentage: 25, production_rates: { residential: 1000, commercial: 800, carpet: 1200, window: 500, floor: 900 }, frequency_multipliers: { 'one-time': 1, weekly: 0.9 }, service_type_rates: { residential: 0.15, commercial: 0.2, carpet: 0.12, window: 0.25, floor: 0.18 }, created_at: '2026-09-22', updated_at: '2026-09-22' };
const services = ['commercial','residential','carpet','window','floor'].map(serviceType => {
 const input = { serviceType, facilitySize: 1500, serviceFrequency: 'one-time', serviceSpecificData: {}, globalInputs: {} };
 return { input, expected: new PricingEngine(settings).calculatePricing(input) };
});
fs.writeFileSync('quality/service-catalog-remediation/legacy-golden.json', JSON.stringify({ base: 'a4deb7c', settings, services, templates: SCOPE_TEMPLATE_IDS.map(id => getScopeTemplate(id)) }, null, 2));

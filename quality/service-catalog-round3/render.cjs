// Local-only visual fixtures. No account, generation, email or production API calls.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = process.cwd();
const out = path.join(root, 'quality/service-catalog-round3/artifacts');
fs.mkdirSync(out, { recursive: true });
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return originalResolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args); };
const originalLoad = Module._load;
Module._load = function (name, ...args) {
  if (name === 'next/navigation') return { useRouter: () => ({ push() {}, refresh() {} }) };
  if (name === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
  return originalLoad.call(this, name, ...args);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
};
const { CatalogWorkbench } = require('../../features/service-catalog/components/workbench.tsx');
const { CatalogDocument } = require('../../features/service-catalog/components/catalog-document.tsx');
const { defaultJob, CATALOG } = require('../../features/service-catalog/catalog.ts');
const { composeCatalogProposal } = require('../../features/service-catalog/proposal.ts');
const css = fs.readdirSync('.next/static/css').map(f => fs.readFileSync(path.join('.next/static/css', f), 'utf8')).join('\n');
function write(name, element) {
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}\nbody{background:#f3f4f6;padding:16px;font-family:Arial,sans-serif;}@media print{@page{size:A4;margin:16mm}body{padding:0;background:white}}</style></head><body>${renderToStaticMarkup(element)}</body></html>`;
  fs.writeFileSync(path.join(out, `${name}.html`), html);
}
for (const type of ['recurring_standard', 'airbnb_turnover']) write(`${type}-workbench`, React.createElement(CatalogWorkbench, { demo: false, initialJobType: type }));
for (const pack of CATALOG) {
  const job = { ...defaultJob(pack.id), access: 'Safe lockbox access; parking beside entrance.', companyName: 'Example Cleaning Company' };
  const proposal = composeCatalogProposal({ job, client: { client_name: 'Sample customer', client_email: 'sample@example.com', contact_phone: '555-0100', service_location: 'Example property', facility_size: job.squareFeet, service_frequency: job.frequency } });
  fs.writeFileSync(path.join(out, `${pack.id}-proposal.json`), JSON.stringify(proposal, null, 2));
  write(`${pack.id}-proposal`, React.createElement(CatalogDocument, { content: proposal.generated_content, companyName: 'Example Cleaning Company' }));
}
console.log('Wrote local-only fixtures to', out);

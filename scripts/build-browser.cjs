const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const Babel = require(path.join(rootDir, 'libs', 'babel.js'));
const outputDir = path.join(rootDir, 'dist', 'browser');

const entries = [
  'src/iconLibrary.jsx',
  'src/icons.jsx',
  'src/backend/mockBackend.jsx',
  'src/components/SteeringWheelIcon.jsx',
  'src/components/TractorVehicle.jsx',
  'src/components/ui.jsx',
  'src/app.jsx',
  'src/bootstrap.jsx'
];

fs.mkdirSync(outputDir, { recursive: true });
for (const fileName of fs.readdirSync(outputDir)) {
  if (fileName.endsWith('.js')) fs.rmSync(path.join(outputDir, fileName), { force: true });
}

const reactBindings = new Set();
const sources = entries.map((sourcePath) => {
  const absoluteSourcePath = path.join(rootDir, sourcePath);
  let source = fs.readFileSync(absoluteSourcePath, 'utf8');
  const reactDestructure = source.match(/^const\s+\{([^}]+)\}\s*=\s*React;\s*/);

  if (reactDestructure) {
    for (const binding of reactDestructure[1].split(',').map((name) => name.trim())) {
      if (!/^[A-Za-z_$][\w$]*$/.test(binding)) {
        throw new Error(`Unsupported React binding "${binding}" in ${sourcePath}`);
      }
      reactBindings.add(binding);
    }
    source = source.slice(reactDestructure[0].length);
  }

  return `\n// Source: ${sourcePath}\n${source}`;
});

const combinedSource = [
  `const { ${Array.from(reactBindings).join(', ')} } = React;`,
  ...sources
].join('\n');

const result = Babel.transform(combinedSource, {
  presets: [['react', { runtime: 'classic' }]],
  plugins: ['transform-block-scoping'],
  sourceType: 'script',
  comments: false,
  compact: true,
  sourceMaps: false
});
const output = `// Generated browser bundle. Run npm run build after editing JSX.\n${result.code}\n`;
const outputPath = path.join(outputDir, 'app.bundle.js');
fs.writeFileSync(outputPath, output, 'utf8');
console.log(`Built ${entries.length} JSX sources -> dist/browser/app.bundle.js (${(Buffer.byteLength(output) / 1024).toFixed(1)} KB)`);

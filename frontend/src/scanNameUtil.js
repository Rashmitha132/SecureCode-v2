// scanNameUtil.js
// Utility to generate a smart, concise, and suitable 1-to-2 word name for every scan

export function getScanName(scan) {
  if (!scan) return 'Security-Scan';

  // 1. If scan already has an explicit name
  if (scan.name && scan.name !== 'Scan' && !scan.name.startsWith('#')) return scan.name;
  if (scan.scan_name && scan.scan_name !== 'Scan') return scan.scan_name;

  // 2. If uploaded from a file name
  const fileName = scan.file_name || scan.fileName || scan.filename || '';
  if (fileName && typeof fileName === 'string' && fileName.trim()) {
    const base = fileName.split(/[/\\]/).pop().replace(/\.[^/.]+$/, '').trim();
    if (base) {
      return base.charAt(0).toUpperCase() + base.slice(1);
    }
  }

  // 3. Inspect findings for primary risk theme
  const findings = scan.findings || [];
  if (findings.length > 0) {
    const types = findings.map(f => (f.type || f.category || '').toLowerCase());
    if (types.some(t => t.includes('sql') || t.includes('sqli') || t.includes('injection'))) {
      return 'SQLi-Audit';
    }
    if (types.some(t => t.includes('password') || t.includes('secret') || t.includes('key') || t.includes('token'))) {
      return 'Secrets-Audit';
    }
    if (types.some(t => t.includes('xss') || t.includes('cross-site'))) {
      return 'XSS-Audit';
    }
    if (types.some(t => t.includes('eval') || t.includes('rce') || t.includes('command'))) {
      return 'RCE-Audit';
    }
    if (types.some(t => t.includes('auth') || t.includes('jwt') || t.includes('credential'))) {
      return 'Auth-Audit';
    }
  }

  // 4. Inspect code content for technology or endpoint signature
  const code = scan.code || scan.snippet || '';
  if (typeof code === 'string' && code.trim()) {
    const codeLower = code.toLowerCase();
    if (codeLower.includes('mysql') || codeLower.includes('select ') || codeLower.includes('insert into')) {
      return 'Database-Query';
    }
    if (codeLower.includes('express') || codeLower.includes('app.get') || codeLower.includes('app.post') || codeLower.includes('router.')) {
      return 'Express-API';
    }
    if (codeLower.includes('jwt') || codeLower.includes('authenticate') || codeLower.includes('login') || codeLower.includes('bcrypt')) {
      return 'Auth-Service';
    }
    if (codeLower.includes('dockerfile') || codeLower.includes('yaml') || codeLower.includes('.env')) {
      return 'Config-Manifest';
    }
    if (codeLower.includes('def ') || codeLower.includes('import os') || codeLower.includes('django') || codeLower.includes('flask')) {
      return 'Python-Module';
    }
    if (codeLower.includes('const ') || codeLower.includes('function ') || codeLower.includes('=>')) {
      return 'JavaScript-Module';
    }
  }

  // 5. Inspect source type
  const src = (scan.source || scan.source_type || scan.sourceType || '').toLowerCase();
  if (src.includes('generated') || src.includes('ai')) return 'AI-Synthesis';
  if (src.includes('dependency') || src.includes('package')) return 'Dependency-Check';
  if (src.includes('config') || src.includes('env')) return 'Config-Audit';

  // 6. Default clean fallback
  return 'Code-Audit';
}

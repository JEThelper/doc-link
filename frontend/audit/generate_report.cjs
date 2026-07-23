// audit/generate_report.cjs
/**
 * Consolidates data from screenshots, button metadata, axe reports, and Lighthouse
 * into a Markdown report using Mustache templates (`audit/report_template.md`).
 */
const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');

const template = fs.readFileSync(path.join(__dirname, 'report_template.md'), 'utf8');
const routes = JSON.parse(fs.readFileSync(path.join(__dirname, 'routes.json')));

function loadJSON(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

const sections = routes.map(route => {
  const safe = route.replace(/[^a-zA-Z0-9]/g, '_') || 'home';
  const btnPath = path.join(__dirname, 'buttons', `${safe}.json`);
  const axePath = path.join(__dirname, `axe_${safe}.json`);
  const lhPath = path.join(__dirname, `lh_${safe}.json`);
  const screenshotPath = path.join('audit', 'screenshots', `${safe}.png`);
  const buttonData = fs.existsSync(btnPath) ? loadJSON(btnPath) : [];
  const axeData = fs.existsSync(axePath) ? loadJSON(axePath) : { violations: [] };
  const lhData = fs.existsSync(lhPath) ? loadJSON(lhPath) : { categories: { performance: { score: null } }, audits: {} };

  // Derive simple aggregates
  const buttonCount = buttonData.length;
  const commonClasses = Array.from(new Set(buttonData.flatMap(b => b.classes.split(/\s+/).filter(Boolean))))
    .slice(0, 5).join(', ');
  const accessibilityViolations = axeData.violations.length;
  const topIssues = axeData.violations.slice(0, 3).map(v => ({
    impact: v.impact,
    description: v.description,
    helpUrl: v.helpUrl,
  }));
  const performanceScore = lhData.categories.performance.score != null ? (lhData.categories.performance.score * 100).toFixed(0) : 'N/A';
  const fcp = lhData.audits['first-contentful-paint']?.displayValue || 'N/A';
  const tti = lhData.audits['interactive']?.displayValue || 'N/A';

  return {
    route,
    screenshotPath,
    buttonCount,
    commonClasses,
    accessibilityViolations,
    topIssues,
    performanceScore,
    fcp,
    tti,
  };
});

// Simple averages for executive summary
const averageAccessibilityViolations = (sections.reduce((sum, s) => sum + s.accessibilityViolations, 0) / sections.length).toFixed(1);
const averagePerformanceScore = (sections.reduce((sum, s) => sum + (parseInt(s.performanceScore) || 0), 0) / sections.length).toFixed(0);

const output = Mustache.render(template, {
  date: new Date().toISOString().split('T')[0],
  sections,
  averageAccessibilityViolations,
  averagePerformanceScore,
});

fs.writeFileSync(path.join(__dirname, 'UI_UX_Audit_Report.md'), output);
console.log('Report generated at', path.join(__dirname, 'UI_UX_Audit_Report.md'));

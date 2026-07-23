# My River UI/UX Audit Report

*Date:* {{date}}

## Executive Summary
- Total pages audited: {{sections.length}}
- Overall accessibility score (average violations): {{averageAccessibilityViolations}}
- Average performance score: {{averagePerformanceScore}}

---
{{#sections}}
### Page: {{route}}
![Screenshot]({{screenshotPath}})

#### Button Inventory
- Total interactive elements: {{buttonCount}}
- Common classes/patterns: {{commonClasses}}

#### Accessibility Findings (WCAG 2.1 AA)
- Violations: {{accessibilityViolations}}
- Top issues:
  {{#topIssues}}
  - {{impact}}: {{description}} ({{helpUrl}})
  {{/topIssues}}

#### Performance Metrics (Lighthouse)
- Performance score: {{performanceScore}}
- First Contentful Paint: {{fcp}}
- Time to Interactive: {{tti}}

---
{{/sections}}

## Recommendations
### Layout & Grid
- ...
### Buttons & States
- ...
### Typography & Color Contrast
- ...
### Accessibility Fixes
- ...
### Performance Optimisations
- ...

## Appendix
- Full JSON reports are located in `audit/` directory.

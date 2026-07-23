#!/usr/bin/env bash
# Run Lighthouse for each discovered route and output JSON + HTML reports.

# Determine Chrome/Chromium path using Playwright's bundled Chromium
CHROME_PATH=$(node - <<'NODE'
const { chromium } = require('playwright');
console.log(chromium.executablePath());
NODE
)
export CHROME_PATH

ROUTES=$(jq -r '.[]' audit/routes.json)
for r in $ROUTES; do
  URL="https://myriver.onrender.com$r"
  SAFE=$(printf "%s" "$r" | sed 's/[^a-zA-Z0-9]/_/g')
  lighthouse "$URL" \
    --output=json,html \
    --output-path=audit/lh_${SAFE} \
    --quiet \
    --chrome-flags="--headless" \
    --chrome-path="$CHROME_PATH" \
    --no-enable-error-reporting
  echo "Lighthouse completed for $URL"
done

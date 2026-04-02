#!/usr/bin/env bash
set -euo pipefail

echo "Building Astro site..."
pnpm build

echo "Uploading to DigitalOcean Spaces..."

# Configure AWS CLI for DigitalOcean Spaces
export AWS_ACCESS_KEY_ID="$DO_SPACES_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$DO_SPACES_SECRET_ACCESS_KEY"

# Upload all assets with long cache (1 year)
aws s3 sync dist/ "$DO_SPACES_BUCKET" \
  --endpoint-url "$DO_SPACES_ENDPOINT" \
  --acl public-read \
  --delete \
  --cache-control "max-age=31536000, immutable" \
  --exclude "*.html" \
  --exclude "favicon.*"

# Upload HTML files with no-cache (revalidate on each request)
aws s3 sync dist/ "$DO_SPACES_BUCKET" \
  --endpoint-url "$DO_SPACES_ENDPOINT" \
  --acl public-read \
  --cache-control "max-age=0, must-revalidate" \
  --exclude "*" \
  --include "*.html"

# Upload favicon files with short cache (1 day)
aws s3 sync dist/ "$DO_SPACES_BUCKET" \
  --endpoint-url "$DO_SPACES_ENDPOINT" \
  --acl public-read \
  --cache-control "max-age=86400" \
  --exclude "*" \
  --include "favicon.*"

echo "Deploy complete!"

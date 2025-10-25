#!/usr/bin/env bash
set -euo pipefail

# Create project directories (except root and src)
mkdir -p public/images
mkdir -p src/components/ui
mkdir -p src/contexts
mkdir -p src/hooks
mkdir -p src/integrations/supabase
mkdir -p src/lib
mkdir -p supabase/migrations
mkdir -p supabase/functions

echo "✅ Folder structure created successfully."


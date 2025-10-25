cat > tailwind-setup.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail

# --- sanity checks ---
if [ ! -d "src" ]; then
  echo "❌ No ./src directory found. Run this from your project root (where src/ lives)."
  exit 1
fi

echo "🛠  Writing Tailwind / TS configs and creating folders…"

# tailwind.config.ts
cat > tailwind.config.ts << 'EOF'
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" }
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      }
    }
  },
  plugins: [],
} satisfies Config;
EOF

# directories (src already exists; we add below it)
mkdir -p src/components/ui
mkdir -p src/contexts
mkdir -p src/hooks
mkdir -p src/integrations/supabase
mkdir -p src/lib
mkdir -p src/pages
mkdir -p public/images
mkdir -p supabase/migrations
mkdir -p supabase/functions

# postcss.config.js
cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# tsconfig.app.json (optional split config)
cat > tsconfig.app.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
EOF

# tsconfig.node.json
cat > tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
EOF

# shadcn/ui components.json
cat > components.json << 'EOF'
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
EOF

# Ensure Tailwind entry exists (and has the directives)
if [ ! -f "src/index.css" ]; then
  cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF
  echo "➕ Created src/index.css with Tailwind directives"
else
  # add directives if missing
  if ! grep -q "@tailwind base" src/index.css 2>/dev/null; then
    printf "%s\n%s\n%s\n" "@tailwind base;" "@tailwind components;" "@tailwind utilities;" >> src/index.css
    echo "➕ Appended Tailwind directives to existing src/index.css"
  fi
fi

echo "✅ Tailwind + config files written."
echo "👉 Next steps:"
echo "   1) Ensure dev deps are installed:"
echo "      npm i -D tailwindcss postcss autoprefixer"
echo "   2) Make sure your src/main.tsx imports './index.css'"
echo "   3) Run: npm run dev"
SH

chmod +x tailwind-setup.sh
bash ./tailwind-setup.sh


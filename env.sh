bash -c '
cat > .env << "EOF"
VITE_SUPABASE_URL=https://fsgflmlmpoodpvxavfvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzZ2ZsbWxtbXBvZHB2eGF2ZnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTAzMzQsImV4cCI6MjA3Njg2NjMzNH0.bqIrFc8lK6L5ym1DHtqCJT3wUuIK_m8P7Wt-9Wbda2o
EOF

echo ".env" >> .gitignore
'


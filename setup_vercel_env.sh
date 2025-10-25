#!/bin/bash

# Environment Setup Script for Vercel Deployment
# This script helps set up all necessary environment variables

set -e

echo "🔧 Setting up Environment Variables for Vercel..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Supabase Configuration
echo ""
print_status "Setting up Supabase environment variables..."
echo "Your Supabase project details:"
echo "URL: https://fsgflmlmpoodpvxavfvc.supabase.co"
echo "Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzZ2ZsbWxtcG9vZHB2eGF2ZnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTAzMzQsImV4cCI6MjA3Njg2NjMzNH0.bqIrFc8lK6L5ym1DHtqCJT3wUuIK_m8P7Wt-9Wbda2o"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Login to Vercel if needed
print_status "Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    print_warning "Please login to Vercel:"
    vercel login
fi

# Set environment variables
print_status "Setting Vercel environment variables..."

echo "Setting VITE_SUPABASE_URL..."
vercel env add VITE_SUPABASE_URL production <<< "https://fsgflmlmpoodpvxavfvc.supabase.co"

echo "Setting VITE_SUPABASE_ANON_KEY..."
vercel env add VITE_SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzZ2ZsbWxtcG9vZHB2eGF2ZnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTAzMzQsImV4cCI6MjA3Njg2NjMzNH0.bqIrFc8lK6L5ym1DHtqCJT3wUuIK_m8P7Wt-9Wbda2o"

# Also set for preview and development
vercel env add VITE_SUPABASE_URL preview <<< "https://fsgflmlmpoodpvxavfvc.supabase.co"
vercel env add VITE_SUPABASE_ANON_KEY preview <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzZ2ZsbWxtcG9vZHB2eGF2ZnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTAzMzQsImV4cCI6MjA3Njg2NjMzNH0.bqIrFc8lK6L5ym1DHtqCJT3wUuIK_m8P7Wt-9Wbda2o"

vercel env add VITE_SUPABASE_URL development <<< "https://fsgflmlmpoodpvxavfvc.supabase.co"
vercel env add VITE_SUPABASE_ANON_KEY development <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzZ2ZsbWxtcG9vZHB2eGF2ZnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTAzMzQsImV4cCI6MjA3Njg2NjMzNH0.bqIrFc8lK6L5ym1DHtqCJT3wUuIK_m8P7Wt-9Wbda2o"

print_success "Environment variables set successfully!"

# Create local .env file
print_status "Creating local .env file..."
cat > .env << EOF
# Supabase Configuration
VITE_SUPABASE_URL=https://fsgflmlmpoodpvxavfvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzZ2ZsbWxtcG9vZHB2eGF2ZnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTAzMzQsImV4cCI6MjA3Njg2NjMzNH0.bqIrFc8lK6L5ym1DHtqCJT3wUuIK_m8P7Wt-9Wbda2o

# Add your API keys here (these will be stored securely in Supabase)
# OPENAI_API_KEY=your_openai_key_here
# STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
# STRIPE_SECRET_KEY=your_stripe_secret_key_here
# RESEND_API_KEY=your_resend_key_here
# REDDIT_CLIENT_ID=your_reddit_client_id_here
# REDDIT_CLIENT_SECRET=your_reddit_client_secret_here
EOF

print_success "Local .env file created!"

echo ""
echo "=================================================="
print_success "Environment Setup Complete!"
echo ""
echo "📋 What was configured:"
echo "✅ Vercel environment variables (production, preview, development)"
echo "✅ Local .env file for development"
echo "✅ Supabase connection configured"
echo ""
echo "🔑 Next Steps - Add Your API Keys:"
echo "1. Get API keys from these platforms:"
echo "   • OpenAI: https://platform.openai.com/api-keys"
echo "   • Stripe: https://dashboard.stripe.com/apikeys"
echo "   • Resend: https://resend.com/api-keys"
echo "   • Reddit: https://www.reddit.com/prefs/apps"
echo ""
echo "2. Add them through the application UI after deployment"
echo "   (They'll be stored securely in Supabase)"
echo ""
echo "3. Deploy to Vercel:"
echo "   vercel --prod"
echo ""
print_success "Ready for deployment!"
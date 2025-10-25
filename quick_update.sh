#!/bin/bash

# Quick Update Script - For ongoing development
# Use this script for quick updates after making changes

set -e

echo "⚡ Quick Update to GitHub and Vercel..."
echo "=================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

# Get commit message from user or use default
if [ -z "$1" ]; then
    echo "Enter commit message (or press Enter for default):"
    read -r COMMIT_MSG
    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="🔄 Quick update - $(date '+%Y-%m-%d %H:%M')"
    fi
else
    COMMIT_MSG="$1"
fi

print_status "Commit message: $COMMIT_MSG"

# Quick git workflow
print_status "Adding changes..."
git add .

print_status "Committing..."
git commit -m "$COMMIT_MSG" || {
    print_warning "Nothing to commit. Checking if push is needed..."
}

print_status "Pushing to GitHub..."
git push

print_success "Update pushed to GitHub!"

# Check if Vercel CLI is available for manual deployment
if command -v vercel &> /dev/null; then
    echo ""
    echo "🚀 Deploy to Vercel now? (y/n)"
    read -r DEPLOY_NOW
    if [ "$DEPLOY_NOW" = "y" ] || [ "$DEPLOY_NOW" = "Y" ]; then
        print_status "Deploying to Vercel..."
        vercel --prod
        print_success "Deployed to Vercel!"
    else
        print_warning "Skipping Vercel deployment. It will auto-deploy from GitHub."
    fi
else
    print_warning "Vercel CLI not found. Deployment will happen automatically via GitHub integration."
fi

echo ""
print_success "Quick update complete!"
echo "📱 Check your Vercel dashboard for deployment status"
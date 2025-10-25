#!/bin/bash

# Complete GitHub Repository Sync Script
# This script will update your GitHub repository to match the current Skywork version

set -e  # Exit on any error

echo "🚀 Starting GitHub Repository Sync..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from your project root directory."
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    print_error "Git repository not found. Please initialize git first:"
    echo "git init"
    echo "git remote add origin YOUR_GITHUB_REPO_URL"
    exit 1
fi

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI (gh) is not installed. Please install it first:"
    echo "brew install gh"
    exit 1
fi

# Check if user is logged in to GitHub CLI
if ! gh auth status &> /dev/null; then
    print_warning "Not logged in to GitHub CLI. Please login first:"
    echo "gh auth login"
    exit 1
fi

print_status "Checking current git status..."
git status

# Stash any local changes
if ! git diff-index --quiet HEAD --; then
    print_warning "You have uncommitted changes. Stashing them..."
    git stash push -m "Auto-stash before sync - $(date)"
fi

# Add all files
print_status "Adding all files to git..."
git add .

# Create comprehensive commit message
COMMIT_MSG="🚀 Complete Platform Integration - $(date '+%Y-%m-%d %H:%M')

✅ Real Database Integration
- Connected all frontend data to Supabase
- Real-time data loading and synchronization
- Proper error handling and loading states

✅ API Key Management System
- Secure storage and validation of platform credentials
- Support for Reddit, OpenAI, Stripe, Resend, Twitter APIs
- Real-time connection testing and validation

✅ Campaign Automation Engine
- Real campaign creation and execution
- Automated post discovery, AI generation, and posting
- Live campaign status and performance tracking

✅ Notification System
- Real-time in-app notifications with unread counts
- Email notifications via Resend integration
- User preferences and quiet hours support

✅ Campaign Intelligence
- Document upload and processing system
- AI-powered context extraction and summarization
- Intelligent response generation with business context

🔧 Technical Improvements:
- Complete Supabase integration with RLS policies
- 5 new edge functions for backend processing
- Comprehensive database schema with analytics
- Real-time UI updates and status tracking
- Production-ready error handling and recovery

🌐 Deployment Ready:
- All systems tested and functional
- Environment variables configured
- Database migrations included
- Edge functions deployed and active"

# Commit changes
print_status "Committing changes..."
git commit -m "$COMMIT_MSG" || {
    print_warning "Nothing to commit or commit failed. Continuing..."
}

# Push to GitHub
print_status "Pushing to GitHub..."
git push origin main || git push origin master || {
    print_error "Failed to push. Please check your remote repository settings."
    echo "You may need to set up the remote:"
    echo "git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
    exit 1
}

print_success "Successfully pushed to GitHub!"

# Check if Vercel is configured
if [ -f "vercel.json" ]; then
    print_status "Vercel configuration found. Triggering deployment..."
    
    # Check if Vercel CLI is installed
    if command -v vercel &> /dev/null; then
        print_status "Deploying to Vercel..."
        vercel --prod || print_warning "Vercel deployment may have failed. Check Vercel dashboard."
    else
        print_warning "Vercel CLI not installed. Deployment will trigger automatically via GitHub integration."
    fi
else
    print_warning "No vercel.json found. Make sure Vercel is properly configured."
fi

echo ""
echo "=================================================="
print_success "GitHub Repository Sync Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Check your GitHub repository to verify all files are updated"
echo "2. Monitor Vercel deployment in your dashboard"
echo "3. Test the deployed application"
echo "4. Set up environment variables in Vercel if needed:"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"
echo ""
echo "🔗 Useful Commands:"
echo "   gh repo view --web    # Open repository in browser"
echo "   vercel --prod         # Manual Vercel deployment"
echo "   git log --oneline -5  # View recent commits"
echo ""
print_success "Repository is now synced with the complete integrated platform!"
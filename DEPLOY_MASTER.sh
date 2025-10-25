#!/bin/bash

# Master Deployment Script
# Run this on your Mac to sync everything to GitHub and deploy to Vercel

echo "🚀 COMPLETE PLATFORM DEPLOYMENT"
echo "=================================================="
echo "This will sync your repository with the complete integrated platform"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this from your project root directory."
    exit 1
fi

# Check for required tools
MISSING_TOOLS=()

if ! command -v git &> /dev/null; then
    MISSING_TOOLS+=("git")
fi

if ! command -v gh &> /dev/null; then
    MISSING_TOOLS+=("GitHub CLI (gh)")
fi

if ! command -v node &> /dev/null; then
    MISSING_TOOLS+=("Node.js")
fi

if ! command -v npm &> /dev/null; then
    MISSING_TOOLS+=("npm")
fi

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
    print_error "Missing required tools:"
    for tool in "${MISSING_TOOLS[@]}"; do
        echo "  - $tool"
    done
    echo ""
    echo "Please install missing tools:"
    echo "  brew install git gh node npm"
    exit 1
fi

print_success "All prerequisites found!"

# Show current status
echo ""
print_status "Current project status:"
echo "📁 Project: $(basename $(pwd))"
echo "🌐 Skywork Site: https://rdgmbc35xr.skywork.website"
echo "📊 Features: Real DB, API Keys, Automation, Notifications"

# Confirm deployment
echo ""
echo "🚨 IMPORTANT: This will:"
echo "  ✅ Sync all files to your GitHub repository"
echo "  ✅ Set up Vercel environment variables"
echo "  ✅ Deploy to Vercel production"
echo "  ✅ Create deployment scripts for future updates"
echo ""
read -p "Continue with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled."
    exit 0
fi

# Step 1: Deploy to GitHub
echo ""
echo "📤 STEP 1: Deploying to GitHub..."
echo "=================================================="
./deploy_to_github.sh

if [ $? -ne 0 ]; then
    print_error "GitHub deployment failed!"
    exit 1
fi

# Step 2: Setup Vercel Environment
echo ""
echo "🔧 STEP 2: Setting up Vercel Environment..."
echo "=================================================="
./setup_vercel_env.sh

if [ $? -ne 0 ]; then
    print_error "Vercel environment setup failed!"
    exit 1
fi

# Step 3: Final deployment check
echo ""
echo "🎯 STEP 3: Final Deployment Check..."
echo "=================================================="

print_status "Checking GitHub repository..."
if gh repo view &> /dev/null; then
    print_success "GitHub repository accessible"
    echo "🔗 Repository: $(gh repo view --json url -q .url)"
else
    print_warning "Could not access GitHub repository"
fi

print_status "Checking Vercel deployment..."
if command -v vercel &> /dev/null; then
    if vercel ls &> /dev/null; then
        print_success "Vercel deployment accessible"
        echo "🚀 Vercel: $(vercel ls --limit 1 2>/dev/null | tail -n 1 | awk '{print $2}' || echo 'Check Vercel dashboard')"
    else
        print_warning "Could not check Vercel deployment"
    fi
else
    print_warning "Vercel CLI not available for status check"
fi

# Success summary
echo ""
echo "=================================================="
print_success "🎉 DEPLOYMENT COMPLETE!"
echo "=================================================="
echo ""
echo "✅ What was deployed:"
echo "   📊 Complete integrated platform with:"
echo "   🗄️  Real database integration (Supabase)"
echo "   🔑 API key management system"
echo "   🤖 Campaign automation engine"
echo "   📧 Notification system with email alerts"
echo "   🧠 Campaign intelligence with document processing"
echo ""
echo "🔗 Your deployments:"
echo "   🌐 Skywork Site: https://rdgmbc35xr.skywork.website"
echo "   ⚡ Vercel Site: Check your Vercel dashboard"
echo "   📱 GitHub Repo: $(gh repo view --json url -q .url 2>/dev/null || echo 'Your GitHub repository')"
echo ""
echo "🛠️  Development workflow:"
echo "   📝 Quick updates: ./quick_update.sh"
echo "   🔄 Development sync: ./dev_sync.sh"
echo "   📖 Full guide: See DEPLOYMENT_GUIDE.md"
echo ""
echo "🔑 Next steps:"
echo "   1. Test your Vercel deployment"
echo "   2. Add API keys through the UI"
echo "   3. Create your first campaign"
echo "   4. Upload business documents"
echo "   5. Start automating!"
echo ""
print_success "Platform is ready for production use! 🚀"
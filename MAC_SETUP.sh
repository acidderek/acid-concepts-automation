#!/bin/bash

# Mac Setup and Deployment Script
# Run this first on your Mac to set up everything

echo "🍎 MAC SETUP FOR CAMPAIGN INTELLIGENCE PLATFORM"
echo "=================================================="

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

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    print_warning "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    print_success "Homebrew found"
fi

# Install required tools
print_status "Installing required tools..."

# Git
if ! command -v git &> /dev/null; then
    print_status "Installing Git..."
    brew install git
else
    print_success "Git already installed"
fi

# GitHub CLI
if ! command -v gh &> /dev/null; then
    print_status "Installing GitHub CLI..."
    brew install gh
else
    print_success "GitHub CLI already installed"
fi

# Node.js
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js..."
    brew install node
else
    print_success "Node.js already installed ($(node --version))"
fi

# Vercel CLI
if ! command -v vercel &> /dev/null; then
    print_status "Installing Vercel CLI..."
    npm install -g vercel
else
    print_success "Vercel CLI already installed"
fi

print_success "All tools installed!"

# Setup GitHub authentication
echo ""
print_status "Setting up GitHub authentication..."
if ! gh auth status &> /dev/null; then
    print_warning "Please authenticate with GitHub:"
    gh auth login
else
    print_success "Already authenticated with GitHub"
fi

# Setup Vercel authentication
echo ""
print_status "Setting up Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    print_warning "Please authenticate with Vercel:"
    vercel login
else
    print_success "Already authenticated with Vercel ($(vercel whoami))"
fi

# Check if we're in a git repository
echo ""
print_status "Checking Git repository..."
if [ ! -d ".git" ]; then
    print_warning "Not in a Git repository. Initializing..."
    git init
    
    echo "Please enter your GitHub repository URL (e.g., https://github.com/username/repo.git):"
    read -r REPO_URL
    
    if [ ! -z "$REPO_URL" ]; then
        git remote add origin "$REPO_URL"
        print_success "Git repository initialized with remote: $REPO_URL"
    else
        print_warning "No repository URL provided. You'll need to set this up manually:"
        echo "git remote add origin YOUR_GITHUB_REPO_URL"
    fi
else
    print_success "Git repository found"
    echo "Remote: $(git remote get-url origin 2>/dev/null || echo 'No remote set')"
fi

# Install project dependencies
echo ""
print_status "Installing project dependencies..."
if [ -f "package.json" ]; then
    npm install
    print_success "Dependencies installed"
else
    print_warning "No package.json found. Make sure you're in the project directory."
fi

# Make scripts executable
print_status "Making deployment scripts executable..."
chmod +x *.sh
print_success "Scripts are now executable"

# Final setup summary
echo ""
echo "=================================================="
print_success "🎉 MAC SETUP COMPLETE!"
echo "=================================================="
echo ""
echo "✅ Installed tools:"
echo "   🍺 Homebrew"
echo "   📱 Git"
echo "   🐙 GitHub CLI"
echo "   🟢 Node.js ($(node --version 2>/dev/null || echo 'Not found'))"
echo "   ⚡ Vercel CLI"
echo ""
echo "✅ Authentication:"
echo "   🐙 GitHub: $(gh auth status --hostname github.com 2>/dev/null | grep 'Logged in' || echo 'Please run: gh auth login')"
echo "   ⚡ Vercel: $(vercel whoami 2>/dev/null || echo 'Please run: vercel login')"
echo ""
echo "🚀 Ready to deploy! Run:"
echo "   ./DEPLOY_MASTER.sh"
echo ""
echo "📖 For ongoing development:"
echo "   ./quick_update.sh     # Quick updates"
echo "   ./dev_sync.sh         # Development sync"
echo "   See DEPLOYMENT_GUIDE.md for full documentation"
echo ""
print_success "Your Mac is ready for Campaign Intelligence Platform development! 🚀"
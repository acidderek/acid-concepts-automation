#!/bin/bash

# Development Sync Script
# Keeps both Skywork site and Vercel deployment in sync during development

set -e

echo "🔄 Development Sync - Skywork ↔ Vercel"
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

# Function to check if we're in the right directory
check_directory() {
    if [ ! -f "package.json" ]; then
        print_error "Not in project directory. Please run from project root."
        exit 1
    fi
}

# Function to sync to GitHub
sync_to_github() {
    print_status "Syncing to GitHub..."
    
    # Add all changes
    git add .
    
    # Create commit with timestamp
    local commit_msg="🔄 Dev sync - $(date '+%Y-%m-%d %H:%M:%S')"
    if [ ! -z "$1" ]; then
        commit_msg="$1"
    fi
    
    git commit -m "$commit_msg" || print_warning "Nothing new to commit"
    git push origin main || git push origin master
    
    print_success "Synced to GitHub"
}

# Function to deploy to Vercel
deploy_to_vercel() {
    print_status "Deploying to Vercel..."
    
    if command -v vercel &> /dev/null; then
        vercel --prod
        print_success "Deployed to Vercel"
    else
        print_warning "Vercel CLI not found. Using GitHub auto-deployment"
    fi
}

# Function to check deployment status
check_deployment() {
    print_status "Checking deployment status..."
    
    if command -v vercel &> /dev/null; then
        echo ""
        echo "Recent deployments:"
        vercel ls --limit 3
    fi
}

# Main execution
main() {
    check_directory
    
    echo "What would you like to do?"
    echo "1) Full sync (GitHub + Vercel)"
    echo "2) GitHub only"
    echo "3) Vercel only"
    echo "4) Check status"
    echo "5) Quick commit with message"
    
    read -p "Choose option (1-5): " choice
    
    case $choice in
        1)
            print_status "Starting full sync..."
            sync_to_github
            deploy_to_vercel
            check_deployment
            ;;
        2)
            sync_to_github
            ;;
        3)
            deploy_to_vercel
            ;;
        4)
            check_deployment
            git status
            ;;
        5)
            echo "Enter commit message:"
            read -r commit_msg
            sync_to_github "$commit_msg"
            ;;
        *)
            print_error "Invalid option"
            exit 1
            ;;
    esac
    
    echo ""
    print_success "Development sync complete!"
    echo ""
    echo "🔗 Quick Links:"
    echo "   GitHub: gh repo view --web"
    echo "   Vercel: vercel --prod"
    echo "   Status: git status"
}

# Run main function
main
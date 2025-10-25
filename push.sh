# Pull the remote changes first
git pull origin main

# If there are conflicts, resolve them, then:
git add .
git commit -m "Resolve merge conflicts and update dependencies"
git push

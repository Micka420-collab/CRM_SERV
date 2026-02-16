@echo off
echo Pushing to GitHub...
git add .
git commit -m "Update"
git push origin main --force
echo Done!
pause

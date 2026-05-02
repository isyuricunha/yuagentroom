# Pre-commit hook to run lint and lint:fix
# This hook runs before each commit
# PowerShell version for Windows

Write-Host "Running pre-commit lint checks..."

# Run lint check using pnpm (from root workspace)
Write-Host "Running pnpm lint..."
pnpm lint
$LINT_EXIT_CODE = $LASTEXITCODE

# If lint failed, try to fix automatically
if ($LINT_EXIT_CODE -ne 0) {
    Write-Host "Lint found issues, attempting to fix..."
    pnpm lint --fix
    
    $FIX_EXIT_CODE = $LASTEXITCODE
    
    if ($FIX_EXIT_CODE -ne 0) {
        Write-Host "Lint fix failed. Please fix the issues manually before committing."
        exit 1
    } else {
        Write-Host "Lint issues auto-fixed. Please review the changes and commit again."
        exit 1
    }
}

Write-Host "Lint passed!"
exit 0
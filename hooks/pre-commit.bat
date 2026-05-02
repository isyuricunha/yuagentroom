@echo off
REM Pre-commit hook to run lint and lint:fix
REM This hook runs before each commit
REM Windows batch version

echo Running pre-commit lint checks...

REM Run lint check using pnpm (from root workspace)
echo Running pnpm lint...
call pnpm lint
if errorlevel 1 (
    REM Lint failed, try to fix automatically
    echo Lint found issues, attempting to fix...
    call pnpm lint --fix
    if errorlevel 1 (
        echo Lint fix failed. Please fix the issues manually before committing.
        exit /b 1
    ) else (
        echo Lint issues auto-fixed. Please review the changes and commit again.
        exit /b 1
    )
)

echo Lint passed!
exit /b 0
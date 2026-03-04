@echo off
chcp 65001 >nul
echo.
echo ======================================
echo     Test Runner Script
echo ======================================
echo.

if "%~1"=="" (
    echo Usage: run_tests.bat [option]
    echo.
    echo Options:
    echo   all                Run all tests
    echo   backend            Run backend tests only
    echo   frontend           Run frontend tests only
    echo   unit               Run unit tests only
    echo   e2e                Run E2E tests only
    echo   security           Run security tests only
    echo   performance        Run performance tests only
    echo   coverage           Generate coverage report
    echo   verbose            Verbose output
    echo.
    echo Examples:
    echo   run_tests.bat all
    echo   run_tests.bat backend
    echo   run_tests.bat unit
    echo   run_tests.bat coverage
    echo.
    pause
    exit /b 1
)

set "OPTION=%~1"
set "EXTRA_ARGS="

if /i "%OPTION%"=="all" (
    python run_tests.py
) else if /i "%OPTION%"=="backend" (
    python run_tests.py --backend-only
) else if /i "%OPTION%"=="frontend" (
    python run_tests.py --frontend-only
) else if /i "%OPTION%"=="unit" (
    python run_tests.py --unit-only
) else if /i "%OPTION%"=="e2e" (
    python run_tests.py --e2e-only
) else if /i "%OPTION%"=="security" (
    python run_tests.py --security-only
) else if /i "%OPTION%"=="performance" (
    python run_tests.py --performance-only
) else if /i "%OPTION%"=="coverage" (
    python run_tests.py --coverage
) else if /i "%OPTION%"=="verbose" (
    python run_tests.py --verbose
) else (
    echo Unknown option: %OPTION%
    echo Use 'run_tests.bat' for help
    pause
    exit /b 1
)

echo.
if %ERRORLEVEL%==0 (
    echo [OK] Tests passed!
) else (
    echo [FAIL] Tests failed!
)
echo.

pause

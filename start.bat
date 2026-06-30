@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0"

title API Events - Local Launcher

set "COMMAND=%~1"
if not "%COMMAND%"=="" (
    if /I "%COMMAND%"=="start" goto cmd_start
    if /I "%COMMAND%"=="stop" goto cmd_stop
    if /I "%COMMAND%"=="restart" goto cmd_restart
    if /I "%COMMAND%"=="help" goto cmd_help

    echo Commande inconnue : %COMMAND%
    echo.
    goto cmd_help
)

:menu
cls
echo ================================
echo  API Events - Local Launcher
echo ================================
echo.
echo URLs utiles :
echo   Frontend   : http://localhost:3000
echo   Health     : http://localhost:3000/health
echo   Events API : http://localhost:3000/events
echo   PostgreSQL : localhost:5432
echo.
echo 1. Démarrer l’environnement local
echo 2. Arrêter l’environnement local
echo 3. Redémarrer l’environnement local
echo 4. Ouvrir l’application dans le navigateur
echo 5. Afficher l’aide
echo 6. Quitter
echo.
choice /C 123456 /N /M "Choix (1-6) : "
if errorlevel 6 goto quit
if errorlevel 5 goto help_menu
if errorlevel 4 goto open_app
if errorlevel 3 goto restart_menu
if errorlevel 2 goto stop_menu
if errorlevel 1 goto start_menu

:start_menu
call :start_env
pause
goto menu

:stop_menu
call :stop_env
pause
goto menu

:restart_menu
call :stop_env
call :start_env
pause
goto menu

:open_app
start http://localhost:3000
goto menu

:help_menu
call :print_help
pause
goto menu

:quit
echo Le menu est fermé. Les services peuvent continuer à tourner.
endlocal
exit /b 0

:cmd_start
call :start_env
goto end

:cmd_stop
call :stop_env
goto end

:cmd_restart
call :stop_env
call :start_env
goto end

:cmd_help
call :print_help
goto end

:start_env
echo ================================
echo  API Events - Démarrage local
echo ================================
echo.
echo URLs utiles :
echo   Frontend   : http://localhost:3000
echo   Health     : http://localhost:3000/health
echo   Events API : http://localhost:3000/events
echo   PostgreSQL : localhost:5432
echo.

set "NODE_ENV=development"
set "API_PASSWORD=local-password"
set "DATABASE_URL=postgresql://test:test@localhost:5432/test"

if not exist node_modules (
    echo Installation des dépendances...
    npm ci
    if errorlevel 1 exit /b 1
)

echo Démarrage de PostgreSQL local...
docker compose up -d postgres
if errorlevel 1 exit /b 1

echo.
echo État des services Docker :
docker compose ps

echo.
tasklist /FI "WINDOWTITLE eq API Events - Node Server*" /V | find /I "API Events - Node Server" >nul
if not errorlevel 1 (
    echo Une fenêtre "API Events - Node Server" semble déjà ouverte.
    echo Fermez l’ancienne fenêtre avant de relancer le serveur Node.
    exit /b 0
)

echo Lancement de l’application Node dans une fenêtre séparée...
start "API Events - Node Server" cmd /k "set NODE_ENV=development&& set API_PASSWORD=local-password&& set DATABASE_URL=postgresql://test:test@localhost:5432/test&& node server.js"
exit /b 0

:stop_env
echo ================================
echo  API Events - Arrêt local
echo ================================
echo.
taskkill /FI "WINDOWTITLE eq API Events - Node Server*" /T /F >nul 2>nul
if errorlevel 1 (
    echo Aucun serveur Node local à arrêter ou déjà arrêté.
) else (
    echo Serveur Node local arrêté.
)

echo.
echo Arrêt de PostgreSQL local...
docker compose down
if errorlevel 1 exit /b 1

echo Services locaux arrêtés.
exit /b 0

:print_help
echo ================================
echo  API Events - Aide locale
echo ================================
echo.
echo Double-cliquez sur start.bat pour ouvrir le menu local.
echo.
echo Commandes directes :
echo   start.bat start    Démarre PostgreSQL local puis Node
echo   start.bat stop     Arrête Node puis PostgreSQL local
echo   start.bat restart  Redémarre l’environnement local
echo   start.bat help     Affiche cette aide
echo.
echo URLs :
echo   Frontend   : http://localhost:3000
echo   Health     : http://localhost:3000/health
echo   Events API : http://localhost:3000/events
echo   PostgreSQL : localhost:5432
echo.
exit /b 0

:end
endlocal

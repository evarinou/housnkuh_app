@echo off
echo Setting up port forwarding for WSL...

REM Get the WSL IP address - needs to be adapted for your WSL setup
wsl -d Ubuntu -e bash -c "hostname -I | cut -d' ' -f1" > wsl_ip.txt
set /p WSL_IP=<wsl_ip.txt
del wsl_ip.txt

echo WSL IP detected as: %WSL_IP%

REM Remove any existing port forwarding
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0
netsh interface portproxy delete v4tov4 listenport=4000 listenaddress=0.0.0.0

REM Set up port forwarding
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=%WSL_IP%
netsh interface portproxy add v4tov4 listenport=4000 listenaddress=0.0.0.0 connectport=4000 connectaddress=%WSL_IP%

REM Add firewall rules (if they don't exist)
netsh advfirewall firewall show rule name="WSL-Client" >nul 2>&1
if %errorlevel% neq 0 (
    netsh advfirewall firewall add rule name="WSL-Client" dir=in action=allow protocol=TCP localport=3000
)

netsh advfirewall firewall show rule name="WSL-Server" >nul 2>&1
if %errorlevel% neq 0 (
    netsh advfirewall firewall add rule name="WSL-Server" dir=in action=allow protocol=TCP localport=4000
)

REM Show status
netsh interface portproxy show v4tov4

echo Port forwarding setup complete!
echo You can now access:
echo - Client: http://localhost:3000
echo - Server API: http://localhost:4000
pause
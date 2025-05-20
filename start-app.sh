#!/bin/bash

# Setting up hosts for both services
export REACT_APP_HOST=0.0.0.0
export SERVER_HOST=0.0.0.0
export CLIENT_HOST=0.0.0.0
export NODE_OPTIONS=--dns-result-order=ipv4first

# Start the server with explicit binding to all interfaces
echo "Starting server on all interfaces..."
cd /home/evms/housnkuh_app/server
NODE_ENV=development HOST=$SERVER_HOST npm run dev &
SERVER_PID=$!

# Wait a bit for server to start
sleep 2

# Start the client with explicit binding to all interfaces  
echo "Starting client on all interfaces..."
cd /home/evms/housnkuh_app/client
DANGEROUSLY_DISABLE_HOST_CHECK=true HOST=$CLIENT_HOST npm start &
CLIENT_PID=$!

echo "Server running at: http://$SERVER_HOST:4000"
echo "Client running at: http://$CLIENT_HOST:3000"
echo "WSL IP Address for external access: $(hostname -I | awk '{print $1}')"
echo "You can access the app from Windows at: http://localhost:3000"
echo "Use Ctrl+C to stop both services"

# Handle shutdown
trap "kill $SERVER_PID $CLIENT_PID; exit" INT TERM
wait
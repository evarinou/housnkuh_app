#!/bin/bash

# Start server in production mode
echo "Building and starting server in production mode..."
cd /home/evms/housnkuh_app/server
npm run build
npm start &
SERVER_PID=$!

# Wait a bit for server to start
sleep 2

# Start client in production mode
echo "Building and serving client in production mode..."
cd /home/evms/housnkuh_app/client
npm run build

# Use serve or similar to serve the static build
if ! command -v serve &> /dev/null; then
    npm install -g serve
fi

serve -s build &
CLIENT_PID=$!

echo "Server running at: http://localhost:4000"
echo "Client running at: http://localhost:3000 (or custom port from serve)"
echo "WSL IP Address for external access: $(hostname -I | awk '{print $1}')"
echo "Use Ctrl+C to stop both services"

# Handle shutdown
trap "kill $SERVER_PID $CLIENT_PID; exit" INT TERM
wait
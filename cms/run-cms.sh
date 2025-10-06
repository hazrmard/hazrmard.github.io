#!/bin/bash
echo "Starting Hugo CMS server on http://localhost:8008"
echo "Press Ctrl+C to stop the server."

# Get the directory of the script to ensure correct relative paths
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# Run the server from the script's directory
cd "$SCRIPT_DIR"
uvicorn app.main:app --host 0.0.0.0 --port 8008

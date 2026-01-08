#!/usr/bin/env bash
# exit on error
set -o errexit

# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Create engines directory if it doesn't exist
mkdir -p backend/engines

# 3. Download Stockfish for Linux (x86-64)
STOCKFISH_URL="https://github.com/official-stockfish/Stockfish/releases/latest/download/stockfish-ubuntu-x86-64-avx2.tar"

echo "--- Downloading Stockfish for Linux ---"
curl -L $STOCKFISH_URL -o stockfish.tar

# 4. Extract and move to the correct directory
tar -xvf stockfish.tar
# Find the executable in the extracted folder and move it to backend/engines/stockfish
find . -name "stockfish-ubuntu-x86-64-avx2" -exec mv {} backend/engines/stockfish \;

# 5. Set executable permissions
chmod +x backend/engines/stockfish

# 6. Cleanup
rm stockfish.tar
echo "--- Stockfish installation complete ---"

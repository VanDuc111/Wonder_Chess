#!/usr/bin/env bash
# exit on error
set -o errexit

echo "=========================================="
echo "  Render Build Script - Wonder Chess"
echo "=========================================="

# 1. Install Python dependencies
echo ""
echo "--- Installing Python dependencies ---"
pip install -r requirements.txt

# 2. Compile SASS styles
echo ""
echo "--- Compiling SASS styles ---"
npx -y sass frontend/static/scss/style.scss frontend/static/css/style.css

# 2. Initialize Database (Optional)
if [[ -n "$DATABASE_URL" || -n "$DB_NAME" ]]; then
    echo ""
    echo "--- Initializing Database ---"
    python << END
from backend import create_app, db
import os
app = create_app()
with app.app_context():
    if 'sqlalchemy' in app.extensions:
        db.create_all()
        print("✅ Database tables created successfully!")
    else:
        print("--- Skipping DB tables creation: App initialized in Standalone mode ---")
END
else
    echo "--- Skipping Database init (No DB variables found) ---"
fi

# 3. Create engines directory if it doesn't exist
echo ""
echo "--- Setting up Stockfish engine ---"
mkdir -p backend/engines

# 4. Download Stockfish for Linux (x86-64)
STOCKFISH_URL="https://github.com/official-stockfish/Stockfish/releases/latest/download/stockfish-ubuntu-x86-64-avx2.tar"

echo "Downloading Stockfish for Linux..."
curl -L $STOCKFISH_URL -o stockfish.tar

# 5. Extract and move to the correct directory
tar -xvf stockfish.tar
# Find the executable in the extracted folder and move it to backend/engines/stockfish
find . -name "stockfish-ubuntu-x86-64-avx2" -exec mv {} backend/engines/stockfish \;

# 6. Set executable permissions
chmod +x backend/engines/stockfish

# 7. Cleanup
rm stockfish.tar

echo ""
echo "=========================================="
echo "  ✅ Build Complete!"
echo "=========================================="
echo "📦 Dependencies installed"
echo "🗄️  Database tables created"
echo "♟️  Stockfish engine ready"
echo "=========================================="

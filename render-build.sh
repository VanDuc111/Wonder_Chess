#!/usr/bin/env bash
# exit on error
set -o errexit

# 1. Cài đặt các thư viện Python
pip install -r requirements.txt

# 2. Tạo thư mục chứa engine nếu chưa có
mkdir -p backend/engines

# 3. Tải Stockfish phiên bản Linux (x86-64)
# Chúng ta sẽ tải bản binary đã build sẵn cho Linux
STOCKFISH_URL="https://github.com/official-stockfish/Stockfish/releases/latest/download/stockfish-ubuntu-x86-64-avx2.tar"

echo "--- Đang tải Stockfish cho Linux (Render) ---"
curl -L $STOCKFISH_URL -o stockfish.tar

# 4. Giải nén và di chuyển vào đúng thư mục
tar -xvf stockfish.tar
# Tìm file thực thi trong thư mục vừa giải nén và chuyển nó vào backend/engines/stockfish
find . -name "stockfish-ubuntu-x86-64-avx2" -exec mv {} backend/engines/stockfish \;

# 5. Cấp quyền thực thi cho file
chmod +x backend/engines/stockfish

# 6. Dọn dẹp
rm stockfish.tar
echo "--- Cài đặt Stockfish hoàn tất ---"

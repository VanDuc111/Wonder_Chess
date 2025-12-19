// File: frontend/static/js/opening_data.js
// Dữ liệu khai cuộc dùng chung cho toàn ứng dụng

const OPENINGS_DATA = [
    {
        name: "Sicilian Defense",
        eco: "B20",
        moves: "1. e4 c5",
        fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        category: "e4",
        description: "Khai cuộc phổ biến nhất và hiếu chiến nhất chống lại 1.e4."
    },
    {
        name: "Ruy Lopez (Spanish Game)",
        eco: "C60",
        moves: "1. e4 e5 2. Nf3 Nc6 3. Bb5",
        fen: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
        category: "e4",
        description: "Một trong những khai cuộc cổ điển và phức tạp nhất."
    },
    {
        name: "Queen's Gambit",
        eco: "D06",
        moves: "1. d4 d5 2. c4",
        fen: "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2",
        category: "d4",
        description: "Chiến lược kiểm soát trung tâm bằng cách thí tốt cánh Hậu."
    },
    {
        name: "Caro-Kann Defense",
        eco: "B10",
        moves: "1. e4 c6",
        fen: "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        category: "e4",
        description: "Lối chơi vững chắc, phòng thủ chặt chẽ cho Đen."
    },
    {
        name: "French Defense",
        eco: "C00",
        moves: "1. e4 e6",
        fen: "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        category: "e4",
        description: "Phòng thủ phản công sắc bén nhưng không gian chật hẹp."
    },
    {
        name: "King's Indian Defense",
        eco: "E60",
        moves: "1. d4 Nf6 2. c4 g6",
        fen: "rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3",
        category: "d4",
        description: "Lựa chọn năng động cho Đen chống lại d4."
    },
    {
        name: "English Opening",
        eco: "A10",
        moves: "1. c4",
        fen: "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq - 0 1",
        category: "flank",
        description: "Khai cuộc linh hoạt, chuyển đổi thành nhiều biến thể khác."
    },
    {
        name: "King's Gambit",
        eco: "C30",
        moves: "1. e4 e5 2. f4",
        fen: "rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq - 0 2",
        category: "gambit",
        description: "Khai cuộc lãng mạn và rủi ro cao từ thế kỷ 19."
    },
    {
        name: "Italian Game",
        eco: "C50",
        moves: "1. e4 e5 2. Nf3 Nc6 3. Bc4",
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
        category: "e4",
        description: "Khai cuộc cổ điển nhằm kiểm soát trung tâm và tấn công f7."
    },
    {
        name: "Scandinavian Defense",
        eco: "B01",
        moves: "1. e4 d5",
        fen: "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        category: "e4",
        description: "Thách thức trung tâm ngay lập tức, dẫn đến thế trận mở."
    },
    {
        name: "King's Pawn Game",
        eco: "C20",
        moves: "1. e4",
        fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        category: "e4",
        description: "Nước đi phổ biến nhất, mở đường cho Hậu và Tượng."
    },
    {
        name: "Queen's Pawn Game",
        eco: "D00",
        moves: "1. d4",
        fen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        category: "d4",
        description: "Nước đi vững chắc, kiểm soát trung tâm và chuẩn bị cho d4-d5."
    },
    {
        name: "Nimzowitsch Defense",
        eco: "B00",
        moves: "1. e4 Nc6",
        fen: "rnbqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2",
        category: "e4",
        description: "Phòng thủ độc đáo nhằm gây sức ép lên trung tâm bằng quân nhẹ."
    },
    {
        name: "Modern Defense",
        eco: "B06",
        moves: "1. e4 g6",
        fen: "rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        category: "e4",
        description: "Chiến thuật nhường trung tâm để phản công từ cánh."
    },
    {
        name: "Open Game (King's Pawn)",
        eco: "C20",
        moves: "1. e4 e5",
        fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        category: "e4",
        description: "Đối xứng cổ điển, dẫn đến nhiều khai cuộc nổi tiếng."
    }
];

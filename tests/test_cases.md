TC_FEN_01 (standard opening):

Input: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1

Expect: Initial chessboard. Score +0.25 (Book).

TC_FEN_02 (Mate in 1):

Input: r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4
(Scholar's Mate)

Expect: Score +M1. White moves Qxf7#. Score 1-0. Alice inform "Checkmate".

TC_FEN_03 (Promotion):

Input: 8/P7/8/8/8/8/k7/7K w - - 0 1

Expect: High score for White. White promotes a8=Q+. Alice suggests promoting to Queen.

TC_FEN_04 (Draw - Stalemate):

Input: 7k/5Q2/8/8/8/8/8/7K b - - 0 1

(Black moves, but there is no legal move and the King is not in check.)

Expect: API returns Game Over, result: Draw.
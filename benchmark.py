import time
import chess
from backend.engine import minimax

def benchmark_engine(fen, depth):
    print("--- Testing Engine Performance ---")
    print(f"Depth:", depth)
    board = chess.Board(fen)
    start = time.time()

    result = minimax.find_best_move(fen, depth)
    end = time.time()
    duration = end - start

    print(f"Result: {result['best_move']}")
    print(f"Time Running: {duration:.4f} seconds")
    print("-" *30)
    return duration

if __name__ == "__main__":
    test_fen = "1r3rk1/p3nppp/2p1p3/2qpP3/5Pb1/2NQ1N2/PPP3PP/2KR3R w - - 2 14"

    benchmark_engine(test_fen, 3)

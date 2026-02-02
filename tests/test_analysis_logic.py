from backend.services.analysis_manager import ChessAnalysisManager

def test_analysis_logic():
    manager = ChessAnalysisManager()
    
    print("--- 1. Testing Score Parsing ---")
    scores = ["+0.50", "-1.20", "+M2", "-M1", "Mạnh (+0.30)", "Invalid"]
    for s in scores:
        print(f"Input: {s:15} | Parsed: {manager.parse_score(s)}")

    print("\n--- 2. Testing Evaluation Diff Calculation ---")
    # Case: White blunders a piece (starts with +4.0 advantage, drops to +0.5)
    # FEN after black move, so turn is WHITE. But we look at what WHITE just did.
    # Actually, if we send the FEN AFTER the move:
    # E.g. White moves, FEN is now Black's turn.
    fen_black_turn = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 1 1"
    diff, last_p, curr_t = manager.calculate_evaluation_diff(fen_black_turn, "+0.50", "+4.00")
    print(f"Blunder check: Diff={diff}, Last={last_p}, Turn={curr_t}")
    print(f"Quality: {manager.get_move_quality_label(diff)}")

    # Case: Mate detected
    diff_mate, _, _ = manager.calculate_evaluation_diff(fen_black_turn, "+M1", "0.50")
    print(f"Mate check: Diff={diff_mate}, Quality: {manager.get_move_quality_label(diff_mate)}")

if __name__ == "__main__":
    test_analysis_logic()

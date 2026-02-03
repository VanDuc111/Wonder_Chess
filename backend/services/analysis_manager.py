"""
Chess Analysis Manager Service
Handles chess move analysis, evaluation, and context preparation for AI.
Separates calculation logic from HTTP layer for better testability.
"""

import re
import chess
from typing import Dict, Any, Tuple
from backend.config import AnalysisConfig


class ChessAnalysisManager:
    """
    Service responsible for analyzing chess data and preparing context for AI.
    Provides move quality evaluation, score parsing, and data formatting.
    """

    @staticmethod
    def parse_score(score_str: Any) -> float:
        """
        Convert engine score string to float for calculations.
        
        Args:
            score_str: Score from engine (e.g., "+1.50", "-0.80", "+M2", "-M5", "0.00")
            
        Returns:
            float: Parsed score value. Mate positions return ±100.0
            
        Examples:
            >>> parse_score("+1.50")
            1.5
            >>> parse_score("-M5")
            -100.0
            >>> parse_score("M2")
            100.0
        """
        s = str(score_str).strip()
        if not s:
            return 0.0
            
        # Check for mate notation (+M1, -M5, M2...)
        mate_match = re.search(r'([+-])?M\d+', s, re.IGNORECASE)
        if mate_match:
            return (-AnalysisConfig.MATE_SCORE_ABSOLUTE 
                    if mate_match.group(1) == '-' 
                    else AnalysisConfig.MATE_SCORE_ABSOLUTE)
        
        # Extract numeric value for regular scores
        num_match = re.search(r'[+-]?\d+\.?\d*', s)
        try:
            return float(num_match.group()) if num_match else 0.0
        except (ValueError, AttributeError):
            return 0.0

    def calculate_evaluation_diff(
        self, 
        current_fen: str, 
        current_score: Any, 
        prev_score: Any
    ) -> Tuple[float, str, str]:
        """
        Calculate evaluation difference based on whose turn it is.
        
        Args:
            current_fen: Current board position in FEN notation
            current_score: Current evaluation score
            prev_score: Previous evaluation score
            
        Returns:
            Tuple of (diff_value, last_player_name, current_turn_name)
            
        Notes:
            - If White just moved: diff = current - previous (positive is good for White)
            - If Black just moved: diff = previous - current (decrease is good for Black)
        """
        cur_v = self.parse_score(current_score)
        prev_v = self.parse_score(prev_score)
        
        try:
            board = chess.Board(current_fen)
            # Player who just moved has opposite color of current turn
            was_white_move = (board.turn == chess.BLACK)
            
            # Calculate diff from perspective of player who just moved
            diff = (cur_v - prev_v) if was_white_move else (prev_v - cur_v)
            
            last_player = (AnalysisConfig.PLAYER_WHITE 
                          if was_white_move 
                          else AnalysisConfig.PLAYER_BLACK)
            current_turn = (AnalysisConfig.PLAYER_WHITE 
                           if board.turn == chess.WHITE 
                           else AnalysisConfig.PLAYER_BLACK)
            
            return diff, last_player, current_turn
        except Exception:
            return 0.0, AnalysisConfig.PLAYER_NA, AnalysisConfig.PLAYER_NA

    @staticmethod
    def uci_to_san(fen: str, uci_move: str) -> str:
        """
        Convert UCI move notation to SAN (Standard Algebraic Notation).
        
        Args:
            fen: Current board position
            uci_move: Move in UCI format (e.g., "e2e4")
            
        Returns:
            str: Move in SAN format (e.g., "e4") or "N/A" if invalid
            
        Examples:
            >>> uci_to_san("rnbqkbnr/pppppppp/...", "e2e4")
            "e4"
        """
        if not uci_move or uci_move == AnalysisConfig.PLAYER_NA:
            return AnalysisConfig.PLAYER_NA
        try:
            board = chess.Board(fen)
            move = board.parse_uci(uci_move)
            return board.san(move)
        except Exception:
            return uci_move

    def get_move_quality_label(self, diff: float) -> str:
        """
        Determine move quality label based on evaluation difference.
        
        Args:
            diff: Evaluation difference in pawns (positive = improvement)
            
        Returns:
            str: Quality label in Vietnamese
            
        Quality Ranges:
            > 1.5:  Brilliant
            > 0.8:  Great
            > 0.1:  Good
            > -0.1: Best/Stable
            > -0.3: Inaccuracy
            > -0.7: Mistake
            ≤ -0.7: Blunder
        """
        if diff > AnalysisConfig.BRILLIANT_THRESHOLD:
            return AnalysisConfig.LABEL_BRILLIANT
        if diff > AnalysisConfig.GREAT_THRESHOLD:
            return AnalysisConfig.LABEL_GREAT
        if diff > AnalysisConfig.GOOD_THRESHOLD:
            return AnalysisConfig.LABEL_GOOD
        if diff > AnalysisConfig.BEST_THRESHOLD:
            return AnalysisConfig.LABEL_BEST
        if diff > AnalysisConfig.INACCURACY_THRESHOLD:
            return AnalysisConfig.LABEL_INACCURACY
        if diff > AnalysisConfig.MISTAKE_THRESHOLD:
            return AnalysisConfig.LABEL_MISTAKE
        return AnalysisConfig.LABEL_BLUNDER

    def prepare_analysis_context(
        self, 
        data: Dict[str, Any], 
        engine_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Combine raw data into processed context for AI consumption.
        Central location for all "heavy" analysis logic without API keys.
        
        Args:
            data: Raw game data from frontend (FEN, PGN, scores, etc.)
            engine_results: Results from chess engine (best move, score, PV)
            
        Returns:
            Dict containing processed analysis context with:
                - fen: Current position
                - pgn: Game history
                - last_move_san: Last move in SAN
                - best_move_san: Engine's best move in SAN
                - diff: Evaluation difference
                - diff_str: Formatted difference string
                - quality_label: Move quality assessment
                - last_player: Who just moved
                - current_turn: Whose turn it is
                - formatted_score: Current evaluation
                - opening_name: Opening name if detected
                - move_count: Number of moves played
                - engine_pv: Principal variation
        """
        fen = data.get('fen')
        current_score = data.get('current_score') or engine_results.get('search_score', '0')
        prev_score = data.get('prev_score', '0.00')
        
        diff, last_player, current_turn = self.calculate_evaluation_diff(
            fen, current_score, prev_score
        )
        
        # Format diff string for display
        diff_str = (AnalysisConfig.LABEL_EXTREME_DIFF 
                   if abs(diff) > AnalysisConfig.EXTREME_DIFF_THRESHOLD 
                   else f"{diff:+.2f}")
        
        return {
            "fen": fen,
            "pgn": data.get('pgn', AnalysisConfig.PLAYER_NA),
            "last_move_san": data.get('last_move_san', AnalysisConfig.PLAYER_NA),
            "best_move_san": self.uci_to_san(fen, engine_results.get('best_move')),
            "diff": diff,
            "diff_str": diff_str,
            "quality_label": self.get_move_quality_label(diff),
            "last_player": last_player,
            "current_turn": current_turn,
            "formatted_score": str(current_score),
            "opening_name": data.get('opening_name', AnalysisConfig.PLAYER_NA),
            "move_count": data.get('move_count', 0),
            "engine_pv": engine_results.get('pv', AnalysisConfig.PLAYER_NA)
        }

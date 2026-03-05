"""
Chess Engine Service
Provides abstraction layer for chess engine operations with environment-aware strategy.
Implements Strategy Pattern for engine selection and Single Responsibility Principle.
"""

import os
from typing import Dict, Any, Optional
from backend.engines.stockfish_engine import get_stockfish_move
from backend.engines.minimax import find_best_move
from backend.config import EngineConfig, ChessConfig


class EngineStrategy:
    """Base strategy interface for chess engines"""
    
    def get_move(
        self, 
        fen: str, 
        skill_level: int, 
        time_limit: float
    ) -> Dict[str, Any]:
        """Get best move from engine"""
        raise NotImplementedError
    
    def evaluate(self, fen: str) -> Dict[str, Any]:
        """Quick position evaluation"""
        raise NotImplementedError


class StockfishStrategy(EngineStrategy):
    """Stockfish engine strategy (for local development)"""
    
    def get_move(
        self, 
        fen: str, 
        skill_level: int, 
        time_limit: float
    ) -> Dict[str, Any]:
        """Get move from Stockfish with Minimax fallback"""
        results = get_stockfish_move(fen, skill_level, time_limit)
        
        if results.get('success'):
            return results
            
        # Fallback to Minimax if Stockfish fails (e.g., path error, OOM)
        print(f"⚠️ Stockfish failed, falling back to Minimax: {results.get('error')}")
        return MinimaxStrategy().get_move(fen, skill_level, time_limit)
    
    def evaluate(self, fen: str) -> Dict[str, Any]:
        """Quick evaluation with Stockfish with Minimax fallback"""
        results = get_stockfish_move(
            fen,
            skill_level=EngineConfig.MAX_SKILL_LEVEL,
            time_limit=EngineConfig.EVALUATION_TIME_LIMIT
        )
        
        if results.get('success'):
            return results
        
        # Fallback to Minimax
        return MinimaxStrategy().evaluate(fen)


class MinimaxStrategy(EngineStrategy):
    """Fallback Minimax engine strategy (lightweight for Production)"""
    
    def get_move(
        self, 
        fen: str, 
        skill_level: int, 
        time_limit: float
    ) -> Dict[str, Any]:
        """Get move from internal Minimax"""
        move, score = find_best_move(fen)
        return {
            "success": True,
            "best_move": move,
            "search_score": score
        }
    
    def evaluate(self, fen: str) -> Dict[str, Any]:
        """Quick evaluation with Minimax"""
        _, score = find_best_move(fen)
        return {
            "success": True,
            "search_score": score
        }


class EngineService:
    """
    Orchestrator for chess engine operations.
    Handles environment detection and strategy selection.
    """
    
    def __init__(self):
        # Render environment detect
        self.is_production = os.environ.get("RENDER") is not None
        self._strategy: Optional[EngineStrategy] = None
    
    def _get_strategy(self, engine_choice: str = 'stockfish') -> EngineStrategy:
        """
        Get appropriate engine strategy. 
        Will attempt Stockfish if requested, otherwise fallback to Minimax.
        """
        # Even on Production, if Stockfish is requested, try to use it
        # The StockfishStrategy now has a built-in fallback to Minimax
        if engine_choice == 'stockfish':
            return StockfishStrategy()
        
        return MinimaxStrategy()
    
    def get_best_move(
        self,
        fen: str,
        engine_choice: str = 'stockfish',
        skill_level: int = EngineConfig.DEFAULT_SKILL_LEVEL,
        time_limit: float = EngineConfig.DEFAULT_THINK_TIME
    ) -> Dict[str, Any]:
        """
        Get best move from appropriate engine with guaranteed format.
        """
        strategy = self._get_strategy(engine_choice)
        raw_results = strategy.get_move(fen, skill_level, time_limit)
        
        # Ensure consistent format
        formatted = self.format_engine_results(raw_results)
        formatted['success'] = raw_results.get('success', True)
        if 'error' in raw_results:
            formatted['error'] = raw_results['error']
            
        return formatted
    
    def evaluate_position(self, fen: str) -> Dict[str, Any]:
        """
        Quick position evaluation for UI bar with guaranteed format.
        """
        strategy = self._get_strategy('stockfish')
        raw_results = strategy.evaluate(fen)
        
        # Ensure consistent format
        formatted = self.format_engine_results(raw_results)
        formatted['success'] = raw_results.get('success', True)
        return formatted
    
    @staticmethod
    def format_engine_results(results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format engine results for consistent API response.
        
        Args:
            results: Raw engine results
            
        Returns:
            Formatted dict with search_score, best_move, pv
        """
        return {
            'search_score': results.get('search_score', ChessConfig.DEFAULT_SCORE),
            'best_move': results.get('best_move', ChessConfig.DEFAULT_BEST_MOVE),
            'pv': results.get('pv', ChessConfig.DEFAULT_PV)
        }
    
    @staticmethod
    def parse_time_limit(time_limit_raw: str) -> float:
        """
        Convert time limit from minutes (string) to seconds (float).
        
        Args:
            time_limit_raw: Time in minutes as string (e.g., "5" or "0")
            
        Returns:
            float: Time in seconds, capped at MAX_BOT_THINK_TIME
        """
        try:
            time_limit_min = float(time_limit_raw)
            if time_limit_min <= 0:
                return EngineConfig.DEFAULT_THINK_TIME
            else:
                return min(
                    EngineConfig.MAX_BOT_THINK_TIME,
                    time_limit_min * EngineConfig.MINUTES_TO_SECONDS
                )
        except (ValueError, TypeError):
            return EngineConfig.DEFAULT_THINK_TIME


# Singleton instance for application-wide use
engine_service = EngineService()

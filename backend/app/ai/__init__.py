# app/ai/__init__.py
import random

from app import logic
from app.ai import alphabeta, montecarlo, qlearning  # Importar tus modulos
from app.models import AIAlgorithm
from app.utils import measure_performance


@measure_performance
def select_best_move(board, player, algorithm: AIAlgorithm, parameters: dict):
    """
    Función fachada que redirige al algoritmo correcto
    """
    valid_moves = logic.get_valid_moves(board, player)
    if not valid_moves:
        return None

    if algorithm == AIAlgorithm.RANDOM:
        return random.choice(valid_moves)
    elif algorithm == AIAlgorithm.ALPHABETA:
        return alphabeta.get_move(board, player, parameters)

    elif algorithm == AIAlgorithm.MONTECARLO:
        return montecarlo.get_move(board, player, parameters)

    elif algorithm == AIAlgorithm.QLEARNING:
        return qlearning.get_move(board, player, parameters)

    return None

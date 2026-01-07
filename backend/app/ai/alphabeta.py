import math
import random

from app import logic

# Importamos las funciones de evaluación separadas
from app.ai.heuristics import evaluate_board, evaluate_end_game


def get_move(board, player, parameters: dict):
    """
    Punto de entrada del algoritmo Alpha-Beta.
    """
    depth = parameters.get("depth", 3)
    heuristic_type = parameters.get("heuristic", "static_weights")

    valid_moves = logic.get_valid_moves(board, player)

    if not valid_moves:
        return None

    if len(valid_moves) == 1:
        return valid_moves[0]

    # Configuración inicial de Alpha-Beta
    best_score = -math.inf
    best_move = random.choice(valid_moves)
    alpha = -math.inf
    beta = math.inf

    for move in valid_moves:
        # Generar siguiente estado
        sim_result = logic.apply_move(board, move[0], move[1], player)
        new_board = sim_result.board_state

        # Llamada recursiva (cambio de turno -> minimizar)
        score = _minimax(
            new_board, depth - 1, alpha, beta, False, player, heuristic_type
        )

        if score > best_score:
            best_score = score
            best_move = move

        alpha = max(alpha, score)

    return best_move


def _minimax(board, depth, alpha, beta, is_maximizing, my_player_id, heuristic_type):
    """
    Motor recursivo de búsqueda.
    """
    opponent_id = 3 - my_player_id
    current_player = my_player_id if is_maximizing else opponent_id

    # Obtenemos movimientos para saber si el juego sigue o se estanca
    valid_moves = logic.get_valid_moves(board, current_player)

    # --- CASO BASE ---
    if depth <= 0 or not valid_moves:
        if not valid_moves:
            # Chequear si es FIN DE PARTIDA real (ninguno mueve)
            if not logic.get_valid_moves(board, 3 - current_player):
                return evaluate_end_game(board, my_player_id)

            # Si es solo un PASE de turno, seguimos profundizando pero sin consumir profundidad
            # o restando 1 para evitar bucles.
            return _minimax(
                board,
                depth - 1,
                alpha,
                beta,
                not is_maximizing,
                my_player_id,
                heuristic_type,
            )

        # Si llegamos al límite de profundidad, usamos la heurística
        return evaluate_board(board, my_player_id, heuristic_type)

    # --- RECURSIÓN ---
    if is_maximizing:
        max_eval = -math.inf
        for move in valid_moves:
            sim_result = logic.apply_move(board, move[0], move[1], my_player_id)
            eval_score = _minimax(
                sim_result.board_state,
                depth - 1,
                alpha,
                beta,
                False,
                my_player_id,
                heuristic_type,
            )
            max_eval = max(max_eval, eval_score)
            alpha = max(alpha, eval_score)
            if beta <= alpha:
                break
        return max_eval
    else:
        min_eval = math.inf
        for move in valid_moves:
            sim_result = logic.apply_move(board, move[0], move[1], opponent_id)
            eval_score = _minimax(
                sim_result.board_state,
                depth - 1,
                alpha,
                beta,
                True,
                my_player_id,
                heuristic_type,
            )
            min_eval = min(min_eval, eval_score)
            beta = min(beta, eval_score)
            if beta <= alpha:
                break
        return min_eval

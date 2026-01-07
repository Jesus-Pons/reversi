from app import logic

# --- MAPA DE CALOR ESTÁTICO ---
# Esquinas (100) valiosas, casillas X (-20/-50) peligrosas.
POSITION_WEIGHTS = [
    [100, -20, 10, 5, 5, 10, -20, 100],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [10, -2, 5, 1, 1, 5, -2, 10],
    [5, -2, 1, 2, 2, 1, -2, 5],
    [5, -2, 1, 2, 2, 1, -2, 5],
    [10, -2, 5, 1, 1, 5, -2, 10],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [100, -20, 10, 5, 5, 10, -20, 100],
]


def eval_static_weights(board, player_id):
    """Suma los valores de las casillas ocupadas según el mapa de calor."""
    opponent_id = 3 - player_id
    score = 0
    for r in range(8):
        for c in range(8):
            cell = board[r][c]
            if cell == player_id:
                score += POSITION_WEIGHTS[r][c]
            elif cell == opponent_id:
                score -= POSITION_WEIGHTS[r][c]
    return score


def eval_mobility(board, player_id):
    """Premia tener más movimientos disponibles que el rival."""
    opponent_id = 3 - player_id
    my_moves = len(logic.get_valid_moves(board, player_id))
    op_moves = len(logic.get_valid_moves(board, opponent_id))

    # Evitar división por cero si usamos ratios, aquí usamos diferencia simple multiplicada
    return 10 * (my_moves - op_moves)


def eval_hybrid(board, player_id):
    """Combina posición (estrategia) y movilidad (táctica)."""
    # 70% peso a posición, 30% a movilidad (ajustable)
    pos_score = eval_static_weights(board, player_id)
    mob_score = eval_mobility(board, player_id)
    return pos_score + mob_score


def evaluate_board(board, player_id, heuristic_type="static_weights"):
    """
    Dispatcher principal: llama a la función correcta según el nombre.
    """
    if heuristic_type == "mobility_based":
        return eval_mobility(board, player_id)
    elif heuristic_type == "hybrid":
        return eval_hybrid(board, player_id)
    # Default y "static_weights"
    return eval_static_weights(board, player_id)


def evaluate_end_game(board, player_id):
    """Evaluación definitiva para fin de partida (cuenta fichas reales)."""
    my_count = sum(row.count(player_id) for row in board)
    op_count = sum(row.count(3 - player_id) for row in board)
    if my_count > op_count:
        return 10000 + (my_count - op_count)
    elif my_count < op_count:
        return -10000 - (op_count - my_count)
    return 0

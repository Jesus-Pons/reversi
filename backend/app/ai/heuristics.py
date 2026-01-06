from app import logic

# Pesos estáticos para el tablero (Mapa de calor)
# Esquinas (100) son vitales, casillas adyacentes a esquinas "X-squares" (-20) son trampas.
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


def evaluate_board(board, player_id):
    """
    Calcula la puntuación heurística de un estado intermedio.
    Combina posición (pesos) y movilidad.
    """
    opponent_id = 3 - player_id
    score = 0

    # 1. Puntuación por posición (Estrategia)
    for r in range(8):
        for c in range(8):
            cell = board[r][c]
            if cell == player_id:
                score += POSITION_WEIGHTS[r][c]
            elif cell == opponent_id:
                score -= POSITION_WEIGHTS[r][c]

    # 2. Movilidad (Táctica)
    # Es mejor si yo tengo muchas opciones y el rival pocas.
    my_moves = len(logic.get_valid_moves(board, player_id))
    op_moves = len(logic.get_valid_moves(board, opponent_id))

    mobility_score = 10 * (my_moves - op_moves)

    return score + mobility_score


def evaluate_end_game(board, player_id):
    """
    Evaluación definitiva cuando la partida ha terminado.
    Aquí no importan las esquinas, solo quién tiene más fichas.
    """
    my_count = sum(row.count(player_id) for row in board)
    op_count = sum(row.count(3 - player_id) for row in board)

    if my_count > op_count:
        # Victoria masiva para asegurar que el algoritmo la elija siempre
        return 10000 + (my_count - op_count)
    elif my_count < op_count:
        return -10000 - (op_count - my_count)
    else:
        return 0  # Empate

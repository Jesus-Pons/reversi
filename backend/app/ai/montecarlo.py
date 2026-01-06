import math
import random
import time
from typing import Optional

from app import logic
from app.ai.heuristics import evaluate_board
from app.models import Turn


class Node:
    """
    Nodo del árbol de búsqueda Monte Carlo.
    """

    def __init__(self, board, parent=None, move=None, player_who_moved=None):
        self.board = board
        self.parent = parent
        self.move = move  # La jugada que llevó a este estado
        self.player_who_moved = player_who_moved  # Quién hizo la jugada (1 o 2)

        self.children = []
        self.wins = 0.0
        self.visits = 0

        # Movimientos no explorados desde este estado
        # Nota: Calculamos los movimientos para el SIGUIENTE jugador
        self.untried_moves = []
        self._initialize_untried_moves()

    def _initialize_untried_moves(self):
        # Determinamos de quién es el turno basándonos en quien movió antes.
        # Si nadie movió (raíz), asumimos que logic manejará el turno correcto externamente,
        # pero para nodos hijos:
        if self.player_who_moved:
            next_player = 3 - self.player_who_moved
        else:
            # Caso raíz, se seteará externamente o se asume lógica del juego
            return

        self.untried_moves = logic.get_valid_moves(self.board, next_player)

        # Si el jugador actual no tiene movimientos (PASS),
        # pero el juego no ha terminado, añadimos un movimiento "None" (Pass)
        # o manejamos la lógica de expansión especial.
        # Simplificación: Si no hay moves, untried queda vacío y será nodo hoja o terminal.

    def is_fully_expanded(self):
        return len(self.untried_moves) == 0

    def best_child(self, c_param=1.414):
        """
        Selecciona el mejor hijo usando la fórmula UCB1 (Upper Confidence Bound 1).
        Equilibra explotación (wins/visits) y exploración (log(parent)/visits).
        """
        choices_weights = []
        for child in self.children:
            if child.visits == 0:
                weight = float("inf")
            else:
                exploitation = child.wins / child.visits
                exploration = c_param * math.sqrt(
                    (2 * math.log(self.visits)) / child.visits
                )
                weight = exploitation + exploration
            choices_weights.append(weight)

        return self.children[choices_weights.index(max(choices_weights))]


def get_move(board, player, parameters):
    """
    Función principal llamada por la API.
    """
    iterations = parameters.get("iterations", 1000)
    # Constante de exploración (C). Mayor = más exploración.
    c_param = parameters.get("exploration_constant", 1.41)
    time_limit = parameters.get(
        "time_limit", 4.5
    )  # Segundos maximos de seguridad para HTTP

    # 1. Crear nodo Raíz
    # El 'player_who_moved' es el oponente, porque ahora nos toca a 'player'
    root = Node(board, player_who_moved=3 - player)
    root.untried_moves = logic.get_valid_moves(board, player)

    start_time = time.time()

    # 2. Bucle principal MCTS
    for _ in range(iterations):
        if time.time() - start_time > time_limit:
            break

        # A. Selección
        node = _select(root, c_param)

        # B. Expansión
        # Si el nodo no es terminal y tiene jugadas sin probar, expandimos
        if not _is_game_over(node.board, node.player_who_moved):
            if not node.is_fully_expanded():
                node = _expand(node)

        # C. Simulación (Rollout)
        winner_int = _simulate(node.board, node.player_who_moved)

        # D. Retropropagación (Backpropagation)
        _backpropagate(node, winner_int)

    # 3. Elegir movimiento final
    # Seleccionamos el hijo con más visitas (más robusto), no necesariamente el de mayor winrate
    if not root.children:
        # Fallback si no dio tiempo a nada
        valid = logic.get_valid_moves(board, player)
        return random.choice(valid) if valid else None

    best_child = max(root.children, key=lambda c: c.visits)
    return best_child.move


def _select(node, c_param):
    """Baja por el árbol hasta encontrar un nodo expandible o terminal."""
    while node.is_fully_expanded() and node.children:
        node = node.best_child(c_param)
    return node


def _expand(node):
    """Añade un hijo al nodo actual tomando un movimiento no probado."""
    move = node.untried_moves.pop()

    # ¿De quién es el turno? Del opuesto al que movió para llegar al nodo padre
    turn = 3 - node.player_who_moved

    # Aplicar movimiento
    res = logic.apply_move(node.board, move[0], move[1], turn)

    # Crear nuevo nodo hijo
    child_node = Node(res.board_state, parent=node, move=move, player_who_moved=turn)

    # Si apply_move detectó un cambio de turno especial (doble turno/pase),
    # logic.py lo maneja devolviendo current_turn.
    # Recalculamos untried moves para el estado resultante
    if res.current_turn:
        child_node.untried_moves = logic.get_valid_moves(
            res.board_state, res.current_turn
        )
    else:
        # Game over
        child_node.untried_moves = []

    node.children.append(child_node)
    return child_node


def _simulate(board, last_player_who_moved):
    """
    Ejecuta una partida aleatoria (o semi-inteligente) desde el estado actual hasta el final.
    AQUÍ USAMOS TU HEURÍSTICA.
    """
    # Trabajamos con una copia para no dañar el nodo
    current_board = [r[:] for r in board]

    # Determinar turno inicial de simulación
    current_turn = 3 - last_player_who_moved

    while True:
        valid_moves = logic.get_valid_moves(current_board, current_turn)

        if not valid_moves:
            # Si yo no puedo mover, veo si el oponente puede (Pase)
            if not logic.get_valid_moves(current_board, 3 - current_turn):
                break  # Nadie puede mover -> Fin del juego
            else:
                current_turn = 3 - current_turn  # Paso turno
                continue

        # --- POLÍTICA DE SIMULACIÓN (Simulación Guiada) ---
        # En lugar de random puro, usamos epsilon-greedy con tu heurística.
        # 20% de veces usamos heurística, 80% random para velocidad y variabilidad.
        # (Si evalúas siempre es muy lento y el MCTS hace pocas iteraciones).

        if random.random() < 0.3:  # 30% de "inteligencia"
            best_move = None
            best_score = -float("inf")
            # Evaluamos movimientos candidatos
            for m in valid_moves:
                # Simulación ligera de 1 paso
                temp_res = logic.apply_move(current_board, m[0], m[1], current_turn)
                # Reutilizamos heuristic.py
                score = evaluate_board(temp_res.board_state, current_turn)
                if score > best_score:
                    best_score = score
                    best_move = m
            move_to_make = best_move
        else:
            move_to_make = random.choice(valid_moves)

        # Ejecutar movimiento
        res = logic.apply_move(
            current_board, move_to_make[0], move_to_make[1], current_turn
        )
        current_board = res.board_state

        if res.current_turn:
            current_turn = res.current_turn
        else:
            break  # Fin detectado por logic

    # Calcular ganador final
    black_score = sum(r.count(1) for r in current_board)
    white_score = sum(r.count(2) for r in current_board)

    if black_score > white_score:
        return 1
    if white_score > black_score:
        return 2
    return 0  # Empate


def _backpropagate(node, winner_int):
    """Sube por el árbol actualizando estadísticas."""
    while node:
        node.visits += 1
        if winner_int == 0:
            node.wins += 0.5
        # Si el ganador es quien hizo la jugada de este nodo, es una victoria para ESTA jugada.
        elif node.player_who_moved == winner_int:
            node.wins += 1
        node = node.parent


def _is_game_over(board, last_player):
    """Helper rápido para saber si terminamos sin llamar a logic completo"""
    if logic.get_valid_moves(board, 3 - last_player):
        return False
    if logic.get_valid_moves(board, last_player):
        return False
    return True

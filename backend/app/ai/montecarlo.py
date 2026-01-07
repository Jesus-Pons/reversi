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
    iterations = parameters.get("iterations", 1000)
    c_param = parameters.get("exploration_constant", 1.41)
    time_limit = parameters.get("time_limit", 4.5)

    # LEER HEURÍSTICA
    # Si no viene nada, asumimos "none" (Random Rollout por defecto)
    heuristic_type = parameters.get("heuristic", "none")

    # LÓGICA CLAVE:
    # Si la heurística es "none" (o explícitamente random_rollout), jugamos al azar.
    # Si es cualquier otra (static, mobility...), usamos simulación guiada.
    use_random = heuristic_type == "none" or heuristic_type == "random_rollout"

    root = Node(board, player_who_moved=3 - player)
    root.untried_moves = logic.get_valid_moves(board, player)

    start_time = time.time()

    for _ in range(iterations):
        if time.time() - start_time > time_limit:
            break

        # 1. Selection
        node = root
        while node.is_fully_expanded() and node.children:
            node = node.best_child(c_param)

        # 2. Expansion
        current_turn_in_node = 3 - node.player_who_moved
        if node.untried_moves is None:
            node.untried_moves = logic.get_valid_moves(node.board, current_turn_in_node)

        if node.untried_moves:
            move = node.untried_moves.pop()
            res = logic.apply_move(node.board, move[0], move[1], current_turn_in_node)
            child_node = Node(
                res.board_state,
                parent=node,
                move=move,
                player_who_moved=current_turn_in_node,
            )
            node.children.append(child_node)
            node = child_node

        # 3. Simulation
        # Pasamos el flag derivado 'use_random'
        winner = _simulate(
            node.board, node.player_who_moved, use_random, heuristic_type
        )

        # 4. Backpropagation
        while node:
            node.visits += 1
            if winner == node.player_who_moved:
                node.wins += 1
            elif winner == 0:
                node.wins += 0.5
            node = node.parent

    if not root.children:
        return random.choice(logic.get_valid_moves(board, player) or [])

    return max(root.children, key=lambda c: c.visits).move


def _simulate(board, last_player_who_moved, use_random, heuristic_type):
    current_board = [r[:] for r in board]
    current_turn = 3 - last_player_who_moved

    while True:
        valid_moves = logic.get_valid_moves(current_board, current_turn)

        if not valid_moves:
            if not logic.get_valid_moves(current_board, 3 - current_turn):
                break
            current_turn = 3 - current_turn
            continue

        move_to_make = None

        if use_random:
            # Opción A: Random Puro (Heurística = NONE)
            move_to_make = random.choice(valid_moves)
        else:
            # Opción B: Greedy Guiado (Heurística = STATIC/MOBILITY...)
            best_score = -float("inf")
            best_moves = []

            for m in valid_moves:
                temp_res = logic.apply_move(current_board, m[0], m[1], current_turn)
                # Reutilizamos la lógica común
                score = evaluate_board(
                    temp_res.board_state, current_turn, heuristic_type
                )

                if score > best_score:
                    best_score = score
                    best_moves = [m]
                elif score == best_score:
                    best_moves.append(m)

            move_to_make = random.choice(best_moves)

        res = logic.apply_move(
            current_board, move_to_make[0], move_to_make[1], current_turn
        )
        current_board = res.board_state
        if res.current_turn:
            current_turn = res.current_turn

    b = sum(r.count(1) for r in current_board)
    w = sum(r.count(2) for r in current_board)
    if b > w:
        return 1
    if w > b:
        return 2
    return 0

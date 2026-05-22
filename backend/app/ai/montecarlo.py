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
        self.move = move
        self.player_who_moved = player_who_moved

        self.children = []
        self.wins = 0.0
        self.visits = 0

        self.untried_moves = []
        self._initialize_untried_moves()

    def _initialize_untried_moves(self):
        if self.player_who_moved:
            next_player = 3 - self.player_who_moved
        else:
            return

        self.untried_moves = logic.get_valid_moves(self.board, next_player)

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

    heuristic_type = parameters.get("heuristic", "none")

    use_random = heuristic_type == "none" or heuristic_type == "random_rollout"

    root = Node(board, player_who_moved=3 - player)
    root.untried_moves = logic.get_valid_moves(board, player)

    start_time = time.time()

    for _ in range(iterations):
        if time.time() - start_time > time_limit:
            break

        node = root
        while node.is_fully_expanded() and node.children:
            node = node.best_child(c_param)

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

        winner = _simulate(
            node.board, node.player_who_moved, use_random, heuristic_type
        )

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

    HEURISTIC_DEPTH_LIMIT = 5
    steps_simulated = 0

    while True:
        valid_moves = logic.get_valid_moves(current_board, current_turn)

        if not valid_moves:
            if not logic.get_valid_moves(current_board, 3 - current_turn):
                break
            current_turn = 3 - current_turn
            continue

        move_to_make = None

        is_fast_mode = use_random or steps_simulated >= HEURISTIC_DEPTH_LIMIT

        if is_fast_mode:
            move_to_make = random.choice(valid_moves)
        else:
            epsilon = 0.15
            if random.random() < epsilon:
                move_to_make = random.choice(valid_moves)
            else:
                best_score = -float("inf")
                best_moves = []

                for m in valid_moves:
                    temp_res = logic.apply_move(current_board, m[0], m[1], current_turn)
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
        steps_simulated += 1

    b = sum(r.count(1) for r in current_board)
    w = sum(r.count(2) for r in current_board)
    if b > w:
        return 1
    if w > b:
        return 2
    return 0

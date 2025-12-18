import random

from app import logic


def get_move(board, player, parameters):
    valid_moves = logic.get_valid_moves(board, player)
    return random.choice(valid_moves)

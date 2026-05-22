from typing import List, Optional, Tuple

from app.models import GameStateResult

DIRECTIONS = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def get_valid_moves(board: List[List[int]], player: int) -> List[Tuple[int, int]]:
    """
    Recibe el tablero crudo (matriz 8x8) y el jugador (1 o 2).
    Devuelve lista de coordenadas [(2, 3), (4, 5)] validas.
    """
    valid_moves = []
    opponent = 3 - player

    rows = len(board)
    cols = len(board[0])

    for row in range(rows):
        for column in range(cols):
            if board[row][column] != 0:
                continue

            for rowDirection, columnDirection in DIRECTIONS:
                if _can_flip_in_direction(
                    board, row, column, rowDirection, columnDirection, player, opponent
                ):
                    valid_moves.append((row, column))
                    break

    return valid_moves


def _can_flip_in_direction(
    board, row, column, rowDirection, columnDirection, player, opponent
):
    newRow = row + rowDirection
    newColumn = column + columnDirection
    found_opponent = False

    while 0 <= newRow < 8 and 0 <= newColumn < 8:
        cell = board[newRow][newColumn]
        if cell == opponent:
            found_opponent = True
        elif cell == player:
            return found_opponent
        else:
            return False
        newRow += rowDirection
        newColumn += columnDirection

    return False


def validate_move(board: List[List[int]], row: int, column: int, player: int) -> bool:
    """
    Valida si una jugada es legal.
    """
    if board[row][column] != 0:
        return False

    opponent = 3 - player

    for rowDirection, columnDirection in DIRECTIONS:
        if _can_flip_in_direction(
            board, row, column, rowDirection, columnDirection, player, opponent
        ):
            return True

    return False


def apply_move(board: List[List[int]], row: int, col: int, player: int) -> dict:
    """
    Ejecuta un movimiento, voltea fichas y calcula el siguiente estado.
    Retorna un diccionario con todo lo necesario para actualizar la BD.
    """
    new_board = [r[:] for r in board]
    new_board[row][col] = player

    opponent = 3 - player

    for dr, dc in DIRECTIONS:
        if _can_flip_in_direction(new_board, row, col, dr, dc, player, opponent):
            r, c = row + dr, col + dc
            while new_board[r][c] == opponent:
                new_board[r][c] = player
                r += dr
                c += dc

    score_black = sum(row.count(1) for row in new_board)
    score_white = sum(row.count(2) for row in new_board)

    next_player = opponent
    winner = None

    if not get_valid_moves(new_board, next_player):
        if get_valid_moves(new_board, player):
            next_player = player
        else:
            next_player = None
            if score_black > score_white:
                winner = "black"
            elif score_white > score_black:
                winner = "white"
            else:
                winner = "draw"

    return GameStateResult(
        board_state=new_board,
        score_black=score_black,
        score_white=score_white,
        current_turn=next_player,
        winner=winner,
    )

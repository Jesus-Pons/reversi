import time
import uuid
from typing import Any, List

from app import ai, crud, logic
from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models import (
    AIConfig,
    BotMoveResponse,
    Game,
    GameCreate,
    GamePublic,
    GamesPublic,
    GameStateResult,
    MoveCreate,
    Moves,
    Turn,
    ValidMovesResponse,
    Winner,
)
from app.utils import generate_new_account_email, send_email
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, delete, func, select

router = APIRouter(prefix="/games", tags=["games"])


@router.get(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=GamesPublic,
)
def read_games(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """
    Retrieve Games.
    """

    count_statement = select(func.count()).select_from(Game)
    count = session.exec(count_statement).one()

    statement = select(Game).offset(skip).limit(limit)
    games = session.exec(statement).all()

    return GamesPublic(data=games, count=count)


@router.get("/me/", response_model=GamesPublic)
def read_my_games(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve my Games.
    """

    count_statement = (
        select(func.count())
        .select_from(Game)
        .where(
            (Game.player_black_id == current_user.id)
            | (Game.player_white_id == current_user.id)
            | (Game.owner_id == current_user.id)
        )
    )
    count = session.exec(count_statement).one()

    statement = (
        select(Game)
        .where(
            (Game.player_black_id == current_user.id)
            | (Game.player_white_id == current_user.id)
            | (Game.owner_id == current_user.id)
        )
        .offset(skip)
        .limit(limit)
    )
    games = session.exec(statement).all()

    return GamesPublic(data=games, count=count)


@router.post(
    "/", dependencies=[Depends(get_current_active_superuser)], response_model=Game
)
def create_game(
    *, session: SessionDep, game_in: GameCreate, current_user: CurrentUser
) -> Any:
    """
    Create new game.
    """
    game = Game(owner_id=current_user.id)

    if game_in.bot_black_config:
        final_params_black = {}
        raw_params_black = game_in.bot_black_config.parameters
        if hasattr(raw_params_black, "model_dump"):
            final_params_black = raw_params_black.model_dump()
        else:
            final_params_black = raw_params_black
        black_bot_config = AIConfig(
            algorithm=game_in.bot_black_config.algorithm,
            heuristic=game_in.bot_black_config.heuristic,
            # ESTO ES CLAVE: Convertimos el objeto AlphaBetaParams a dict
            parameters=final_params_black,
        )
        session.add(black_bot_config)
        game.bot_black = black_bot_config
    else:
        game.player_black_id = current_user.id

    if game_in.bot_white_config:
        raw_params_white = game_in.bot_white_config.parameters
        if hasattr(raw_params_white, "model_dump"):
            final_params_white = raw_params_white.model_dump()
        else:
            final_params_white = raw_params_white
        white_bot_config = AIConfig(
            algorithm=game_in.bot_white_config.algorithm,
            heuristic=game_in.bot_white_config.heuristic,
            parameters=final_params_white,
        )
        session.add(white_bot_config)
        game.bot_white = white_bot_config
    else:
        game.player_white_id = current_user.id

    session.add(game)
    session.commit()
    session.refresh(game)
    return game


@router.get("/{game_id}/", response_model=Game)
def get_game_by_id(
    *, session: SessionDep, game_id: uuid.UUID, current_user: CurrentUser
) -> Game:
    """
    Get a game by its ID.
    """
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if (
        game.owner_id != current_user.id
        and game.player_black_id != current_user.id
        and game.player_white_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return game


@router.get("/{game_id}/valid-moves/", response_model=ValidMovesResponse)
def get_valid_moves(
    *, session: SessionDep, game_id: uuid.UUID, current_user: CurrentUser
) -> ValidMovesResponse:
    """
    Get valid moves for the current player in the game.
    """
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if (
        game.owner_id != current_user.id
        and game.player_black_id != current_user.id
        and game.player_white_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    valid_moves = logic.get_valid_moves(
        game.board_state, 1 if game.current_turn == Turn.BLACK else 2
    )
    return ValidMovesResponse(
        valid_moves=valid_moves, current_turn=game.current_turn, game_id=game.id
    )


@router.post("/{game_id}/move/", response_model=Game)
def human_move(
    *,
    session: SessionDep,
    game_id: uuid.UUID,
    move: MoveCreate,
    current_user: CurrentUser,
) -> Game:
    """
    Make a move in the game.
    """
    statement = select(Game).where(Game.id == game_id).with_for_update()
    game = session.exec(statement).one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if (
        game.owner_id != current_user.id
        and game.player_black_id != current_user.id
        and game.player_white_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    if not game.winner is None:
        raise HTTPException(status_code=400, detail="Game is already over")

    turn = game.current_turn
    if turn == Turn.BLACK and game.player_black_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not black player's turn")
    if turn == Turn.WHITE and game.player_white_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not white player's turn")
    player = 1 if game.current_turn == Turn.BLACK else 2
    if not logic.validate_move(
        game.board_state, move.coordinate[0], move.coordinate[1], player
    ):
        raise HTTPException(status_code=400, detail="Invalid move")

    result: GameStateResult = logic.apply_move(
        game.board_state, move.coordinate[0], move.coordinate[1], player
    )
    game.board_state = result.board_state
    game.score_black = result.score_black
    game.score_white = result.score_white

    if result.winner:
        game.winner = result.winner

    if result.current_turn == 1:
        game.current_turn = Turn.BLACK
    elif result.current_turn == 2:
        game.current_turn = Turn.WHITE
    session.add(game)
    session.commit()
    session.refresh(game)
    return game


@router.post("/{game_id}/bot-move/", response_model=BotMoveResponse)
def make_bot_move(
    *, session: SessionDep, game_id: uuid.UUID, current_user: CurrentUser
) -> BotMoveResponse:
    """
    Make a move in the game.
    """
    statement = select(Game).where(Game.id == game_id).with_for_update()
    game = session.exec(statement).one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if (
        game.owner_id != current_user.id
        and game.player_black_id != current_user.id
        and game.player_white_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    if not game.winner is None:
        raise HTTPException(status_code=400, detail="Game is already over")
    turn = game.current_turn
    player = 1 if game.current_turn == Turn.BLACK else 2
    ai_config = None
    if game.current_turn == Turn.BLACK:
        ai_config = game.bot_black
    else:
        ai_config = game.bot_white

    if ai_config is None:
        raise HTTPException(status_code=400, detail="No AI configured for this player")

    start_time = time.time()
    ai_params = dict(ai_config.parameters) if ai_config.parameters else {}
    ai_params["heuristic"] = ai_config.heuristic
    move_coords = ai.select_best_move(
        board=game.board_state,
        player=player,
        algorithm=ai_config.algorithm,
        parameters=ai_params,
    )
    execution_time = time.time() - start_time

    if move_coords:
        result = logic.apply_move(
            game.board_state, move_coords[0], move_coords[1], player
        )
        game.board_state = result.board_state
        game.score_black = result.score_black
        game.score_white = result.score_white

        if result.winner:
            game.winner = result.winner

        if result.current_turn == 1:
            game.current_turn = Turn.BLACK
        elif result.current_turn == 2:
            game.current_turn = Turn.WHITE

        message = f"{ai_config.algorithm.value} tardó {execution_time:.3f}s"

    else:
        opponent = 3 - player
        opponent_moves = logic.get_valid_moves(game.board_state, opponent)
        if opponent_moves:
            game.current_turn = Turn.WHITE if player == 1 else Turn.BLACK
            game.moves.append(
                Moves(
                    move_number=len(game.moves) + 1,
                    game_id=game.id,
                    player=Turn.BLACK if player == 1 else Turn.WHITE,
                )
            )
            message = f"AI no pudo mover y pasó el turno"
        else:
            if game.score_black > game.score_white:
                game.winner = Winner.BLACK
            elif game.score_white > game.score_black:
                game.winner = Winner.WHITE
            else:
                game.winner = Winner.DRAW
            message = "Fin de la partida (ningún jugador puede mover)"
    session.add(game)
    session.commit()
    session.refresh(game)
    return BotMoveResponse(
        game=GamePublic.model_validate(game),
        move_made=move_coords,
        message=message,
    )


@router.get("/{game_id}/history/", response_model=List[Moves])
def get_game_history(
    *, session: SessionDep, game_id: uuid.UUID, current_user: CurrentUser
) -> List[Moves]:
    """
    Get the move history of the game.
    """
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if (
        game.owner_id != current_user.id
        and game.player_black_id != current_user.id
        and game.player_white_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    statement = (
        select(Moves).where(Moves.game_id == game_id).order_by(Moves.move_number)
    )
    moves = session.exec(statement).all()
    return moves

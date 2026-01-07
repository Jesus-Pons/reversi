import random
import time
import uuid
from typing import Any

from app import logic
from app.ai import alphabeta, montecarlo, qlearning

# Asegúrate de importar tus modelos y dependencias correctamente
from app.api.deps import CurrentUser, SessionDep
from app.models import (
    AIAlgorithm,
    AIConfig,
    Simulation,
    SimulationRequest,
    SimulationsPublic,
)

# Importa get_initial_board de utils o donde lo tengas
from app.utils import get_initial_board
from fastapi import APIRouter
from sqlalchemy.orm import selectinload
from sqlmodel import func, select

router = APIRouter(prefix="/simulation", tags=["simulation"])


def get_ai_move(board, player, config):
    algorithm = config.algorithm
    params = config.parameters if hasattr(config, "parameters") else {}

    # Convertir parámetros de modelo Pydantic a dict si es necesario
    if hasattr(params, "model_dump"):
        params = params.model_dump()
    else:
        params = dict(params) if params else {}

    if hasattr(config, "heuristic"):
        params["heuristic"] = config.heuristic

    if algorithm == AIAlgorithm.ALPHABETA:
        return alphabeta.get_move(board, player, params)
    elif algorithm == AIAlgorithm.MONTECARLO:
        return montecarlo.get_move(board, player, params)
    elif algorithm == AIAlgorithm.RANDOM:
        # Implementación simple inline para random
        valid = logic.get_valid_moves(board, player)
        return random.choice(valid) if valid else None
    elif algorithm == AIAlgorithm.QLEARNING:
        return qlearning.get_move(board, player, params)
    else:
        # Fallback o QLearning
        valid = logic.get_valid_moves(board, player)
        return random.choice(valid) if valid else None


@router.get("/", response_model=SimulationsPublic)
def read_simulations(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Recuperar historial de simulaciones con los detalles de los bots cargados.
    """
    count_statement = (
        select(func.count())
        .select_from(Simulation)
        .where(Simulation.user_id == current_user.id)
    )
    count = session.exec(count_statement).one()

    statement = (
        select(Simulation)
        .where(Simulation.user_id == current_user.id)
        # AÑADIR ESTAS LÍNEAS PARA CARGAR LAS RELACIONES
        .options(selectinload(Simulation.bot_black), selectinload(Simulation.bot_white))
        .order_by(Simulation.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    simulations = session.exec(statement).all()

    return SimulationsPublic(data=simulations, count=count)


@router.post("/", response_model=Simulation)
def run_simulation(
    *, session: SessionDep, current_user: CurrentUser, request: SimulationRequest
):
    """
    Ejecuta una simulación masiva y guarda los resultados en la BD.
    """
    start_time = time.time()

    # 1. Guardar Configuración de BOT NEGRO en BD
    # Convertimos los parámetros a dict si vienen como modelo Pydantic
    raw_params_black = request.bot_black.parameters
    final_params_black = (
        raw_params_black.model_dump()
        if hasattr(raw_params_black, "model_dump")
        else raw_params_black
    )

    bot_black_db = AIConfig(
        algorithm=request.bot_black.algorithm,
        heuristic=request.bot_black.heuristic,
        parameters=final_params_black,
    )
    session.add(bot_black_db)

    # 2. Guardar Configuración de BOT BLANCO en BD
    raw_params_white = request.bot_white.parameters
    final_params_white = (
        raw_params_white.model_dump()
        if hasattr(raw_params_white, "model_dump")
        else raw_params_white
    )

    bot_white_db = AIConfig(
        algorithm=request.bot_white.algorithm,
        heuristic=request.bot_white.heuristic,
        parameters=final_params_white,
    )
    session.add(bot_white_db)

    # Hacemos commit parcial para obtener los IDs de los bots
    session.commit()
    session.refresh(bot_black_db)
    session.refresh(bot_white_db)

    # 3. Ejecutar Simulaciones (En memoria, sin guardar cada partida)
    results = {"black": 0, "white": 0, "draw": 0}

    for _ in range(request.num_games):
        board = get_initial_board()
        current_turn = 1  # 1=Black
        game_over = False
        consecutive_passes = 0

        while not game_over:
            player_id = current_turn
            # Elegir config correcta
            config = request.bot_black if player_id == 1 else request.bot_white

            move = get_ai_move(board, player_id, config)

            if move:
                consecutive_passes = 0
                res = logic.apply_move(board, move[0], move[1], player_id)
                board = res.board_state

                if res.winner:
                    game_over = True
                    if res.winner == "black":
                        results["black"] += 1
                    elif res.winner == "white":
                        results["white"] += 1
                    else:
                        results["draw"] += 1

                # Actualizar turno
                elif res.current_turn:
                    current_turn = res.current_turn
                else:
                    # Caso raro donde logic dice game over pero no hay winner claro aun
                    game_over = True
            else:
                # No hay movimiento (o error de IA), pasar turno
                consecutive_passes += 1
                if consecutive_passes >= 2:
                    game_over = True
                    # Contar fichas para decidir ganador
                    b_c = sum(r.count(1) for r in board)
                    w_c = sum(r.count(2) for r in board)
                    if b_c > w_c:
                        results["black"] += 1
                    elif w_c > b_c:
                        results["white"] += 1
                    else:
                        results["draw"] += 1
                else:
                    current_turn = 3 - current_turn  # Cambiar turno

    total_time = time.time() - start_time

    # 4. Guardar Resultado de la Simulación
    simulation_db = Simulation(
        user_id=current_user.id,
        bot_black_id=bot_black_db.id,
        bot_white_id=bot_white_db.id,
        num_games=request.num_games,
        black_wins=results["black"],
        white_wins=results["white"],
        draws=results["draw"],
        time_elapsed=total_time,
    )

    session.add(simulation_db)
    session.commit()
    session.refresh(simulation_db)

    return simulation_db

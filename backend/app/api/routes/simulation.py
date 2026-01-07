import random
import time
import uuid
from typing import Any

from app import logic
from app.ai import alphabeta, montecarlo
from app.api.deps import CurrentUser, SessionDep
from app.core.db import engine
from app.models import (
    AIAlgorithm,
    AIConfig,
    Simulation,
    SimulationRequest,
    SimulationsPublic,
)
from app.utils import get_initial_board
from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import Session, func, select

router = APIRouter(prefix="/simulation", tags=["simulation"])


def get_ai_move(board, player, config_model):
    """
    Dispatcher: Elige qué función llamar según el algoritmo configurado.
    Maneja tanto objetos de Base de Datos (AIConfig) como modelos Pydantic (SimulationRequest).
    """
    algo = config_model.algorithm

    # 1. Normalizar parámetros a diccionario
    raw_params = config_model.parameters
    if hasattr(raw_params, "model_dump"):
        params = raw_params.model_dump()
    else:
        # Si es un dict o None, hacemos copia para no mutar el original
        params = dict(raw_params) if raw_params else {}

    # 2. INYECCIÓN CRÍTICA: Meter la heurística dentro de params
    # Si no, alphabeta/montecarlo no saben cuál usar
    if hasattr(config_model, "heuristic"):
        params["heuristic"] = config_model.heuristic

    # 3. Llamar al algoritmo correspondiente
    if algo == AIAlgorithm.ALPHABETA:
        return alphabeta.get_move(board, player, params)
    elif algo == AIAlgorithm.MONTECARLO:
        return montecarlo.get_move(board, player, params)
    elif algo == AIAlgorithm.RANDOM:
        valid = logic.get_valid_moves(board, player)
        return random.choice(valid) if valid else None
    elif algo == AIAlgorithm.QLEARNING:
        # Placeholder por si implementas QLearning
        valid = logic.get_valid_moves(board, player)
        return random.choice(valid) if valid else None
    else:
        # Fallback seguro
        valid = logic.get_valid_moves(board, player)
        return random.choice(valid) if valid else None


def run_simulation_task(simulation_id: uuid.UUID, request: SimulationRequest):
    """
    Tarea en segundo plano con ACTUALIZACIÓN INCREMENTAL.
    """
    with Session(engine) as session:
        try:
            start_time = time.time()
            results = {"black": 0, "white": 0, "draw": 0}

            # Configuración de lotes (Guardar cada X partidas)
            # Si son pocas partidas (ej: 100), guardamos cada 1. Si son muchas (1000), cada 10.
            BATCH_SIZE = 1 if request.num_games < 100 else 10

            for i in range(request.num_games):
                # ... (Toda la lógica de inicializar tablero y bucle while game_over se mantiene IGUAL) ...
                # COPIA AQUÍ TU LÓGICA DE JUEGO EXISTENTE (board = get_initial_board()...)

                # --- [RESUMEN DE LÓGICA DE JUEGO PARA NO REPETIR CÓDIGO GIGANTE] ---
                board = get_initial_board()
                current_turn = 1
                game_over = False
                consecutive_passes = 0
                while not game_over:
                    # ... lógica de movimientos ...
                    player_id = current_turn
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
                        elif res.current_turn:
                            current_turn = res.current_turn
                        else:
                            game_over = True
                    else:
                        consecutive_passes += 1
                        if consecutive_passes >= 2:
                            game_over = True
                            b_c = sum(r.count(1) for r in board)
                            w_c = sum(r.count(2) for r in board)
                            if b_c > w_c:
                                results["black"] += 1
                            elif w_c > b_c:
                                results["white"] += 1
                            else:
                                results["draw"] += 1
                        else:
                            current_turn = 3 - current_turn
                # -------------------------------------------------------------------

                # --- NUEVA LÓGICA DE ACTUALIZACIÓN ---
                # Si hemos completado un lote o es la última partida, actualizamos DB
                if (i + 1) % BATCH_SIZE == 0 or (i + 1) == request.num_games:
                    simulation = session.get(Simulation, simulation_id)
                    if simulation:
                        simulation.black_wins = results["black"]
                        simulation.white_wins = results["white"]
                        simulation.draws = results["draw"]
                        simulation.time_elapsed = time.time() - start_time

                        session.add(simulation)
                        session.commit()
                        # session.refresh no es necesario aquí y ahorra tiempo

            print(f"Simulación {simulation_id} finalizada exitosamente.")

        except Exception as e:
            print(f"Error CRÍTICO en simulación {simulation_id}: {e}")


@router.post("/", response_model=Simulation)
def run_simulation(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    request: SimulationRequest,
    background_tasks: BackgroundTasks,
) -> Any:
    """
    Inicia una simulación en segundo plano. Devuelve inmediatamente el objeto 'pendiente'.
    """
    # 1. Crear Configuración de BOT NEGRO en BD
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

    # 2. Crear Configuración de BOT BLANCO en BD
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

    # Commit parcial para obtener IDs de los bots
    session.commit()
    session.refresh(bot_black_db)
    session.refresh(bot_white_db)

    # 3. Crear el registro de Simulación (Inicialmente vacía/pendiente)
    simulation_db = Simulation(
        user_id=current_user.id,
        bot_black_id=bot_black_db.id,
        bot_white_id=bot_white_db.id,
        num_games=request.num_games,
        black_wins=0,
        white_wins=0,
        draws=0,
        time_elapsed=0.0,
    )
    session.add(simulation_db)
    session.commit()
    session.refresh(simulation_db)

    # 4. Lanzar la tarea en segundo plano
    background_tasks.add_task(run_simulation_task, simulation_db.id, request)

    # 5. Responder rápido al usuario
    return simulation_db


@router.get("/", response_model=SimulationsPublic)
def read_simulations(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Recuperar historial de simulaciones con paginación y carga de bots.
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
        # Importante: Carga los objetos AIConfig para el frontend
        .options(selectinload(Simulation.bot_black), selectinload(Simulation.bot_white))
        .order_by(Simulation.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    simulations = session.exec(statement).all()

    return SimulationsPublic(data=simulations, count=count)

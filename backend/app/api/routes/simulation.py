import random
import time
import uuid
from typing import Any

from app import ai, logic
from app.ai import alphabeta, montecarlo
from app.api.deps import CurrentUser, SessionDep
from app.core.db import engine
from app.models import (
    AIAlgorithm,
    AIConfig,
    Game,
    Moves,
    Simulation,
    SimulationRequest,
    SimulationsPublic,
    Turn,
    Winner,
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
    with Session(engine) as session:
        try:
            # 1. Recuperar datos de configuración
            sim_db = session.get(Simulation, simulation_id)
            if not sim_db:
                return

            # Preparamos params (igual que antes...)
            params_black = dict(sim_db.bot_black.parameters or {})
            params_black["heuristic"] = sim_db.bot_black.heuristic
            params_white = dict(sim_db.bot_white.parameters or {})
            params_white["heuristic"] = sim_db.bot_white.heuristic

            start_sim_time = time.time()
            results = {"black": 0, "white": 0, "draw": 0}

            # --- BUCLE DE PARTIDAS ---
            for i in range(request.num_games):

                # A. CREAR PARTIDA REAL EN BD (Necesario para tener game_id en Moves)
                game_db = Game(
                    owner_id=sim_db.user_id,
                    bot_black_id=sim_db.bot_black_id,
                    bot_white_id=sim_db.bot_white_id,
                    board_state=get_initial_board(),
                    simulation_id=sim_db.id,
                    current_turn=Turn.BLACK,
                    score_black=2,
                    score_white=2,
                )
                session.add(game_db)
                session.commit()
                session.refresh(game_db)  # Obtenemos el ID generado

                # Variables locales para velocidad
                board = game_db.board_state
                current_turn = 1
                game_over = False
                consecutive_passes = 0

                move_counter = 0

                # --- BUCLE DE TURNOS (JUGADA A JUGADA) ---
                while not game_over:

                    move_counter += 1
                    player_id = current_turn

                    # Determinar quién juega
                    if player_id == 1:
                        algo = sim_db.bot_black.algorithm
                        params = params_black
                    else:
                        algo = sim_db.bot_white.algorithm
                        params = params_white

                    # B. LLAMADA CRÍTICA: Aquí obtenemos Tiempo y RAM
                    # move_coords: [fila, col] o None
                    # time_taken: float (segundos)
                    # memory_mb: float (MB)
                    move_coords, time_taken, memory_mb = ai.select_best_move(
                        board=board, player=player_id, algorithm=algo, parameters=params
                    )

                    # C. GUARDAR EL MOVIMIENTO CON ESTADÍSTICAS
                    # Guardamos INCLUSO si es un "Pass" (move_coords es None),
                    # porque tu tutor querrá saber cuánto tardó la IA en decidir pasar.
                    new_move = Moves(
                        game_id=game_db.id,
                        move_number=move_counter,  # O usar un contador local 'turn_count'
                        player=Turn.BLACK if player_id == 1 else Turn.WHITE,
                        position=move_coords,
                        # --- DATOS DEL TFG ---
                        execution_time=time_taken,
                        memory_used=memory_mb,
                    )
                    session.add(new_move)

                    # D. APLICAR LÓGICA DE JUEGO
                    if move_coords:
                        consecutive_passes = 0
                        res = logic.apply_move(
                            board, move_coords[0], move_coords[1], player_id
                        )

                        # Actualizamos estado visual de la partida
                        board = res.board_state
                        game_db.board_state = res.board_state
                        game_db.score_black = res.score_black
                        game_db.score_white = res.score_white

                        if res.winner:
                            game_over = True
                            if res.winner == "black":
                                results["black"] += 1
                                game_db.winner = Winner.BLACK
                            elif res.winner == "white":
                                results["white"] += 1
                                game_db.winner = Winner.WHITE
                            else:
                                results["draw"] += 1
                                game_db.winner = Winner.DRAW
                        elif res.current_turn:
                            current_turn = res.current_turn
                            game_db.current_turn = (
                                Turn.BLACK if current_turn == 1 else Turn.WHITE
                            )
                        else:
                            game_over = True
                    else:
                        # Lógica de Pasar Turno
                        consecutive_passes += 1
                        if consecutive_passes >= 2:
                            game_over = True
                            # Calcular ganador por conteo final...
                            # (Lógica de conteo igual que antes)
                            b_c = sum(r.count(1) for r in board)
                            w_c = sum(r.count(2) for r in board)
                            game_db.score_black = b_c
                            game_db.score_white = w_c

                            if b_c > w_c:
                                results["black"] += 1
                                game_db.winner = Winner.BLACK
                            elif w_c > b_c:
                                results["white"] += 1
                                game_db.winner = Winner.WHITE
                            else:
                                results["draw"] += 1
                                game_db.winner = Winner.DRAW
                        else:
                            current_turn = 3 - current_turn
                            game_db.current_turn = (
                                Turn.BLACK if current_turn == 1 else Turn.WHITE
                            )

                    # Guardamos estado intermedio del juego (Opcional: hacer commit aquí ralentiza mucho)
                    session.add(game_db)

                # FIN DE LA PARTIDA: Hacemos commit de todos los Moves y el Game final
                session.commit()

                # Actualizar progreso global de la simulación
                sim_db.black_wins = results["black"]
                sim_db.white_wins = results["white"]
                sim_db.draws = results["draw"]
                sim_db.time_elapsed = time.time() - start_sim_time
                session.add(sim_db)
                session.commit()

        except Exception as e:
            print(f"Error simulation: {e}")


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

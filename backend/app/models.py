import time
import uuid
from enum import Enum as PyEnum
from typing import Annotated, Any, List, Literal, Optional, Tuple, Union

from app.utils import get_initial_board
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy import JSON, Column
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, Relationship, SQLModel


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    games_as_black: list["Game"] = Relationship(
        back_populates="player_black",
        sa_relationship_kwargs={"foreign_keys": "Game.player_black_id"},
    )
    games_as_white: list["Game"] = Relationship(
        back_populates="player_white",
        sa_relationship_kwargs={"foreign_keys": "Game.player_white_id"},
    )
    games_owned: list["Game"] = Relationship(
        back_populates="owner",
        cascade_delete=True,
        sa_relationship_kwargs={"foreign_keys": "Game.owner_id"},
    )
    simulations: list["Simulation"] = Relationship(
        back_populates="user", cascade_delete=True
    )


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


# Reversi


# --- ENUMS ---
class AIAlgorithm(str, PyEnum):
    RANDOM = "random"
    ALPHABETA = "alphabeta"
    MONTECARLO = "montecarlo"
    QLEARNING = "qlearning"


class AIHeuristic(str, PyEnum):
    # Para AlphaBeta / Montecarlo
    STATIC_WEIGHTS = "static_weights"  # Matriz fija de valores
    MOBILITY_BASED = "mobility_based"  # Prioriza tener muchos movimientos
    HYBRID = "hybrid"  # Mezcla de ambas
    NONE = "none"


class Turn(str, PyEnum):
    BLACK = "black"
    WHITE = "white"


class Winner(str, PyEnum):
    BLACK = "black"
    WHITE = "white"
    DRAW = "draw"


# --- MODELOS ---


class AIConfig(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    algorithm: AIAlgorithm = Field(sa_column=Column(SAEnum(AIAlgorithm)))
    parameters: dict = Field(sa_column=Column(JSON))
    heuristic: AIHeuristic = Field(
        sa_column=Column(
            SAEnum(AIHeuristic, values_callable=lambda x: [e.value for e in x])
        ),
        default=AIHeuristic.NONE,
    )

    # Relaciones
    config_games_as_black: list["Game"] = Relationship(
        back_populates="bot_black",
        sa_relationship_kwargs={"foreign_keys": "Game.bot_black_id"},
    )
    config_games_as_white: list["Game"] = Relationship(
        back_populates="bot_white",
        sa_relationship_kwargs={"foreign_keys": "Game.bot_white_id"},
    )
    simulations_as_black: list["Simulation"] = Relationship(
        back_populates="bot_black",
        sa_relationship_kwargs={"foreign_keys": "Simulation.bot_black_id"},
    )
    simulations_as_white: list["Simulation"] = Relationship(
        back_populates="bot_white",
        sa_relationship_kwargs={"foreign_keys": "Simulation.bot_white_id"},
    )


class Game(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    # Foreign Keys
    owner_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    player_black_id: uuid.UUID | None = Field(default=None, foreign_key="user.id")
    bot_black_id: uuid.UUID | None = Field(default=None, foreign_key="aiconfig.id")
    player_white_id: uuid.UUID | None = Field(default=None, foreign_key="user.id")
    bot_white_id: uuid.UUID | None = Field(default=None, foreign_key="aiconfig.id")

    board_state: List[Any] = Field(
        default_factory=get_initial_board, sa_column=Column(JSON)
    )
    score_black: int = Field(default=2)
    score_white: int = Field(default=2)
    current_turn: Turn = Field(sa_column=Column(SAEnum(Turn)), default=Turn.BLACK)
    winner: Winner | None = Field(default=None, sa_column=Column(SAEnum(Winner)))

    player_black: Optional["User"] = Relationship(
        back_populates="games_as_black",
        sa_relationship_kwargs={"foreign_keys": "Game.player_black_id"},
    )
    bot_black: Optional["AIConfig"] = Relationship(
        back_populates="config_games_as_black",
        sa_relationship_kwargs={"foreign_keys": "Game.bot_black_id"},
    )
    player_white: Optional["User"] = Relationship(
        back_populates="games_as_white",
        sa_relationship_kwargs={"foreign_keys": "Game.player_white_id"},
    )
    bot_white: Optional["AIConfig"] = Relationship(
        back_populates="config_games_as_white",
        sa_relationship_kwargs={"foreign_keys": "Game.bot_white_id"},
    )

    moves: list["Moves"] = Relationship(back_populates="game")
    owner: "User" = Relationship(
        back_populates="games_owned",
        sa_relationship_kwargs={"foreign_keys": "Game.owner_id"},
    )


class Moves(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    game_id: uuid.UUID = Field(foreign_key="game.id")
    move_number: int
    player: Turn = Field(sa_column=Column(SAEnum(Turn)))
    position: List[Any] | None = Field(default=None, sa_column=Column(JSON))

    game: Game = Relationship(back_populates="moves")


class Simulation(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: float = Field(default_factory=time.time)

    # Inputs guardados
    num_games: int
    user_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    bot_black_id: uuid.UUID = Field(foreign_key="aiconfig.id")
    bot_white_id: uuid.UUID = Field(foreign_key="aiconfig.id")

    # Resultados
    black_wins: int
    white_wins: int
    draws: int
    time_elapsed: float

    # Relaciones
    user: "User" = Relationship(back_populates="simulations")
    bot_black: "AIConfig" = Relationship(
        back_populates="simulations_as_black",  # <--- Coincide con AIConfig
        sa_relationship_kwargs={"foreign_keys": "Simulation.bot_black_id"},
    )

    bot_white: "AIConfig" = Relationship(
        back_populates="simulations_as_white",  # <--- Coincide con AIConfig
        sa_relationship_kwargs={"foreign_keys": "Simulation.bot_white_id"},
    )


# Pydantic Models


class AlphaBetaParams(BaseModel):
    depth: int = Field(..., ge=1, le=8, description="Profundidad del árbol (1-8)")
    use_sorting: bool = Field(
        default=True, description="Ordenar movimientos para optimizar poda"
    )
    time_limit_ms: int | None = Field(
        default=1000, description="Tiempo límite por jugada"
    )


class MonteCarloParams(BaseModel):
    iterations: int = Field(..., ge=10, le=10000, description="Número de simulaciones")
    exploration_constant: float = Field(
        default=1.41, description="Constante C de exploración"
    )
    time_limit: float = Field(
        default=4.5, ge=0.1, le=120.0, description="Tiempo límite en segundos"
    )


class QLearningParams(BaseModel):
    learning_rate: float = Field(default=0.1, ge=0.0, le=1.0)
    discount_factor: float = Field(default=0.9, ge=0.0, le=1.0)
    epsilon: float = Field(
        default=0.1, ge=0.0, le=1.0, description="Probabilidad de exploración"
    )


class ConfigAlphaBeta(BaseModel):
    algorithm: Literal[AIAlgorithm.ALPHABETA]  # <--- El discriminador
    heuristic: AIHeuristic
    parameters: AlphaBetaParams  # <--- Obliga a usar params de AlphaBeta


class ConfigMonteCarlo(BaseModel):
    algorithm: Literal[AIAlgorithm.MONTECARLO]
    heuristic: AIHeuristic
    parameters: MonteCarloParams


class ConfigQLearning(BaseModel):
    algorithm: Literal[AIAlgorithm.QLEARNING]
    heuristic: AIHeuristic
    parameters: QLearningParams


class ConfigRandom(BaseModel):
    algorithm: Literal[AIAlgorithm.RANDOM]
    heuristic: AIHeuristic = AIHeuristic.NONE  # Random suele ignorar heurística
    parameters: dict = {}


AIConfigInput = Annotated[
    Union[ConfigAlphaBeta, ConfigMonteCarlo, ConfigQLearning, ConfigRandom],
    Field(discriminator="algorithm"),
]


class GamesPublic(SQLModel):
    data: list[Game]
    count: int


class GameCreate(BaseModel):
    player_black_id: uuid.UUID | None = None
    bot_black_config: AIConfigInput | None = None
    player_white_id: uuid.UUID | None = None
    bot_white_config: AIConfigInput | None = None


class ValidMovesResponse(BaseModel):
    game_id: uuid.UUID
    current_turn: Turn
    valid_moves: List[List[int]]


class MoveCreate(BaseModel):
    coordinate: List[int]


class GamePublic(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    board_state: List[Any]
    score_black: int
    score_white: int
    current_turn: Turn
    winner: Winner | None
    # Devolvemos objetos simplificados de usuario
    player_black: UserPublic | None
    player_white: UserPublic | None
    # No devolvemos toda la config de la IA, a veces solo el ID o el nombre basta
    bot_black_id: uuid.UUID | None
    bot_white_id: uuid.UUID | None

    model_config = ConfigDict(from_attributes=True)


class BotMoveResponse(BaseModel):
    game: GamePublic  # El estado resultante
    move_made: List[int] | None  # La coordenada donde movió (None si pasó turno)
    message: str  # Ej: "AlphaBeta movió a D3 en 1.5s"


class GameStateResult(BaseModel):
    board_state: List[List[int]]
    score_black: int
    score_white: int
    current_turn: Optional[int]  # 1, 2, o None (Game Over)
    winner: Optional[str]  # "black", "white", "draw" o None


class SimulationRequest(BaseModel):
    num_games: int = Field(default=100, ge=1, le=1000)
    bot_black: AIConfigInput
    bot_white: AIConfigInput


class SimulationResult(BaseModel):
    total_games: int
    black_wins: int
    white_wins: int
    draws: int
    time_elapsed: float


class SimulationPublic(SQLModel):
    id: uuid.UUID
    created_at: float
    num_games: int

    black_wins: int
    white_wins: int
    draws: int
    time_elapsed: float

    bot_black: AIConfig
    bot_white: AIConfig


class SimulationsPublic(SQLModel):
    data: list[SimulationPublic]
    count: int

import uuid
from enum import Enum as PyEnum
from typing import Any, List, Optional

from pydantic import EmailStr
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

    # Relaciones
    config_games_as_black: list["Game"] = Relationship(
        back_populates="bot_black",
        sa_relationship_kwargs={"foreign_keys": "Game.bot_black_id"},
    )
    config_games_as_white: list["Game"] = Relationship(
        back_populates="bot_white",
        sa_relationship_kwargs={"foreign_keys": "Game.bot_white_id"},
    )


class Game(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    # Foreign Keys
    owner_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    player_black_id: uuid.UUID | None = Field(default=None, foreign_key="user.id")
    bot_black_id: uuid.UUID | None = Field(default=None, foreign_key="aiconfig.id")
    player_white_id: uuid.UUID | None = Field(default=None, foreign_key="user.id")
    bot_white_id: uuid.UUID | None = Field(default=None, foreign_key="aiconfig.id")

    board_state: List[Any] = Field(sa_column=Column(JSON))
    score_black: int = Field(default=2)
    score_white: int = Field(default=2)
    current_turn: Turn = Field(sa_column=Column(SAEnum(Turn)))
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

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import UserCreate
from tests.utils.user import user_authentication_headers
from tests.utils.utils import random_email, random_lower_string


def _create_user_with_headers(
    client: TestClient, db: Session
) -> tuple[str, dict[str, str]]:
    email = random_email()
    password = random_lower_string()
    user = crud.create_user(
        session=db, user_create=UserCreate(email=email, password=password)
    )
    headers = user_authentication_headers(client=client, email=email, password=password)
    return str(user.id), headers


def test_create_game_against_ai_as_normal_user(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    me_response = client.get(
        f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers
    )
    current_user_id = me_response.json()["id"]

    response = client.post(
        f"{settings.API_V1_STR}/games/",
        headers=normal_user_token_headers,
        json={
            "player_black_id": current_user_id,
            "player_white_id": None,
            "bot_white_config": {
                "algorithm": "random",
                "heuristic": "none",
                "parameters": {},
            },
        },
    )

    assert response.status_code == 200
    game = response.json()
    assert game["player_black_id"] == current_user_id
    assert game["player_white_id"] is None
    assert game["bot_white_id"] is not None


def test_create_local_game_as_normal_user(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    me_response = client.get(
        f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers
    )
    current_user_id = me_response.json()["id"]

    response = client.post(
        f"{settings.API_V1_STR}/games/",
        headers=normal_user_token_headers,
        json={
            "player_black_id": current_user_id,
            "player_white_id": current_user_id,
        },
    )

    assert response.status_code == 200
    game = response.json()
    assert game["player_black_id"] == current_user_id
    assert game["player_white_id"] == current_user_id


def test_human_vs_human_game_turn_permissions(
    client: TestClient, db: Session, normal_user_token_headers: dict[str, str]
) -> None:
    black_response = client.get(
        f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers
    )
    black_user_id = black_response.json()["id"]
    white_user_id, white_headers = _create_user_with_headers(client, db)
    _, outsider_headers = _create_user_with_headers(client, db)

    create_response = client.post(
        f"{settings.API_V1_STR}/games/",
        headers=normal_user_token_headers,
        json={
            "player_black_id": black_user_id,
            "player_white_id": white_user_id,
        },
    )
    assert create_response.status_code == 200
    game = create_response.json()
    game_id = game["id"]

    white_get_response = client.get(
        f"{settings.API_V1_STR}/games/{game_id}/", headers=white_headers
    )
    assert white_get_response.status_code == 200

    outsider_get_response = client.get(
        f"{settings.API_V1_STR}/games/{game_id}/", headers=outsider_headers
    )
    assert outsider_get_response.status_code == 403

    white_move_response = client.post(
        f"{settings.API_V1_STR}/games/{game_id}/move/",
        headers=white_headers,
        json={"coordinate": [2, 3]},
    )
    assert white_move_response.status_code == 403

    black_move_response = client.post(
        f"{settings.API_V1_STR}/games/{game_id}/move/",
        headers=normal_user_token_headers,
        json={"coordinate": [2, 3]},
    )
    assert black_move_response.status_code == 200
    assert black_move_response.json()["current_turn"] == "white"

    valid_moves_response = client.get(
        f"{settings.API_V1_STR}/games/{game_id}/valid-moves/", headers=white_headers
    )
    assert valid_moves_response.status_code == 200
    white_move = valid_moves_response.json()["valid_moves"][0]

    white_move_response = client.post(
        f"{settings.API_V1_STR}/games/{game_id}/move/",
        headers=white_headers,
        json={"coordinate": white_move},
    )
    assert white_move_response.status_code == 200

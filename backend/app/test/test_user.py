from app.logic.user import *
from result import Ok, Err

def test_successful_create_user() -> None:
    user_id = None
    match create_user(name="Test User", email="testuser@example.com", password="secureP@ssW0rD!"):
        case Ok(u):
            assert True
            user_id = u
        case Err(e):
            print(e)
            assert False

    if user_id != None:
        match check_username_password("testuser@example.com", "secureP@ssW0rD!"):
            case Ok(u):
                assert u == user_id
            case Err(_):
                assert False

def test_create_user_already_exists() -> None:
    match create_user(name="Test User", email="testuser1@example.com", password="secureP@ssW0rD!"):
        case Ok(_):
            assert True
        case Err(_):
            assert False
    match create_user(name="Test User", email="testuser1@example.com", password="secureP@ssW0rD!"):
        case Ok(_):
            assert False
        case Err(_):
            assert True

# xpark-backend

## How to set up development environment

1. Install Python dependencies in a virtual environment
   1. Install with Nix (macOS/Linux/WSL only, recommended if using CLI-based workflow)
      1. [Install Nix](https://nixos.org/download)
      1. Run `nix develop .#backend`
   1. Install the "traditional" way
      1. [Install Poetry](https://python-poetry.org/docs/#installing-with-the-official-installer)
      1. Install Python >= 3.12
         1. With Poetry: `poetry env use 3.12`
         1. Or install any other way
      1. Run `pip install -e .` in the backend directory
1. Spin up Postgres
   1. [Install Podman](https://podman.io/docs/installation) or Docker (if using Docker, replace all `podman` commands with `docker`)
   1. Run `podman run -it --name parkingpass_db -p 127.0.0.1:5432:5432 -v parkingpass_postgres_data:/var/lib/postgresql/data -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=password docker.io/postgis/postgis:16-3.4` in another terminal window
   1. For the first time setting up Postgres, create a database
      1. [Install `psql`, the Postgres command-line utility](https://www.postgresql.org/download)
      1. Log into the Postgres database with `psql -h 127.0.0.1 -U admin`
      1. Run `CREATE DATABASE xpark;` to create the XPark database
      1. Run `\q` to exit
1. Run the app
   1. Configure the `.env` file (look at the `.env.sample` file)
   1. From the `backend` directory, run `flask run --debug`
1. Run the Stripe forwarder
   1. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli)
   1. Run `stripe listen --forward-to localhost:5001/api/unstable/stripe/webhook`

## Testing

To run tests and code coverage, run the following commands from the `backend` directory:

```bash
mypy # Type checking
ruff check # Syntax checking
coverage run # Actual tests (unit and E2E) + test coverage
coverage report # Test coverage results
```

Unit and E2E testing require a database set up properly for testing. Set these environment variables to match the test environment.

```bash
TEST_DATABASE_URI="user=postgres password=postgres host=postgres port=5432"
DATABASE_URI="unused" # unused but required
TEST_DATABASE_NAME=test_xpark
SECRET_KEY=test_key
FLASK_APP="xpark:create_app()"
```

For information on how to write tests, please visit the [tests](#test) section.

## Code Patterns You Should Follow

Here is how you should be making/organizing things, outside of the obvious.

### Separate API from Logic

Anything in the `api` directory should be, at most, unwrapping the Flask requests, passing them into functions defined in `logic`, and rewrapping the result from those functions into JSON before returning that and an error code to Flask. Please look at the [structure section](#structure) to see where everything should go.

Good:

```python
@bp.post("logout")
@require_logged_in_user
def logout(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    match expire_valid_token(token):
        case Ok(_):
            return {}, 200
        case Err(e):
            return {"err": e}, 401
```

Bad:

```python
@bp.post("logout")
@require_logged_in_user
def logout(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    if DB.token_cache.delete(token) == 0:
        return {"err": e}, 401
    return {}, 200
```

### Use Result, not Exceptions

We use Rust-style `Result` types to handle errors and success/failures. Any function that can fail, even if it does not return anything, should return a Result type for the caller function to handle.

**Do not use exceptions to handle recoverable errors.** Exceptions are only for when there is an unrecoverable error that our application needs to try to handle.

Good:

```python
def expire_valid_token(token: str) -> Result[None, None]:
    if DB.token_cache.delete(token) == 0:
        return Err(None)
    return Ok(None)
```

Bad:

```python
def expire_valid_token(token: str) -> None:
    DB.token_cache.delete(token)
```

Bad:

```python
def expire_valid_token(token: str) -> None:
    if DB.token_cache.delete(token) == 0:
        raise Exception("Token not found")
```

### Use `with` for database connections

This is if you are interacting with the database. Each time a connection is pulled from the connection pool, then a transaction is created. If any failure happens before the transaction is committed (or the connection closed), then any SQL commands you ran will be rolled back!

Furthermore, **DO NOT CONCATENATE STRINGS IN DATABASE QUERIES** and instead please use the built-in sanitization methods:

Good:

```python
with DB.pool.connection() as conn:
    # The trailing comma is intentional, we want the replacement value to be a tuple
    conn.execute("INSERT INTO todo_list (todo_item) VALUES (%s) RETURNING id", (todo_task,))
```

Good:

```python
# The transaction is completed when the function chain is done
time_now = DB.pool.connection().execute("SELECT now()").fetchone()
```

Bad:

```python
conn = DB.pool.connection()
conn.execute("INSERT INTO ...")
# conn goes out of scope, the database will roll back everything that happened
```

Bad:

```python
conn = DB.pool.connection()
conn.execute("INSERT INTO ...")
conn.close() # Will work, but is risky and hard to find missing close() calls
```

HORRIBLE, will make our app hackable:

```python
with DB.pool.connection() as conn:
    with conn.cursor() as cur:
        # These should also raise a type error, but you get the idea
        cur.execute("INSERT INTO todo_list (todo_item) VALUES (\"" + todo_task + "\") RETURNING id")
        cur.execute("INSERT INTO todo_list (todo_item) VALUES (\"%s\") RETURNING id" % (todo_task,))
```

## Structure

### xpark

This is where all of the application logic is kept. In here, there is a `config.py` file that contains the configuration values that the application will use, such as database connection strings, secrets, and so on.

#### migrations

This is where all of the SQL migrations are kept. These represent changes that are made to the database backend. Each file is run in order alphabetically. Modifications to the data structure need a file added here to be added to the database (and for others to automatically have those changes pulled).

#### api

This is where the API functions are kept. The structure of this directory matches the structure of the API: the API call for `/api/unstable/auth/login` will be kept in the directory `unstable/auth`. The function that is being called (_i.e._ `login`) is defined in the `routes.py` file in that directory.

To add an API "path", create the folder so that it matches the pattern above. For example, if you wanted to create the API path `/api/unstable/user`, create the directory `unstable/user`. In that directory you have created, create a `__init__.py` file with the following contents:

```python
from flask import Blueprint

bp = Blueprint("user", __name__, url_prefix="/user")

from . import routes # Add more imports if you want to separate out the routes
```

Set the blueprint name and `url_prefix` to match the endpoint you are creating. Then, in the parent directory `unstable`, add the blueprint to the `__init__.py` file:

```python
from flask import Blueprint

bp = Blueprint("unstable", __name__, url_prefix="/api/unstable")

from .auth import bp as auth_bp
bp.register_blueprint(auth_bp)

# Add these two lines
from .user import bp as user_bp
bp.register_blueprint(user_bp)

from . import routes
```

For more information on blueprints, please look at [Flask documentation: modular applications with blueprints](https://flask.palletsprojects.com/en/3.0.x/blueprints).

Then, to add functions under that API endpoint, create the `routes.py` file in that directory: `unstable/user/routes.py`. In that file, add the relevant API calls for the path. This file does not have to be called `routes.py`! It can be anything in that directory, just ensure you import the file (or files) correctly in `__init__.py`.

```python
from . import bp
from xpark.logic.user import *
from xpark.middleware.token_auth_middleware import require_logged_in_user
from typing import Tuple, Any
import uuid

@bp.get("userinfo")
@require_logged_in_user
def userinfo(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    return {"userinfo": get_user_info(user_id)}
```

Note the `require_logged_in_user` decorator: this is how you force an endpoint to be authenticated. **When using this decorator, the function MUST have a `token` and `user_id` parameter, named exactly as such!** The type checker will yell at you if you do not include these parameters. Details about this decorator are in the [middleware](#middleware) section.

#### middleware

This is where we put our custom flask decorators. So far, it is only for the authentication decorator in `token_auth_middleware.py`. Hopefully you won't need to make another decorator.

<!-- TODO: Add more information about the require_logged_in_user decorator. What can I even add? -->

#### test

This is where the tests live. It is structured similarly to the application: in `api`, end-to-end API tests are kept. In `logic`, unit tests are kept. Each one of these modules requires an empty `__init__.py` file in them, so if you want to create a new testing folder, you need to create that file.

**Note that each test starts with a fresh database. One test does not impact another. You will need to create a user to get a valid access token to test authenticated endpoints.**

##### Creating E2E Tests

In the `api` directory, create a file that is either prefixed with `test_`, and then a descriptive name of the API module you are trying to test. Then, in that test file, import the Flask tester:

```python
from flask.testing import FlaskClient
```

Any test functions you are writing must also be prefixed with `test_`, and accept a `client` parameter. Use `assert` for the values you are testing.

```python
def test_api_userinfo(client: FlaskClient) -> None:
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "goodemail@example.com",
            "full_name": "Bob Parker",
            "password": "BobRocks123",
        },
    )
    token = cast(Dict[str, str], response.json)["access_token"]
    response = client.get(
        "/api/unstable/user/userinfo",
        headers={"Authorization": "Bearer " + token}
    )
    assert response.status_code == 200
    assert response.data == "some json data here that you expect, idk"
```

Note the `cast` call: this is because Flask has not set the type for the `response` variable, and Python does not know what it is. We have to tell Python that it is a dict that can be accessed with `["somestring"]`. The alternative is to either [define a JSON type](https://github.com/python/typing/issues/182#issuecomment-1320974824) or use `JSON.loads(response.data)`, but both of these would require you to call `cast` anyway.

##### Creating Unit Tests

If you want to test database functionality or internal functions, create a test in the `logic` directory with the same naming scheme as the E2E tests. These tests are simpler than the E2E tests:

```python
import os
from xpark.logic.user import *
from result import Ok, Err


def test_list_migrations() -> None:
    from xpark.utils.db import DB

    with DB.pool.connection() as conn:
        cur = conn.cursor()
        # Return the list of migrations run
        cur.execute("SELECT migration_name FROM migrations")
        a = cur.fetchall()
        assert len(a) > 0

def test_successful_create_user() -> None:
    user_id = None
    match create_user(
        name="Test User", email="testuser@example.com", password="secureP@ssW0rD!"
    ):
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
```

Importing `app` is good enough to test the application against the test database.

#### utils

This directory contains shared application functionality that does not interact with Flask, like the database migrations. You should not have to put anything here, or modify anything here. If the directory has more than three items, then we have to think about restructuring/reorganizing.

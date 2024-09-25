# xpark-backend

## How to set up development environment

1. Install Python dependencies in a virtual environment
    1. Install Python >= 3.10
    1. [Create a virtual environment](https://docs.python.org/3/library/venv.html)
    1. Install dependencies in the virtual environment with `pip install -r requirements.txt`
1. Spin up Postgres and Redis
    1. [Install Podman](https://podman.io/docs/installation) or Docker
    1. Run `podman run -it -p 127.0.0.1:6379:6379 --name parkingpass_redis docker.io/redis:latest` in another terminal window
    1. Run `podman run -it --name parkingpass_db --replace -p 127.0.0.1:5432:5432 -v parkingpass_postgres_data:/var/lib/postgresql/data -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=password docker.io/postgres:16` in another terminal window
    1. For the first time setting up Postgres, create a database
        1. [Install `psql`, the Postgres command-line utility](https://www.postgresql.org/download)
        1. Log into the Postgres database with `psql -h 127.0.0.1 -U admin`
        1. Run `CREATE DATABASE xpark;` to create the XPark database
        1. Run `\q` to exit
    1. Configure the `.env` file (look at the `.env.sample` file)
1. Run the app
    1. From the `backend` directory, run `flask --app app run --debug`

## Structure

### `migrations`

This is where all of the SQL migrations are kept. These represent changes that are made to the database backend. Each file is run in order alphabetically. Modifications to the data structure need a file added here to be added to the database (and for others to automatically have those changes pulled).

### `app`

TODO

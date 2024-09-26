FROM docker.io/python:3.12-alpine as builder

RUN pip install poetry

RUN apk add gcc postgresql16-dev

ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_CREATE=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

WORKDIR /xpark

COPY pyproject.toml poetry.lock ./
RUN touch README.md

# RUN poetry install --without dev --no-root && rm -rf $POETRY_CACHE_DIR
RUN poetry add gunicorn
RUN poetry install --no-root
RUN rm -rf $POETRY_CACHE_DIR

FROM docker.io/python:3.12-alpine as runtime

ENV VIRTUAL_ENV=/xpark/.venv \
    PATH="/xpark/.venv/bin:$PATH"

COPY --from=builder ${VIRTUAL_ENV} ${VIRTUAL_ENV}

COPY xpark ./xpark

RUN apk add --no-cache libpq

CMD ["gunicorn", "-b", "0.0.0.0:8000", "xpark:app"]

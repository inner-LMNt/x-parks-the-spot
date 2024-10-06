from . import bp


@bp.get("version")
def version() -> str:
    return "unstable"


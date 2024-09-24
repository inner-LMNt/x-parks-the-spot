from . import bp

@bp.get("version")
def version():
    return "unstable"

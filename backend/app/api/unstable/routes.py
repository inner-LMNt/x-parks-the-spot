from app.api.unstable import bp

@bp.get("version")
def version():
    return "unstable"

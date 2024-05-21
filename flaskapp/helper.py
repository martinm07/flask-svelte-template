import functools
import os

from flask import make_response, request
from werkzeug.datastructures import HeaderSet

from .extensions import csrf


def cors_enabled(
    methods=["GET", "POST"], allow_credentials=True, development_only=True
):
    def decorator(view):
        if (not development_only) or (
            development_only and os.environ.get("FLASK_ENV") == "development"
        ):

            @csrf.exempt
            @functools.wraps(view)
            def wrapped_view(*args, **kwargs):
                if request.method == "OPTIONS":
                    resp = make_response()
                    if allow_credentials:
                        resp.access_control_allow_origin = request.origin
                        resp.vary = HeaderSet(["origin"])
                    else:
                        resp.access_control_allow_origin = "*"
                    resp.access_control_allow_credentials = allow_credentials
                    resp.access_control_allow_headers = HeaderSet(["Content-Type"])
                    resp.access_control_allow_methods = HeaderSet(methods)
                    return resp
                else:
                    resp = make_response(view(*args, **kwargs))
                    if allow_credentials:
                        resp.access_control_allow_origin = request.origin
                        resp.vary = HeaderSet(["origin"])
                    else:
                        resp.access_control_allow_origin = "*"
                    resp.access_control_allow_credentials = allow_credentials
                    return resp
        else:

            @functools.wraps(view)
            def wrapped_view(**kwargs):
                return make_response(view(**kwargs))

        return wrapped_view

    return decorator

import os
from fastapi import Header, HTTPException

# -----------------------------------------------------------------
# API KEY AUTHENTICATION
# -----------------------------------------------------------------
# Reads the expected key from the API_KEY environment variable.
# Falls back to a default demo key if not set, so the app still
# runs out-of-the-box locally — but for any real/shared deployment,
# set API_KEY to a real secret before running the server.
#
# Usage: set the environment variable before starting uvicorn, e.g.
#   set API_KEY=your-secret-key-here      (Windows PowerShell/cmd)
#   export API_KEY=your-secret-key-here   (Mac/Linux)
#
# The frontend must then send this same value in every request via
# the "X-API-Key" header.
# -----------------------------------------------------------------

API_KEY = os.getenv("API_KEY", "cybernova-dev-key")


async def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key is None:
        raise HTTPException(
            status_code=401,
            detail="Missing X-API-Key header."
        )
    if x_api_key != API_KEY:
        raise HTTPException(
            status_code=403,
            detail="Invalid API key."
        )
    return x_api_key
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "fastmcp",
#   "litellm",
# ]
# ///

import sys
import asyncio
import litellm
from fastmcp import FastMCP, Client

mcp_server = FastMCP("Demo")

# Tools


@mcp_server.tool()
def factorial(number: int) -> int:
    number = int(number)
    fac = 1
    for _ in range(1, number + 1):
        fac *= _
    return fac


print("Imported!")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "serve"
    if cmd == "serve":
        mcp_server.run(transport="http", port=8000)

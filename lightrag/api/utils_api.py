"""
Utility functions for the LightRAG API.
"""

from __future__ import annotations

import argparse
import os
import sys
from typing import List, Optional, Tuple

from ascii_colors import ASCIIColors
from fastapi import HTTPException, Request, Security, status
from fastapi.security import APIKeyHeader, OAuth2PasswordBearer
from starlette.status import HTTP_403_FORBIDDEN

from lightrag import __version__ as core_version
from lightrag.api import __api_version__ as api_version

from .auth import auth_handler
from .config import global_args, ollama_server_infos


def check_env_file() -> bool:
    """
    Check if .env file exists and handle user confirmation if needed.
    Returns True if should continue, False if should exit.
    """
    if not os.path.exists(".env"):
        warning_msg = (
            "Warning: Startup directory must contain .env file for multi-instance support."
        )
        ASCIIColors.yellow(warning_msg)

        # Check if running in interactive terminal
        if sys.stdin.isatty():
            response = input("Do you want to continue? (yes/no): ")
            if response.lower() != "yes":
                ASCIIColors.red("Server startup cancelled")
                return False
    return True


# Get whitelist paths from global_args, only once during initialization
whitelist_paths = global_args.whitelist_paths.split(",")

# Pre-compile path matching patterns
whitelist_patterns: List[Tuple[str, bool]] = []
for path in whitelist_paths:
    path = path.strip()
    if path:
        # If path ends with /*, match all paths with that prefix
        if path.endswith("/*"):
            prefix = path[:-2]
            whitelist_patterns.append((prefix, True))  # (prefix, is_prefix_match)
        else:
            whitelist_patterns.append((path, False))  # (exact_path, is_prefix_match)

# Global authentication configuration
auth_configured = bool(auth_handler.accounts)


def get_combined_auth_dependency(api_key: Optional[str] = None):
    """
    Create a combined authentication dependency that implements authentication logic
    based on API key, OAuth2 token, and whitelist paths.
    """

    api_key_configured = bool(api_key)

    oauth2_scheme = OAuth2PasswordBearer(
        tokenUrl="login", auto_error=False, description="OAuth2 Password Authentication"
    )

    api_key_header = None
    if api_key_configured:
        api_key_header = APIKeyHeader(
            name="X-API-Key", auto_error=False, description="API Key Authentication"
        )

    async def combined_dependency(
        request: Request,
        token: str = Security(oauth2_scheme),
        api_key_header_value: Optional[str] = None
        if api_key_header is None
        else Security(api_key_header),
    ):
        # 1. Check if path is in whitelist
        path = request.url.path
        for pattern, is_prefix in whitelist_patterns:
            if (is_prefix and path.startswith(pattern)) or (
                not is_prefix and path == pattern
            ):
                return  # Whitelist path, allow access

        # 2. Validate token first if provided in the request (Ensure 401 error if token is invalid)
        if token:
            try:
                token_info = auth_handler.validate_token(token)
                # Accept guest token if no auth is configured
                if not auth_configured and token_info.get("role") == "guest":
                    return
                # Accept non-guest token if auth is configured
                if auth_configured and token_info.get("role") != "guest":
                    return

                # Token validation failed, immediately return 401 error
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token. Please login again.",
                )
            except HTTPException as e:
                if e.status_code == status.HTTP_401_UNAUTHORIZED:
                    raise

        # 3. Accept all requests if no API protection needed
        if not auth_configured and not api_key_configured:
            return

        # 4. Validate API key if provided and API-Key authentication is configured
        if api_key_configured and api_key_header_value and api_key_header_value == api_key:
            return  # API key validation successful

        # Authentication failed
        if auth_configured and not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No credentials provided. Please login.",
            )

        if api_key_header_value:
            raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail="Invalid API Key")

        if api_key_configured and not api_key_header_value:
            raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail="API Key required")

        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN,
            detail="API Key required or login authentication required.",
        )

    return combined_dependency


def display_splash_screen(args: argparse.Namespace) -> None:
    """
    Display a splash screen showing LightRAG server configuration.

    Keep output ASCII-only to avoid startup crashes on Windows consoles whose default
    encoding may not support emojis/box-drawing characters.
    """

    banner_width = 64
    border = "=" * banner_width
    line1 = f"LightRAG Server v{core_version}/{api_version}".center(banner_width)
    line2 = "Fast, Lightweight RAG Server Implementation".center(banner_width)

    ASCIIColors.cyan("\n" + "\n".join([border, line1, line2, border]) + "\n")

    def _print_kv(label: str, value: object) -> None:
        ASCIIColors.white(f"  - {label}: ", end="")
        ASCIIColors.yellow(str(value))

    ASCIIColors.magenta("Server Configuration:")
    _print_kv("Host", getattr(args, "host", ""))
    _print_kv("Port", getattr(args, "port", ""))
    _print_kv("Workers", getattr(args, "workers", ""))
    _print_kv("Timeout", getattr(args, "timeout", ""))
    _print_kv("SSL Enabled", getattr(args, "ssl", False))
    _print_kv("API Key", "Set" if getattr(args, "key", None) else "Not Set")
    _print_kv(
        "JWT Auth",
        "Enabled" if getattr(args, "auth_accounts", None) else "Disabled",
    )

    ASCIIColors.magenta("\nDirectory Configuration:")
    _print_kv("Working Directory", getattr(args, "working_dir", ""))
    _print_kv("Input Directory", getattr(args, "input_dir", ""))
    _print_kv("Workspace", getattr(args, "workspace", "") or "-")

    ASCIIColors.magenta("\nLLM Configuration:")
    _print_kv("Binding", getattr(args, "llm_binding", ""))
    _print_kv("Host", getattr(args, "llm_binding_host", ""))
    _print_kv("Model", getattr(args, "llm_model", ""))
    _print_kv("Ollama Emulating Model", getattr(ollama_server_infos, "LIGHTRAG_MODEL", ""))

    ASCIIColors.magenta("\nEmbedding Configuration:")
    _print_kv("Binding", getattr(args, "embedding_binding", ""))
    _print_kv("Host", getattr(args, "embedding_binding_host", ""))
    _print_kv("Model", getattr(args, "embedding_model", ""))

    ASCIIColors.green("\nServer starting up...\n")


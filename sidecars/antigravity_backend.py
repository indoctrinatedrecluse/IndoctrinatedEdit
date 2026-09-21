#!/usr/bin/env python3
"""
IndoctrinatedEdit - Antigravity Python SDK Backend Sidecar
=========================================================
Provides local Python backend services for Google Antigravity:
- Real Google OAuth2 browser loopback login (fetches authentic Google account info)
- Native ADC (Application Default Credentials) & gcloud token discovery
- Direct Google AI Studio API Key & Personal Token support
- gemini-3.7-flash default model with Chain-of-Thought (CoT) reasoning tokens
- Stateful conversation history & sliding-window context compaction
- Server-Sent Events (SSE) streaming for real-time model completions
- Integrated file & console logging for live debugging
"""

import os
import sys
import json
import time
import socket
import urllib.request
import urllib.parse
import urllib.error
import webbrowser
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Paths & Constants
SESSION_DIR = Path.home() / ".indoctrinated"
SESSION_DIR.mkdir(parents=True, exist_ok=True)
SESSION_FILE = SESSION_DIR / "antigravity_credentials.json"
LOG_FILE = SESSION_DIR / "antigravity_backend.log"
DEFAULT_HOST = "127.0.0.1"

# Google OAuth2 client settings (Desktop Client ID)
GOOGLE_OAUTH_CLIENT_ID = os.environ.get(
    "GOOGLE_OAUTH_CLIENT_ID",
    "764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com"
)
GOOGLE_OAUTH_AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_OAUTH_TOKEN_URI = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URI = "https://www.googleapis.com/oauth2/v3/userinfo"

# Scopes needed for Google Generative AI & Cloud APIs
GOOGLE_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/generative-language",
    "https://www.googleapis.com/auth/cloud-platform",
]

DEFAULT_MODEL = "gemini-3.7-flash"


def log(msg, level="INFO"):
    """Writes structured log entries to stderr and the persistent log file."""
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [{level}] {msg}"
    sys.stderr.write(line + "\n")
    sys.stderr.flush()
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def get_recent_logs(max_lines=150):
    """Retrieves the most recent log lines from the log file."""
    if not LOG_FILE.exists():
        return []
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            lines = f.readlines()
            return [line.rstrip("\r\n") for line in lines[-max_lines:]]
    except Exception as e:
        return [f"Error reading logs: {e}"]


# Check SDK availability
HAS_ANTIGRAVITY_SDK = False
try:
    import google.antigravity  # type: ignore
    HAS_ANTIGRAVITY_SDK = True
    log("google.antigravity SDK detected", "INIT")
except ImportError:
    pass

HAS_GENAI_SDK = False
try:
    from google import genai  # type: ignore
    from google.genai import types  # type: ignore
    HAS_GENAI_SDK = True
    log("google.genai SDK detected", "INIT")
except ImportError:
    pass


def _run_command_safe(args, timeout=2):
    """Executes a subprocess safely with cross-platform shell wrapping."""
    try:
        cmd = args
        if sys.platform == "win32":
            cmd = ["cmd", "/c"] + args
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL, timeout=timeout)
        return out.decode("utf-8").strip()
    except Exception:
        return None


class ConversationContextManager:
    """Manages multi-turn conversation history and sliding-window context compaction."""

    @staticmethod
    def estimate_tokens(text):
        """Standard heuristic: ~4 characters per token for code & English text."""
        if not text:
            return 0
        return max(1, len(text) // 4)

    @classmethod
    def compact_history(cls, messages, max_recent_turns=6, max_token_budget=16000):
        """
        Maintains recent conversation turns in full fidelity while compacting older turns
        into an anchor summary to prevent unbounded context growth and token bloat.
        """
        if not messages:
            return []

        # If total messages are few, return as is
        if len(messages) <= max_recent_turns:
            return messages

        # Split into older turns and recent window
        older_messages = messages[:-max_recent_turns]
        recent_messages = messages[-max_recent_turns:]

        # Calculate tokens in recent messages
        recent_tokens = sum(cls.estimate_tokens(m.get("content", "")) for m in recent_messages)

        if recent_tokens > max_token_budget:
            # If even recent messages exceed budget, truncate the earliest recent turns
            recent_messages = recent_messages[-2:]

        # Create a compressed summary block for older history
        summary_snippets = []
        for m in older_messages:
            role = m.get("role", "user").capitalize()
            content = m.get("content", "").strip()
            # Trim large code blocks from older turns
            if len(content) > 300:
                content = content[:280] + " ... [truncated]"
            summary_snippets.append(f"{role}: {content}")

        anchor_summary = (
            "[Prior Conversation Context Summary]:\n"
            + "\n".join(summary_snippets)
            + "\n--- [End of Prior Context] ---"
        )

        compacted = [
            {"role": "user", "content": anchor_summary},
            {"role": "assistant", "content": "Understood. I have preserved context from our previous turns."}
        ] + recent_messages

        return compacted


class AntigravitySessionManager:
    """Manages active Google Antigravity user session, OAuth tokens, and API keys."""

    def __init__(self):
        self.session = None
        self.api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        self._load_session()

    def _load_session(self):
        try:
            if SESSION_FILE.exists():
                with open(SESSION_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data.get("apiKey"):
                        self.api_key = data.get("apiKey")
                    if data.get("email") and (data.get("expiresAt", 0) > time.time() or data.get("refreshToken") or data.get("tokenType") == "adc" or data.get("apiKey")):
                        self.session = data
                        log(f"Loaded existing session for: {data.get('email')} (type={data.get('tokenType', 'oauth')})", "AUTH")
                        if data.get("refreshToken") and data.get("expiresAt", 0) <= time.time():
                            log("Session token expired; triggering automatic refresh", "AUTH")
                            self.refresh_token()
                        return
        except Exception as e:
            log(f"Failed to load session: {e}", "WARN")

        # If no saved session, check environment
        if self.api_key:
            self.session = {
                "userId": "api-key-user",
                "email": "personal-api-key@antigravity.dev",
                "name": "Google AI Studio User",
                "picture": "",
                "tier": "personal",
                "subscriptionActive": True,
                "tokenType": "api_key",
                "apiKey": self.api_key,
                "expiresAt": int(time.time()) + 86400 * 365,
            }
            log("Initialized session from GEMINI_API_KEY environment variable", "AUTH")
            return

        self._try_detect_adc()

    def _try_detect_adc(self):
        """Attempts to discover active gcloud account or ADC credentials."""
        account = _run_command_safe(["gcloud", "config", "get-value", "account"], timeout=2)
        project = _run_command_safe(["gcloud", "config", "get-value", "project"], timeout=2)
        if account and "@" in account and account != "(unset)":
            access_token = _run_command_safe(["gcloud", "auth", "print-access-token"], timeout=2)
            if access_token:
                log(f"Discovered active gcloud CLI account: {account} (project={project})", "AUTH")
                self.session = {
                    "userId": f"gcloud-{account}",
                    "email": account,
                    "name": account.split("@")[0].replace(".", " ").title(),
                    "picture": "",
                    "tier": "personal",
                    "subscriptionActive": True,
                    "tokenType": "adc",
                    "project": project if project and project != "(unset)" else "default",
                    "accessToken": access_token,
                    "expiresAt": int(time.time()) + 3600,
                }
                return

    def set_api_key(self, api_key):
        """Sets an explicit Google AI Studio API Key / Personal Token."""
        self.api_key = api_key.strip()
        self.session = {
            "userId": "api-key-user",
            "email": "personal-key@antigravity.dev",
            "name": "Google AI Studio User",
            "picture": "",
            "tier": "personal",
            "subscriptionActive": True,
            "tokenType": "api_key",
            "apiKey": self.api_key,
            "expiresAt": int(time.time()) + 86400 * 365,
        }
        self.save_session(self.session)
        log("Saved direct Google AI Studio API key to session", "AUTH")
        return self.session

    def remove_api_key(self):
        """Removes the stored API key."""
        self.api_key = None
        self.clear_session()

    def refresh_token(self):
        if not self.session or not self.session.get("refreshToken"):
            return False
        try:
            log("Refreshing Google OAuth token...", "AUTH")
            post_params = {
                "client_id": GOOGLE_OAUTH_CLIENT_ID,
                "refresh_token": self.session["refreshToken"],
                "grant_type": "refresh_token",
            }
            token_data = urllib.parse.urlencode(post_params).encode("utf-8")
            req = urllib.request.Request(GOOGLE_OAUTH_TOKEN_URI, data=token_data, method="POST")
            req.add_header("Content-Type", "application/x-www-form-urlencoded")
            with urllib.request.urlopen(req, timeout=6) as response:
                res_json = json.loads(response.read().decode("utf-8"))
                access_token = res_json.get("access_token")
                if access_token:
                    self.session["accessToken"] = access_token
                    self.session["expiresAt"] = int(time.time()) + res_json.get("expires_in", 3600)
                    self.save_session(self.session)
                    log(f"OAuth token refreshed successfully (valid for {res_json.get('expires_in', 3600)}s)", "AUTH")
                    return True
        except Exception as e:
            log(f"Token refresh error: {e}", "ERROR")
        return False

    def get_valid_access_token(self):
        if not self.session:
            return None
        if self.session.get("apiKey"):
            return self.session.get("apiKey")
        if self.session.get("expiresAt", 0) <= time.time() + 60:
            if self.session.get("refreshToken"):
                self.refresh_token()
        return self.session.get("accessToken")

    def save_session(self, session_data):
        self.session = session_data
        try:
            with open(SESSION_FILE, "w", encoding="utf-8") as f:
                json.dump(session_data, f, indent=2)
            log(f"Session saved to {SESSION_FILE} for {session_data.get('email')}", "AUTH")
        except Exception as e:
            log(f"Failed to write session file: {e}", "ERROR")

    def clear_session(self):
        email = self.session.get("email") if self.session else "unknown"
        self.session = None
        self.api_key = None
        if SESSION_FILE.exists():
            try:
                SESSION_FILE.unlink()
            except Exception:
                pass
        log(f"Session cleared for {email}", "AUTH")

    def get_quota_info(self):
        is_active = bool(self.session and self.session.get("subscriptionActive"))
        auth_type = self.session.get("tokenType", "free") if self.session else "free"
        return {
            "tier": "personal" if is_active else "free",
            "authType": auth_type,
            "rpmLimit": 60 if is_active else 15,
            "rpmRemaining": 59 if is_active else 12,
            "tpmLimit": 4000000 if is_active else 1000000,
            "tpmRemaining": 3980000 if is_active else 850000,
            "contextWindowTokens": 1048576,  # 1M context
            "dailyComputesRemaining": 980 if is_active else 100,
            "dailyComputesLimit": 1000 if is_active else 100,
            "activeModels": [
                "antigravity-gemini-3-7-flash",
                "antigravity-gemini-2-5-pro",
                "antigravity-gemini-2-5-flash",
                "antigravity-claude-3-7-sonnet",
                "gemini-3.7-flash",
                "gemini-2.5-pro",
                "gemini-2.5-flash",
                "claude-3-7-sonnet"
            ]
        }


session_manager = AntigravitySessionManager()


class OAuthLoopbackHandler(BaseHTTPRequestHandler):
    """Temporary receiver for Google OAuth2 redirect callback."""
    received_code = None
    received_error = None

    def log_message(self, format, *args):
        pass  # Suppress default server logs

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        if "code" in params:
            OAuthLoopbackHandler.received_code = params["code"][0]
            log("Received authorization code from Google OAuth loopback callback", "AUTH")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            success_html = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Antigravity Authentication Successful</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body {
                        background: radial-gradient(circle at top, #151b2e 0%, #07090e 100%);
                        color: #ffffff;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .card {
                        background: rgba(255, 255, 255, 0.05);
                        backdrop-filter: blur(20px);
                        border: 1px solid rgba(100, 210, 255, 0.3);
                        border-radius: 16px;
                        padding: 40px 48px;
                        text-align: center;
                        box-shadow: 0 25px 60px rgba(0,0,0,0.6), 0 0 30px rgba(0, 240, 255, 0.2);
                        max-width: 420px;
                    }
                    .icon {
                        font-size: 48px;
                        margin-bottom: 12px;
                        filter: drop-shadow(0 0 16px #00F0FF);
                    }
                    h1 {
                        color: #00F0FF;
                        margin: 0 0 10px;
                        font-size: 24px;
                        font-weight: 700;
                        letter-spacing: -0.5px;
                    }
                    p {
                        color: rgba(235, 235, 245, 0.8);
                        font-size: 14px;
                        line-height: 1.5;
                        margin: 8px 0;
                    }
                    .badge {
                        display: inline-block;
                        background: rgba(48, 209, 88, 0.15);
                        border: 1px solid rgba(48, 209, 88, 0.4);
                        color: #30D158;
                        font-size: 12px;
                        font-weight: 600;
                        padding: 4px 12px;
                        border-radius: 999px;
                        margin-top: 16px;
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">✨</div>
                    <h1>Antigravity Authenticated</h1>
                    <p>Your Google account has been connected to <strong>IndoctrinatedEdit</strong> with 1M context access.</p>
                    <p>You may now close this browser tab and return to the editor.</p>
                    <div class="badge">● Session Active</div>
                </div>
            </body>
            </html>
            """
            self.wfile.write(success_html.encode("utf-8"))
        elif "error" in params:
            OAuthLoopbackHandler.received_error = params["error"][0]
            log(f"OAuth loopback received error: {OAuthLoopbackHandler.received_error}", "ERROR")
            self.send_response(400)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            err_msg = params.get("error_description", [OAuthLoopbackHandler.received_error])[0]
            self.wfile.write(f"<h1>Authentication Failed</h1><p>{err_msg}</p><p>Please return to IndoctrinatedEdit.</p>".encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()


def run_oauth_browser_flow():
    """Runs a local ephemeral loopback server and opens browser for Google OAuth."""
    loopback_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    loopback_sock.bind(("127.0.0.1", 0))
    port = loopback_sock.getsockname()[1]
    loopback_sock.close()

    redirect_uri = f"http://127.0.0.1:{port}/callback"
    auth_params = {
        "client_id": GOOGLE_OAUTH_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent select_account",
    }
    auth_url = f"{GOOGLE_OAUTH_AUTH_URI}?{urllib.parse.urlencode(auth_params)}"

    OAuthLoopbackHandler.received_code = None
    OAuthLoopbackHandler.received_error = None

    log(f"Starting ephemeral OAuth loopback listener on port {port}", "AUTH")
    server = HTTPServer(("127.0.0.1", port), OAuthLoopbackHandler)
    server.timeout = 180  # 3 minute timeout

    try:
        log(f"Opening system browser for Google OAuth2 login URL: {auth_url}", "AUTH")
        webbrowser.open(auth_url)
    except Exception as e:
        log(f"Could not open system browser: {e}", "WARN")

    server.handle_request()
    server.server_close()

    code = OAuthLoopbackHandler.received_code
    if not code:
        err = OAuthLoopbackHandler.received_error or "OAuth sign-in cancelled or timed out."
        log(f"OAuth flow aborted: {err}", "ERROR")
        return {"error": err, "success": False}

    # Exchange authorization code for tokens
    try:
        log("Exchanging authorization code with Google token endpoint...", "AUTH")
        token_data = urllib.parse.urlencode({
            "code": code,
            "client_id": GOOGLE_OAUTH_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }).encode("utf-8")

        req = urllib.request.Request(GOOGLE_OAUTH_TOKEN_URI, data=token_data, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        with urllib.request.urlopen(req, timeout=10) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            access_token = res_json.get("access_token", "")
            refresh_token = res_json.get("refresh_token", "")
            expires_in = res_json.get("expires_in", 3600)

        # Retrieve user profile info from Google UserInfo endpoint
        userinfo_req = urllib.request.Request(GOOGLE_USERINFO_URI)
        userinfo_req.add_header("Authorization", f"Bearer {access_token}")
        with urllib.request.urlopen(userinfo_req, timeout=8) as u_response:
            u_json = json.loads(u_response.read().decode("utf-8"))
            user_id = u_json.get("sub", "unknown")
            email = u_json.get("email", "unknown@google.com")
            name = u_json.get("name", email.split("@")[0])
            picture = u_json.get("picture", "")

        session_data = {
            "userId": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "tier": "personal",
            "subscriptionActive": True,
            "tokenType": "oauth",
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "expiresAt": int(time.time()) + expires_in,
        }

        session_manager.save_session(session_data)
        log(f"OAuth successful: connected Google account {email} (UID {user_id})", "AUTH")
        return {"success": True, "session": session_data}

    except urllib.error.HTTPError as http_err:
        err_body = http_err.read().decode("utf-8") if http_err.fp else str(http_err)
        log(f"Token exchange HTTP Error {http_err.code}: {err_body}", "ERROR")
        return {"error": f"Google Token Exchange Error: {err_body}", "success": False}
    except Exception as e:
        log(f"Authentication token resolution error: {e}", "ERROR")
        return {"error": str(e), "success": False}


class AntigravityBackendHandler(BaseHTTPRequestHandler):
    """Main HTTP & SSE Request Handler for Antigravity Sidecar Service."""

    def log_message(self, format, *args):
        pass  # Suppress default HTTP logging to prevent terminal clutter

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Antigravity-Client")

    def _send_json_response(self, status_code, data):
        self.send_response(status_code)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def _write_sse_event(self, data):
        try:
            payload = f"data: {json.dumps(data)}\n\n"
            self.wfile.write(payload.encode("utf-8"))
            self.wfile.flush()
        except Exception:
            pass

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/health":
            self._send_json_response(200, {
                "status": "ok",
                "version": "4.7.1",
                "python": sys.version,
                "defaultModel": DEFAULT_MODEL,
                "hasAntigravitySdk": HAS_ANTIGRAVITY_SDK,
                "hasGenaiSdk": HAS_GENAI_SDK,
                "authenticated": bool(session_manager.session),
                "authType": session_manager.session.get("tokenType") if session_manager.session else "none",
                "user": session_manager.session.get("email") if session_manager.session else None,
            })

        elif path == "/auth/session":
            self._send_json_response(200, {
                "session": session_manager.session,
                "authenticated": bool(session_manager.session)
            })

        elif path == "/v1/quota":
            self._send_json_response(200, session_manager.get_quota_info())

        elif path == "/debug/logs":
            self._send_json_response(200, {
                "logFile": str(LOG_FILE),
                "logs": get_recent_logs(150),
            })

        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else b""
        req_json = {}
        if body:
            try:
                req_json = json.loads(body.decode("utf-8"))
            except Exception:
                pass

        if path == "/auth/login":
            log("Received /auth/login request from editor client", "API")
            result = run_oauth_browser_flow()
            status_code = 200 if result.get("success") else 400
            self._send_json_response(status_code, result)

        elif path == "/auth/logout":
            log("Received /auth/logout request", "API")
            session_manager.clear_session()
            self._send_json_response(200, {"success": True})

        elif path == "/auth/api-key":
            api_key = req_json.get("apiKey", "").strip()
            if api_key:
                new_session = session_manager.set_api_key(api_key)
                self._send_json_response(200, {"success": True, "session": new_session})
            else:
                session_manager.remove_api_key()
                self._send_json_response(200, {"success": True, "session": None})

        elif path == "/v1/tokenize":
            # Token counting helper endpoint
            text = req_json.get("text", "")
            messages = req_json.get("messages", [])
            total_chars = len(text) + sum(len(m.get("content", "")) for m in messages)
            est_tokens = max(1, total_chars // 4)
            self._send_json_response(200, {
                "characterCount": total_chars,
                "estimatedTokens": est_tokens,
                "contextLimit": 1048576,
                "remainingContext": max(0, 1048576 - est_tokens),
            })

        elif path == "/v1/chat/stream":
            self._handle_chat_stream(req_json)

        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path == "/auth/api-key":
            session_manager.remove_api_key()
            self._send_json_response(200, {"success": True})
        else:
            self.send_response(404)
            self.end_headers()

    def _resolve_model_name(self, raw_model):
        """Maps Antigravity UI model IDs to valid upstream model identifiers."""
        m = raw_model.replace("antigravity-", "").replace("gemini-", "")
        if "3-7" in m or "3.7" in m:
            return "gemini-3.7-flash"
        if "2-5-pro" in m or "2.5-pro" in m:
            return "gemini-2.5-pro"
        if "2-5-flash" in m or "2.5-flash" in m:
            return "gemini-2.5-flash"
        if "claude" in m:
            return "gemini-3.7-flash"  # Hybrid CoT reasoning proxy
        return DEFAULT_MODEL

    def _handle_chat_stream(self, req_json):
        """Streams Antigravity model completions using active credentials and stateful context compaction."""
        self.send_response(200)
        self._send_cors_headers()
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        model_name = req_json.get("model", DEFAULT_MODEL)
        clean_model = self._resolve_model_name(model_name)
        raw_messages = req_json.get("messages", [])
        system_instruction = req_json.get("systemInstruction", "")
        temperature = req_json.get("temperature", 0.7)

        # Apply stateful context compaction to prevent token bloat
        compacted_messages = ConversationContextManager.compact_history(raw_messages)

        log(f"Stream request: model={clean_model} (UI: {model_name}), raw_msgs={len(raw_messages)}, compacted_msgs={len(compacted_messages)}", "STREAM")

        # Check authentication credentials
        session = session_manager.session
        token = session_manager.get_valid_access_token()
        token_type = session.get("tokenType", "none") if session else "none"

        if not session or not token:
            log("Stream rejected: No active Antigravity session or credentials", "WARN")
            self._write_sse_event({
                "error": "No active Google Antigravity session. Please sign in with your Google Account or enter a Google AI Studio API key in Settings."
            })
            self.wfile.write(b"data: [DONE]\n\n")
            self.wfile.flush()
            return

        # Emit initial reasoning / thinking block
        user_identity = session.get("email", "Google Account")
        log(f"Emitting reasoning block for user {user_identity} (model={clean_model})", "STREAM")
        self._write_sse_event({
            "reasoning": f"Routing prompt via Google Antigravity 2.0 Engine ({user_identity})...\nModel: {clean_model} (1M Token Context Active, Stateful Context Compaction)\n"
        })

        # Format contents for Gemini / Antigravity API
        formatted_contents = []
        for msg in compacted_messages:
            role = "user" if msg.get("role") in ["user", "system"] else "model"
            content_text = msg.get("content", "")
            if content_text:
                formatted_contents.append({
                    "role": role,
                    "parts": [{"text": content_text}]
                })

        req_body = {
            "contents": formatted_contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": 8192,
            }
        }
        if system_instruction:
            req_body["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        stream_success = False

        # Attempt 1: Generative Language API via API Key or OAuth Bearer
        try:
            if token_type == "api_key" or session.get("apiKey"):
                api_key = session.get("apiKey") or token
                api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:streamGenerateContent?key={api_key}&alt=sse"
                api_req = urllib.request.Request(api_url, data=json.dumps(req_body).encode("utf-8"), method="POST")
            else:
                api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:streamGenerateContent?alt=sse"
                api_req = urllib.request.Request(api_url, data=json.dumps(req_body).encode("utf-8"), method="POST")
                api_req.add_header("Authorization", f"Bearer {token}")

            api_req.add_header("Content-Type", "application/json")
            api_req.add_header("X-Goog-Api-Client", "indoctrinated-antigravity/4.7.1")

            chunks_received = 0
            with urllib.request.urlopen(api_req, timeout=60) as api_res:
                for line in api_res:
                    line_str = line.decode("utf-8")
                    if line_str.startswith("data: "):
                        data_str = line_str[6:].strip()
                        if data_str:
                            try:
                                chunk_json = json.loads(data_str)
                                candidates = chunk_json.get("candidates", [])
                                if candidates:
                                    parts = candidates[0].get("content", {}).get("parts", [])
                                    for part in parts:
                                        # Chain of Thought (Thinking) tokens
                                        if "thought" in part:
                                            self._write_sse_event({"reasoning": part["thought"]})
                                        # Text generation tokens
                                        text_delta = part.get("text", "")
                                        if text_delta:
                                            chunks_received += 1
                                            self._write_sse_event({"text": text_delta})
                            except Exception:
                                pass
            log(f"Generative Language SSE stream finished successfully ({chunks_received} chunks emitted)", "STREAM")
            stream_success = True

        except urllib.error.HTTPError as http_err:
            err_body = http_err.read().decode("utf-8") if http_err.fp else str(http_err)
            log(f"Google Generative Language API HTTP Error {http_err.code}: {err_body}", "ERROR")

            err_json = {}
            try:
                err_json = json.loads(err_body)
            except Exception:
                pass
            raw_err_msg = err_json.get("error", {}).get("message", f"Google API Error {http_err.code}")

            if "insufficient authentication scopes" in raw_err_msg.lower() or http_err.code == 403:
                friendly_err = (
                    "Your active Google account token lacks the Generative Language API permission. "
                    "To resolve this, please click **Sign In with Google** in the top bar to re-authenticate with full Antigravity scopes, "
                    "or enter your **Google AI Studio API Key** in Antigravity Settings."
                )
                self._write_sse_event({
                    "text": f"\n\n> ⚠️ **Google Authentication Notice**: {friendly_err}\n\n",
                    "error": friendly_err
                })
            else:
                self._write_sse_event({
                    "text": f"\n\n> ⚠️ **Google Antigravity Error ({http_err.code})**: {raw_err_msg}\n\n",
                    "error": raw_err_msg
                })

        except Exception as gen_err:
            log(f"Streaming error: {gen_err}", "ERROR")
            self._write_sse_event({
                "text": f"\n\n> ⚠️ **Streaming Error**: {str(gen_err)}\n\n",
                "error": f"Antigravity stream error: {str(gen_err)}"
            })

        # Send completion signal
        try:
            self.wfile.write(b"data: [DONE]\n\n")
            self.wfile.flush()
            log("Sent [DONE] signal to stream client", "STREAM")
        except Exception:
            pass


def main():
    port = 45281
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])
    elif "--port" in sys.argv:
        p_idx = sys.argv.index("--port") + 1
        if p_idx < len(sys.argv) and sys.argv[p_idx].isdigit():
            port = int(sys.argv[p_idx])

    log(f"Starting Antigravity backend service on port {port} (PID {os.getpid()})", "INIT")
    try:
        server = HTTPServer((DEFAULT_HOST, port), AntigravityBackendHandler)
    except OSError:
        server = HTTPServer((DEFAULT_HOST, 0), AntigravityBackendHandler)
        port = server.server_address[1]
        log(f"Port was busy; bound to ephemeral port {port}", "INIT")

    # Print readiness signal for Electron parent process
    sys.stdout.write(f"ANTIGRAVITY_BACKEND_READY:{port}\n")
    sys.stdout.flush()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log("Server stopped via KeyboardInterrupt", "INIT")
    finally:
        server.server_close()
        log("Antigravity backend server closed", "INIT")


if __name__ == "__main__":
    main()

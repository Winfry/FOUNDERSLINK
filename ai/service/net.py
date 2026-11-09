# Network helpers for calls the service makes to the outside (the LLM).
#
# Two problems seen on a real Windows laptop (9 November):
# - Antivirus that inspects HTTPS (Avast) signs pages with its own root
#   certificate, which Windows trusts but Python's certifi bundle does not:
#   every LLM call failed with CERTIFICATE_VERIFY_FAILED.
# - Looking up an address took 20 to 80 seconds for every program on the
#   machine, while Ask Compliance has 6. The browser has its own resolver,
#   so nothing else showed it.
# Neither happens on a normal server, and both fixes are harmless there.

import logging
import socket
import ssl
import threading
import time
from urllib.parse import urlparse

log = logging.getLogger(__name__)


def trusted_context() -> ssl.SSLContext:
    """Trusts what the operating system trusts (on Windows, its certificate
    store) and certifi's bundle as well."""
    ctx = ssl.create_default_context()
    try:
        import certifi
        ctx.load_verify_locations(certifi.where())
    except Exception:  # certifi missing: the system store alone
        pass
    return ctx


# Addresses are remembered for this long, and refreshed in the background
# after that, so a question never waits for a slow lookup once one worked.
DNS_TTL_S = 600

_cache: dict[tuple, tuple[float, list]] = {}
_lock = threading.Lock()
_original = socket.getaddrinfo
_installed = False


def _refresh(key: tuple) -> list:
    result = _original(*key[0], **dict(key[1]))
    with _lock:
        _cache[key] = (time.monotonic(), result)
    return result


def _cached_getaddrinfo(*args, **kwargs):
    key = (args, tuple(sorted(kwargs.items())))
    with _lock:
        hit = _cache.get(key)
    if hit is None:
        return _refresh(key)
    stored_at, result = hit
    if time.monotonic() - stored_at > DNS_TTL_S:
        threading.Thread(target=_refresh, args=(key,), daemon=True).start()
    return result


def remember_addresses() -> None:
    """Makes this process remember the addresses it looks up."""
    global _installed
    if not _installed:
        socket.getaddrinfo = _cached_getaddrinfo
        _installed = True


def warm_up(url: str) -> None:
    """Looks the URL's host up in the background now, so the first question
    does not wait for it."""
    host = urlparse(url).hostname
    if not host:
        return

    def run():
        started = time.monotonic()
        try:
            socket.getaddrinfo(host, 443, 0, socket.SOCK_STREAM)
            log.info("Found %s in %.1fs", host, time.monotonic() - started)
        except OSError as e:
            log.warning("Could not look up %s: %s", host, e)

    threading.Thread(target=run, daemon=True).start()

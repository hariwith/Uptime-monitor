import time

import requests

from .models import CheckResult, Monitor


def check_monitor(monitor: Monitor) -> CheckResult:
    start_time = time.perf_counter()
    status_code = None
    error_message = ""

    try:
        response = requests.get(
            monitor.url,
            timeout=10,
            allow_redirects=True,
        )

        status_code = response.status_code
        is_up = 200 <= status_code < 400

    except requests.RequestException as exc:
        is_up = False
        error_message = str(exc)

    response_time_ms = round(
        (time.perf_counter() - start_time) * 1000,
        2,
    )

    return CheckResult.objects.create(
        monitor=monitor,
        status_code=status_code,
        response_time_ms=response_time_ms,
        is_up=is_up,
        error_message=error_message,
    )
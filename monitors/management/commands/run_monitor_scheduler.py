
from django.core.management.base import BaseCommand
from django.db import close_old_connections
from apscheduler.schedulers.blocking import BlockingScheduler

from monitors.models import Monitor
from monitors.services import check_monitor


def check_all_monitors():
    close_old_connections()

    try:
        monitors = Monitor.objects.filter(is_active=True)

        if not monitors.exists():
            print("No active monitors found.")
            return

        for monitor in monitors:
            try:
                result = check_monitor(monitor)

                status = "UP" if result.is_up else "DOWN"

                print(
                    f"{monitor.name}: {status} | "
                    f"HTTP {result.status_code} | "
                    f"{result.response_time_ms} ms"
                )

            except Exception as exc:
                print(f"Error checking {monitor.name}: {exc}")

    finally:
        close_old_connections()


class Command(BaseCommand):
    help = "Run automatic health checks every five minutes."

    def handle(self, *args, **options):
        scheduler = BlockingScheduler()

        # Perform the first check immediately.
        check_all_monitors()

        # Repeat every five minutes.
        scheduler.add_job(
            check_all_monitors,
            trigger="interval",
            minutes=5,
            id="monitor_health_checks",
            max_instances=1,
            coalesce=True,
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Scheduler started. Active monitors will be checked "
                "every 5 minutes. Press Ctrl+C to stop."
            )
        )

        try:
            scheduler.start()
        except KeyboardInterrupt:
            self.stdout.write("Scheduler stopped.")

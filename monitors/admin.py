from django.contrib import admin
from .models import Monitor, CheckResult


@admin.register(Monitor)
class MonitorAdmin(admin.ModelAdmin):
    list_display = ("name", "url", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "url")


@admin.register(CheckResult)
class CheckResultAdmin(admin.ModelAdmin):
    list_display = (
        "monitor",
        "status_code",
        "response_time_ms",
        "is_up",
        "checked_at",
    )
    list_filter = ("is_up", "status_code")
    search_fields = ("monitor__name",)
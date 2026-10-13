from django.db import models


class Monitor(models.Model):
    name = models.CharField(max_length=100)
    url = models.URLField(max_length=500)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class CheckResult(models.Model):
    monitor = models.ForeignKey(
        Monitor,
        on_delete=models.CASCADE,
        related_name="check_results"
    )
    status_code = models.PositiveSmallIntegerField(null=True, blank=True)
    response_time_ms = models.FloatField(null=True, blank=True)
    is_up = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)
    checked_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.monitor.name} - {'UP' if self.is_up else 'DOWN'}"
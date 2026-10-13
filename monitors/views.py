from rest_framework import viewsets
from .models import Monitor, CheckResult
from .serializers import MonitorSerializer, CheckResultSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

from .services import check_monitor


class MonitorViewSet(viewsets.ModelViewSet):
    queryset = Monitor.objects.all()
    serializer_class = MonitorSerializer

    @action(detail=True, methods=["post"])
    def check(self, request, pk=None):
        monitor = self.get_object()

        result = check_monitor(monitor)

        return Response(
            {
                "monitor": monitor.name,
                "url": monitor.url,
                "is_up": result.is_up,
                "status_code": result.status_code,
                "response_time_ms": result.response_time_ms,
                "error_message": result.error_message,
                "checked_at": result.checked_at,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        monitor = self.get_object()

        results = CheckResult.objects.filter(
            monitor=monitor
        ).order_by("-checked_at")

        serializer = CheckResultSerializer(
            results,
            many=True
        )

        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        monitor = self.get_object()

        results = CheckResult.objects.filter(monitor=monitor)

        total_checks = results.count()
        successful_checks = results.filter(is_up=True).count()
        failed_checks = total_checks - successful_checks

        uptime_percentage = (
            round((successful_checks / total_checks) * 100, 2)
            if total_checks > 0
            else 0.0
        )

        return Response({
            "monitor": monitor.name,
            "url": monitor.url,
            "total_checks": total_checks,
            "successful_checks": successful_checks,
            "failed_checks": failed_checks,
            "uptime_percentage": uptime_percentage,
        })
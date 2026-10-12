from django.urls import path
from .views import (
    EvaluacionListCreateView, EvaluacionDetailView, DashboardView,
    DiagnosticoView, RespuestasDeterminantesView, PlanMinimoView,
    InformeEjecutivoView,
)

urlpatterns = [
    path('', EvaluacionListCreateView.as_view(), name='evaluacion-list-create'),
    path('dashboard/', DashboardView.as_view(), name='evaluacion-dashboard'),
    path('<int:pk>/', EvaluacionDetailView.as_view(), name='evaluacion-detail'),
    path('<int:pk>/diagnostico/', DiagnosticoView.as_view(), name='evaluacion-diagnostico'),
    path('<int:pk>/determinantes/', RespuestasDeterminantesView.as_view(), name='evaluacion-determinantes'),
    path('<int:pk>/plan/', PlanMinimoView.as_view(), name='evaluacion-plan'),
    path('<int:pk>/informe/', InformeEjecutivoView.as_view(), name='evaluacion-informe'),
]

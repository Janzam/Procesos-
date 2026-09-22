from django.urls import path
from .views import EvaluacionListCreateView, EvaluacionDetailView, DashboardView

urlpatterns = [
    path('', EvaluacionListCreateView.as_view(), name='evaluacion-list-create'),
    path('dashboard/', DashboardView.as_view(), name='evaluacion-dashboard'),
    path('<int:pk>/', EvaluacionDetailView.as_view(), name='evaluacion-detail'),
]

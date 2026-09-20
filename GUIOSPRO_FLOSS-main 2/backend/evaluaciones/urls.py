from django.urls import path
from .views import EvaluacionListCreateView, EvaluacionDetailView

urlpatterns = [
    path('', EvaluacionListCreateView.as_view(), name='evaluacion-list-create'),
    path('<int:pk>/', EvaluacionDetailView.as_view(), name='evaluacion-detail'),
]

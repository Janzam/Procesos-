from django.urls import path
from .views import IRCalculoView

urlpatterns = [
    path('calcular-ir/', IRCalculoView.as_view(), name='calcular-ir'),
]

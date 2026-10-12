from django.urls import path
from .views import MatrizIRView, EstadoIAView, SugerenciasView

urlpatterns = [
    path('matriz-ir/', MatrizIRView.as_view(), name='matriz-ir'),
    path('ia/estado/', EstadoIAView.as_view(), name='ia-estado'),
    path('ia/sugerencias/', SugerenciasView.as_view(), name='ia-sugerencias'),
]

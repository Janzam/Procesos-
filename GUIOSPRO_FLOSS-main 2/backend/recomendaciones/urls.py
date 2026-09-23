from django.urls import path
from .views import MatrizIRView

urlpatterns = [
    path('matriz-ir/', MatrizIRView.as_view(), name='matriz-ir'),
]

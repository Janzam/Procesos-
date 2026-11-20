from django.urls import path

from . import views

urlpatterns = [
    path("config/", views.ConfigView.as_view(), name="literatura-config"),
    path("corridas/", views.CorridaListaView.as_view(), name="literatura-corridas"),
    path("corridas/<int:pk>/", views.CorridaDetalleView.as_view(), name="literatura-corrida"),
    path("corridas/<int:pk>/progreso/", views.ProgresoView.as_view(), name="literatura-progreso"),
    path("corridas/<int:pk>/reanudar/", views.ReanudarView.as_view(), name="literatura-reanudar"),
    path("corridas/<int:pk>/activar/", views.ActivarView.as_view(), name="literatura-activar"),
    path("corridas/<int:pk>/comparar/", views.CompararView.as_view(), name="literatura-comparar"),
]

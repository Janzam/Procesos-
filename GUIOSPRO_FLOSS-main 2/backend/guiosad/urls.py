from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/factores/', include('factores.urls')),
    path('api/evaluaciones/', include('evaluaciones.urls')),
    path('api/recomendaciones/', include('recomendaciones.urls')),
]

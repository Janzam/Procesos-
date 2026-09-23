from django.urls import path
from .views import FactorListView

urlpatterns = [
    path('', FactorListView.as_view(), name='factor-list'),
]

from django.urls import path
from .views import FactorListView, DimensionListView

urlpatterns = [
    path('', FactorListView.as_view(), name='factor-list'),
    path('dimensiones/', DimensionListView.as_view(), name='dimension-list'),
]

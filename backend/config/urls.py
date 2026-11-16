from django.contrib import admin
from django.urls import include, path

api_urlpatterns = [
    path("", include("apps.core.api.urls")),
    path("auth/", include("apps.users.api.auth_urls")),
    path("", include("apps.users.api.urls")),
    path("", include("apps.tasks.api.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_urlpatterns)),
]

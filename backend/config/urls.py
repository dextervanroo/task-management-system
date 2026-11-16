from django.conf import settings
from django.contrib import admin
from django.urls import include, path

api_urlpatterns = [
    path("", include("apps.core.api.urls")),
    path("", include("apps.core.api.docs")),
    path("auth/", include("apps.users.api.auth_urls")),
    path("", include("apps.users.api.urls")),
    path("", include("apps.tasks.api.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_urlpatterns)),
]

if "silk" in settings.INSTALLED_APPS:  # development only
    urlpatterns += [path("silk/", include("silk.urls", namespace="silk"))]

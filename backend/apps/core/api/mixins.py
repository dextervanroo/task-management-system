"""Reusable building blocks for serializers and views."""

from django.db.models import QuerySet


class EagerLoadingSerializerMixin:
    """Lets a serializer declare the relations it reads.

    Views call :meth:`setup_eager_loading` so related rows are fetched with JOINs
    (``select_related``) or one extra query per relation (``prefetch_related``)
    instead of one query per serialized object.
    """

    select_related_fields: tuple[str, ...] = ()
    prefetch_related_fields: tuple = ()

    @classmethod
    def setup_eager_loading(cls, queryset: QuerySet) -> QuerySet:
        if cls.select_related_fields:
            queryset = queryset.select_related(*cls.select_related_fields)
        if cls.prefetch_related_fields:
            queryset = queryset.prefetch_related(*cls.prefetch_related_fields)
        return queryset


class EagerLoadingViewMixin:
    """Applies the eager loading declared by the view's serializer.

    ``get_queryset`` applies it to ``super().get_queryset()``. Views that build
    their queryset themselves call :meth:`apply_eager_loading` directly.
    """

    def get_queryset(self) -> QuerySet:
        return self.apply_eager_loading(super().get_queryset())

    def apply_eager_loading(self, queryset: QuerySet) -> QuerySet:
        setup_eager_loading = getattr(self.get_serializer_class(), "setup_eager_loading", None)
        if setup_eager_loading is None:
            return queryset
        return setup_eager_loading(queryset)

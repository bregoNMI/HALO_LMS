"""
Defines asynchronous celery task for content indexing
"""

from __future__ import annotations

import logging

from celery import shared_task
from celery_utils.logged_task import LoggedTask
from edx_django_utils.monitoring import set_code_owner_attribute
from opaque_keys.edx.keys import UsageKey
from opaque_keys.edx.locator import LibraryLocatorV2, LibraryUsageLocatorV2
from meilisearch.errors import MeilisearchError

from . import api

log = logging.getLogger(__name__)


@shared_task(base=LoggedTask, autoretry_for=(MeilisearchError, ConnectionError))
@set_code_owner_attribute
def upsert_xblock_index_doc(usage_key_str: str, recursive: bool) -> None:
    """
    Celery task to update the content index document for an XBlock
    """
    usage_key = UsageKey.from_string(usage_key_str)

    log.info("Updating content index document for XBlock with id: %s", usage_key)

    api.upsert_xblock_index_doc(usage_key, recursive)


@shared_task(base=LoggedTask, autoretry_for=(MeilisearchError, ConnectionError))
@set_code_owner_attribute
def delete_xblock_index_doc(usage_key_str: str) -> None:
    """
    Celery task to delete the content index document for an XBlock
    """
    usage_key = UsageKey.from_string(usage_key_str)

    log.info("Updating content index document for XBlock with id: %s", usage_key)

    api.delete_index_doc(usage_key)


@shared_task(base=LoggedTask, autoretry_for=(MeilisearchError, ConnectionError))
@set_code_owner_attribute
def upsert_library_block_index_doc(usage_key_str: str) -> None:
    """
    Celery task to update the content index document for a library block
    """
    usage_key = LibraryUsageLocatorV2.from_string(usage_key_str)

    log.info("Updating content index document for library block with id: %s", usage_key)

    api.upsert_library_block_index_doc(usage_key)


@shared_task(base=LoggedTask, autoretry_for=(MeilisearchError, ConnectionError))
@set_code_owner_attribute
def delete_library_block_index_doc(usage_key_str: str) -> None:
    """
    Celery task to delete the content index document for a library block
    """
    usage_key = LibraryUsageLocatorV2.from_string(usage_key_str)

    log.info("Deleting content index document for library block with id: %s", usage_key)

    api.delete_index_doc(usage_key)


@shared_task(base=LoggedTask, autoretry_for=(MeilisearchError, ConnectionError))
@set_code_owner_attribute
def update_content_library_index_docs(library_key_str: str) -> None:
    """
    Celery task to update the content index documents for all library blocks in a library
    """
    library_key = LibraryLocatorV2.from_string(library_key_str)

    log.info("Updating content index documents for library with id: %s", library_key)

    api.upsert_content_library_index_docs(library_key)

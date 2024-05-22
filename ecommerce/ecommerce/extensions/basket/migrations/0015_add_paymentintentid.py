# -*- coding: utf-8 -*-
from __future__ import absolute_import, unicode_literals

from django.db import migrations

from ecommerce.extensions.basket.constants import PAYMENT_INTENT_ID_ATTRIBUTE


def create_attribute(apps, schema_editor):
    BasketAttributeType = apps.get_model('basket', 'BasketAttributeType')
    BasketAttributeType.objects.create(name=PAYMENT_INTENT_ID_ATTRIBUTE)


def delete_attribute(apps, schema_editor):
    BasketAttributeType = apps.get_model('basket', 'BasketAttributeType')
    BasketAttributeType.objects.get(name=PAYMENT_INTENT_ID_ATTRIBUTE).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('basket', '0014_line_date_updated'),
    ]

    operations = [
        migrations.RunPython(create_attribute, delete_attribute),
    ]

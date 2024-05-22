# -*- coding: utf-8 -*-
# Generated by Django 1.11.27 on 2020-01-10 21:38


from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import simple_history.models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('order', '0021_auto_20191212_1630'),
    ]

    operations = [
        migrations.CreateModel(
            name='HistoricalOrderDiscount',
            fields=[
                ('id', models.IntegerField(auto_created=True, blank=True, db_index=True, verbose_name='ID')),
                ('category', models.CharField(choices=[('Basket', 'Basket'), ('Shipping', 'Shipping'), ('Deferred', 'Deferred')], default='Basket', max_length=64, verbose_name='Discount category')),
                ('offer_id', models.PositiveIntegerField(blank=True, null=True, verbose_name='Offer ID')),
                ('offer_name', models.CharField(blank=True, db_index=True, max_length=128, verbose_name='Offer name')),
                ('voucher_id', models.PositiveIntegerField(blank=True, null=True, verbose_name='Voucher ID')),
                ('voucher_code', models.CharField(blank=True, db_index=True, max_length=128, verbose_name='Code')),
                ('frequency', models.PositiveIntegerField(null=True, verbose_name='Frequency')),
                ('amount', models.DecimalField(decimal_places=2, default=0, max_digits=12, verbose_name='Amount')),
                ('message', models.TextField(blank=True)),
                ('history_id', models.AutoField(primary_key=True, serialize=False)),
                ('history_date', models.DateTimeField()),
                ('history_change_reason', models.CharField(max_length=100, null=True)),
                ('history_type', models.CharField(choices=[('+', 'Created'), ('~', 'Changed'), ('-', 'Deleted')], max_length=1)),
                ('history_user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
                ('order', models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.DO_NOTHING, related_name='+', to='order.Order', verbose_name='Order')),
            ],
            options={
                'verbose_name': 'historical Order Discount',
                'get_latest_by': 'history_date',
                'ordering': ('-history_date', '-history_id'),
            },
            bases=(simple_history.models.HistoricalChanges, models.Model),
        ),
    ]

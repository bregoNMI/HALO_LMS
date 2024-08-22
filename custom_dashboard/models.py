from django.db import models

class Dashboard(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(default='Description')
    is_main = models.BooleanField(default=False)

    def __str__(self):
        return self.title

class Widget(models.Model):
    dashboard = models.ForeignKey(Dashboard, on_delete=models.CASCADE, related_name='widgets')
    title = models.CharField(max_length=255)
    content = models.TextField(default="Widget Text")
    order = models.PositiveIntegerField(default=0)  # To track the order of widgets

    class Meta:
        ordering = ['order']

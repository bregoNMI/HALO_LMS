from django.db import models

class Dashboard(models.Model):
    name = models.CharField(max_length=255)
    layout = models.CharField(max_length=50, default='layout1')
    is_main = models.BooleanField(default=False)

    header_background_image = models.URLField(max_length=1024, default='/static/images/dashboard/bannerTemplate1.png', blank=True, null=True)
    header_background_image_position = models.CharField(max_length=255, default='right bottom')
    header_title = models.CharField(max_length=255, default='Welcome, {{ first_name }} {{ last_name }}')
    header_subtext = models.CharField(max_length=255, default='Kickstart your online Education')
    header_icon = models.CharField(max_length=100, default='fa-regular fa-books')
    header_icon_color = models.CharField(max_length=7, default='#183b73')
    header_icon_background_color = models.CharField(max_length=7, default='#e7e7e7')
    header_text_color = models.CharField(max_length=7, default='#e7e7e7')
    header_subtext_color = models.CharField(max_length=7, default='#e7e7e7')

    def __str__(self):
        return self.name

class Widget(models.Model):
    dashboard = models.ForeignKey(Dashboard, on_delete=models.CASCADE, related_name='widgets')
    widget_title = models.CharField(max_length=255, blank=True, null=True)
    widget_title_color = models.CharField(max_length=7, default='#333333')
    widget_subtext = models.CharField(max_length=255, blank=True, null=True)
    widget_subtext_color = models.CharField(max_length=7, default='#6b6b6b')
    widget_icon = models.CharField(max_length=100, blank=True, null=True)
    widget_icon_color = models.CharField(max_length=7, blank=True, null=True)
    widget_icon_background_color = models.CharField(max_length=7, blank=True, null=True)
    widget_external_link = models.CharField(max_length=255, blank=True, null=True)
    type = models.TextField(default="Widget Type")
    order = models.PositiveIntegerField(default=0)  # To track the order of widgets

    class Meta:
        ordering = ['order']

class Header(models.Model):
    header_logo_display = models.CharField(max_length=1024, default='No File Selected', blank=True, null=True)
    header_logo = models.URLField(max_length=1024, default='/static/images/logo/HALO LMS Logo-03.png', blank=True, null=True)
    header_background_color = models.CharField(max_length=7, default='#183b73')
    header_text_color = models.CharField(max_length=7, default='#e7e7e7')
    header_text_hover_color = models.CharField(max_length=7, default='#e7e7e7')
    header_text_background_color = models.CharField(max_length=7, default='#e7e7e7')

    def save(self, *args, **kwargs):
        if not self.pk and Header.objects.exists():
            raise ValidationError('There is already a Header instance. You cannot create another one.')
        return super().save(*args, **kwargs)

    @classmethod
    def get_instance(cls):
        instance, created = cls.objects.get_or_create(id=1)
        return instance

    def __str__(self):
        return "Header Configuration"
    
class Footer(models.Model):
    footer_background_color = models.CharField(max_length=7, default='#183b73')
    footer_text_color = models.CharField(max_length=7, default='#e7e7e7')

    def save(self, *args, **kwargs):
        if not self.pk and Footer.objects.exists():
            raise ValidationError('There is already a Footer instance. You cannot create another one.')
        return super().save(*args, **kwargs)

    @classmethod
    def get_instance(cls):
        instance, created = cls.objects.get_or_create(id=1)
        return instance

    def __str__(self):
        return "Footer Configuration"
    
class LoginForm(models.Model):
    layout = models.CharField(max_length=50, default='layout1')

    is_logo_disabled = models.BooleanField(default=False)
    login_logo = models.URLField(max_length=1024, default='/static/images/logo/HALO LMS Logo-03.png', blank=True, null=True)
    logo_width = models.CharField(max_length=7, default='250px')
    logo_height = models.CharField(max_length=7, default='250px')
    logo_space_bottom = models.CharField(max_length=7, default='250px')

    def save(self, *args, **kwargs):
        if not self.pk and LoginForm.objects.exists():
            raise ValidationError('There is already a Login Form instance. You cannot create another one.')
        return super().save(*args, **kwargs)

    @classmethod
    def get_instance(cls):
        instance, created = cls.objects.get_or_create(id=1)
        return instance

    def __str__(self):
        return "Login Form"
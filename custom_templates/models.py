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
    widget_title_color = models.CharField(max_length=7, default='#41454d')
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
    header_logo_display = models.CharField(max_length=1024, default='No file selected', blank=True, null=True)
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
    login_logo_title = models.CharField(max_length=1024, default='No file selected', blank=True, null=True)
    logo_width = models.CharField(max_length=7, default='190')
    logo_height = models.CharField(max_length=7, default='70')
    logo_space_bottom = models.CharField(max_length=7, default='75')
    logo_url = models.CharField(max_length=255, blank=True, null=True)

    background_color = models.CharField(max_length=7, default='#f3f3f3')
    is_background_disabled = models.BooleanField(default=True)
    background_image = models.URLField(max_length=1024, default='/static/images/dashboard/bannerTemplate2.png', blank=True, null=True)
    background_image_title = models.CharField(max_length=1024, default='No file selected', blank=True, null=True)
    background_repeat = models.CharField(max_length=255, default='no-repeat', blank=True, null=True)
    background_position = models.CharField(max_length=255, default='right center', blank=True, null=True)
    background_size = models.CharField(max_length=255, default='cover', blank=True, null=True)

    form_enable_transparency = models.BooleanField(default=False)
    form_background_color = models.CharField(max_length=7, default='#ffffff')
    form_background_image = models.URLField(max_length=1024, blank=True, null=True)
    form_image_title = models.CharField(max_length=1024, default='No file selected', blank=True, null=True)
    form_max_width = models.CharField(max_length=7, default='380')
    form_radius = models.CharField(max_length=7, default='0')
    form_shadow = models.CharField(max_length=7, default='0')
    form_shadow_opacity = models.CharField(max_length=7, default='0')
    form_padding_top = models.CharField(max_length=7, default='18')
    form_padding_right = models.CharField(max_length=7, default='18')
    form_padding_bottom = models.CharField(max_length=7, default='24')
    form_padding_left = models.CharField(max_length=7, default='18')
    form_border_width = models.CharField(max_length=7, default='0')
    form_border_style = models.CharField(max_length=255, default='none', blank=True, null=True)
    form_border_color = models.CharField(max_length=7, default='#ffffff')

    input_padding_top = models.CharField(max_length=7, default='7')
    input_padding_right = models.CharField(max_length=7, default='10')
    input_padding_bottom = models.CharField(max_length=7, default='7')
    input_padding_left = models.CharField(max_length=7, default='10')
    input_background_color = models.CharField(max_length=7, default='#ffffff')
    input_text_color = models.CharField(max_length=7, default='#586370')
    input_width = models.CharField(max_length=7, default='100')
    input_border_color = models.CharField(max_length=7, default='#ececf1')
    input_radius = models.CharField(max_length=7, default='8')
    input_font_size = models.CharField(max_length=7, default='15')
    input_space_between = models.CharField(max_length=7, default='12')

    label_color = models.CharField(max_length=7, default='#41454d')
    label_font_size = models.CharField(max_length=7, default='15')
    label_font_weight = models.CharField(max_length=255, default='normal', blank=True, null=True)
    label_space_bottom = models.CharField(max_length=7, default='6')

    button_color = models.CharField(max_length=7, default='#1863dc')
    button_color_hover = models.CharField(max_length=7, default='#1e90ff')
    button_text = models.CharField(max_length=7, default='#ffffff')
    button_text_hover = models.CharField(max_length=7, default='#ffffff')
    button_border_color = models.CharField(max_length=7, default='#1863dc')
    button_border_color_hover = models.CharField(max_length=7, default='#1e90ff')
    button_space_above = models.CharField(max_length=7, default='56')
    button_width = models.CharField(max_length=7, default='100')
    button_radius = models.CharField(max_length=7, default='24')
    button_padding_top = models.CharField(max_length=7, default='8')
    button_padding_right = models.CharField(max_length=7, default='16')
    button_padding_bottom = models.CharField(max_length=7, default='8')
    button_padding_left = models.CharField(max_length=7, default='16')
    button_font_size = models.CharField(max_length=7, default='14')
    button_font_weight = models.CharField(max_length=255, default='normal', blank=True, null=True)

    is_forgot_disabled = models.BooleanField(default=False)
    forgot_text_decoration = models.CharField(max_length=255, default='none', blank=True, null=True)
    forgot_text_decoration_hover = models.CharField(max_length=255, default='underline', blank=True, null=True)
    forgot_font_size = models.CharField(max_length=7, default='14')
    forgot_space_above  = models.CharField(max_length=7, default='6')
    forgot_link_color = models.CharField(max_length=7, default='#1863dc')
    forgot_link_color_hover = models.CharField(max_length=7, default='#1863dc')

    is_signup_disabled = models.BooleanField(default=False)
    signup_text_decoration = models.CharField(max_length=255, default='none', blank=True, null=True)
    signup_text_decoration_hover = models.CharField(max_length=255, default='underline', blank=True, null=True)
    signup_font_size = models.CharField(max_length=7, default='14')
    signup_font_weight = models.CharField(max_length=255, default='normal', blank=True, null=True)
    signup_space_above  = models.CharField(max_length=7, default='20')
    signup_link_color = models.CharField(max_length=7, default='#1863dc')
    signup_link_color_hover = models.CharField(max_length=7, default='#1863dc')
    signup_text_color = models.CharField(max_length=7, default='#333333')


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
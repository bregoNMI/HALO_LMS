# myapp/forms.py
from django import forms
from django.contrib.auth.models import User
from ..models import Profile
from django.contrib.auth.forms import PasswordChangeForm

# Form for user registration
class UserRegistrationForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password'])
        if commit:
            user.save()
        return user

# Form for user profile
class ProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ['username', 'email', 'first_name', 'last_name', 'name_on_cert', 'associate_school',
                  'archived', 'role', 'birth_date', 'address_1', 'city', 'state', 'code',
                  'country', 'citizenship', 'phone', 'sex', 'delivery_method', 'referral', 'initials',
                  'photoid', 'passportphoto']
        
class CustomPasswordChangeForm(PasswordChangeForm):
    old_password = forms.CharField(widget=forms.PasswordInput(attrs={'placeholder': 'Old Password'}))
    new_password1 = forms.CharField(widget=forms.PasswordInput(attrs={'placeholder': 'New Password'}))
    new_password2 = forms.CharField(widget=forms.PasswordInput(attrs={'placeholder': 'Confirm New Password'}))
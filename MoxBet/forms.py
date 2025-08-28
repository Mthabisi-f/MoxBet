from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import User

class UserRegistrationForm(UserCreationForm):
    email = forms.EmailField(required=True)

    class Meta:
        model = User
        fields = ['first_name', 'username', 'email', 'id_number', 'country', 'phone_number', 'agent_code', 'currency', 'password1', 'password2']
        
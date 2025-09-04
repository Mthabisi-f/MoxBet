from .models import Limits
import os, environ
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

def global_user_data(request):
    currency_symbol = ''
    user_limits = None
    user = None
    key = os.environ.get("APISPORTS_KEY")
    
    if request.user.is_authenticated:
        user = request.user
        user_currency = user.currency

        if user_currency == 'USD':
            currency_symbol = '$'
        elif user_currency == 'ZAR':
            currency_symbol = 'R'
        elif user_currency == 'ZIG':
            currency_symbol = 'Z'

        # user_limits = Limits.objects.get(currency=user_currency)

    return  {'user': user,
             'currency_symbol': currency_symbol,
             'user_limits': user_limits,
             'api_key': key}


    

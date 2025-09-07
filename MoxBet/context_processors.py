from .models import Limits
import os
from pathlib import Path
from dotenv import load_dotenv
from collections import namedtuple

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# Simple class to hold user limits
class UserLimits:
    def __init__(self, min_stake, min_deposit, min_withdrawal, max_withdrawal, max_win):
        self.min_stake = min_stake
        self.min_deposit = min_deposit
        self.min_withdrawal = min_withdrawal
        self.max_withdrawal = max_withdrawal
        self.max_win = max_win

def global_user_data(request):
    key = os.environ.get("APISPORTS_KEY")
    currency_symbols = {"USD": "$", "ZAR": "R", "ZIG": "Z"}

    if request.user.is_authenticated:
        user = request.user
        user_currency = user.currency
        currency_symbol = currency_symbols.get(user_currency, "$")

        try:
            limits_obj = Limits.objects.get(currency=user_currency)
            user_limits = UserLimits(
                min_stake=limits_obj.min_stake,
                min_deposit=limits_obj.min_deposit,
                min_withdrawal=limits_obj.min_withdrawal,
                max_withdrawal=limits_obj.max_withdrawal,
                max_win=limits_obj.max_win,
            )
        except Limits.DoesNotExist:
            user_limits = UserLimits(
                min_stake=0.5, min_deposit=1, min_withdrawal=5,
                max_withdrawal=5, max_win=1000
            )

        return {
            'user': user,
            'currency_symbol': currency_symbol,
            'user_limits': user_limits,
            'api_key': key
        }

    # Anonymous user defaults
    currency_symbol = "$"
    user_limits = UserLimits(
        min_stake=0.5, min_deposit=1, min_withdrawal=5,
        max_withdrawal=5, max_win=1000
    )

    return {
        'currency_symbol': currency_symbol,
        'user_limits': user_limits,
        'api_key': key
    }

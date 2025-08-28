from .models import Limits

def global_user_data(request):
    currency_symbol = ''
    user_limits = None
    user = None
    
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
             'user_limits': user_limits}
    

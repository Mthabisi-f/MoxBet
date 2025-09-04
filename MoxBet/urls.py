from django.urls import path
from . import views, context_processors

urlpatterns = [
    # main pages
    path('', views.sports, name='index'),
    path('sports/', views.sports,  name='sports'),
    
    path('api/fetch-games/', views.fetch_games, name='fetch_games'),
    path('api/fetch-leagues/', views.fetch_games_by_leagues, name='fetch_leagues'),
    path('api/fetch-more-odds/', views.fetch_more_odds, name='fetch_more_odds'),
    path('fetch-live-games/', views.fetch_live_games, name='fetch_live_games'),
    path('fetch-tickets/', views.fetch_tickets, name='fetch_tickets'),
    path('get-latest-odds/', views.get_latest_odds, name='main'),
    path('recieve-sms/', views.receive_sms, name='recieve_sms'),
    path('place-bet/', views.place_bet, name='place_bet'),
    path('book-bet/', views.book_bet, name='book_bet'),
    path('get-booking/', views.get_booking, name='get_booking'),
    path('login/', views.loginPage, name='login'),
    path('mybets/', views.mybets, name='mybets'),
    path('register/', views.registerPage, name='register'),
    path('logout/', views.logoutUser, name='logout'),
    path('deposit/', views.deposit, name='deposit'),
    path('withdraw/', views.withdraw, name='withdraw'),
    path('head-to-head/', views.h2hPage, name='h2h'),
    path('betslip/', views.betslip, name='betslip'),
    path('lucky-numbers/', views.luckyNumbers, name='lucky_numbers'),
    path('live/', views.live, name='live'),
    path('results/', views.results, name='results'),
    path('win-boost/', views.win_boost, name='win_boost'),
    path('more-odds/',  views.more_odds, name='more_odds'),
    path('check-ticket/',  views.check_ticket, name='check_ticket'),
]
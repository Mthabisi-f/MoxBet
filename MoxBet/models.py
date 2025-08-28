from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
import uuid
from django.conf import settings



# Create your models here.
class User(AbstractUser):
    username =  models.CharField(max_length=70, unique=True)
    email =  models.EmailField(max_length=70, unique=True)
    id_number = models.CharField(max_length=15)
    country =  models.CharField(max_length=70, unique=False)
    currency =  models.CharField(max_length=5, unique=False, default="USD")
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    agent_code = models.CharField(max_length=10)
    phone_number = models.CharField(max_length=15, blank=False)
    password = models.CharField(max_length=255, blank=False)
    date_joined = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.username
    
    class Meta:
        app_label = 'MoxBet'

class Transactions(models.Model):
    TRANSACTION_TYPES = [
        ('deposit', 'Deposit'),
        ('withdrawal', 'Withdrawal'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('Void', 'Void'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, default=None)
    message = models.TextField(default='No message')
    confirmation_code = models.CharField(max_length=50, unique=True)
    transaction_type = models.CharField(max_length=10, choices= TRANSACTION_TYPES, default='deposit')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10)
    timestamp = models.DateTimeField(default=timezone.now)
   
    def __str__(self):
        return f"{self.transaction_type} of {self.currency}{self.amount} with confirmation code: {self.confirmation_code}"


class Bookings(models.Model):
    booking_code = models.CharField(max_length=20, unique=True)  # Unique booking code
    selections = models.JSONField()  # Stores the selected bets in JSON format
    total_odds = models.DecimalField(max_digits=6, decimal_places=2)
    stake = models.DecimalField(max_digits=10, decimal_places=2)
    win_boost = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    potential_win = models.DecimalField(max_digits=10, decimal_places=2)
    total_matches = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Ticket {self.booking_code}"


# class Leagues(models.Model):
#     league = models.JSONField()
#     sport  = models.CharField(max_length=100)
#     created_at = models.DateTimeField(default=timezone.now)
#     is_priority = models.BooleanField(default=False)

#     class Meta:
#         unique_together = ('league', 'country', 'sport')
    
#     def __str__(self):
#         return f"{self.league} ({self.sport})"

class Leagues(models.Model):
    league = models.CharField(max_length=255)
    country = models.CharField(max_length=255, null=True, blank=True)
    sport = models.CharField(max_length=64)
    created_at = models.DateTimeField(default=timezone.now)
    is_priority = models.BooleanField(default=False)

    class Meta:
        unique_together = ('league', 'country', 'sport')

    def __str__(self):
        return f"{self.league} ({self.sport})"



class MarketTypeMapping(models.Model):
    sport = models.CharField(max_length=100, blank=False, null=False)
    frontend_market = models.CharField(max_length=100, blank=True, null=True)
    backend_market = models.CharField(max_length=100, blank=False, null=False)
    settlement_function = models.CharField(max_length=200, blank=True, null=True, unique=True)

    class Meta:
        unique_together = ('sport', "frontend_market")
        verbose_name = 'Market Type Mapping'
        verbose_name_plural = 'Market Type Mappings'

    def __str__(self):
        return f"{self.sport}: {self.backend_market} -> {self.frontend_market or 'Not mapped'}"



class Matches(models.Model):
    match_id = models.BigIntegerField(unique=True)
    sport = models.CharField(max_length=64)
    country = models.CharField(max_length=255, null=True, blank=True)
    league = models.JSONField(null=True, blank=True)
    league_id = models.ForeignKey(Leagues, null=True, blank=True, on_delete=models.SET_NULL)
    venue = models.JSONField(null=True, blank=True)
    commence_datetime = models.DateTimeField(null=True, blank=True)
    status = models.JSONField(null=True, blank=True)
    extras = models.JSONField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.match_id} - {self.league['name']} {self.sport}"



# class Matches(models.Model):
#     match_id = models.BigIntegerField(unique=True)
#     sport = models.CharField(max_length=100)
#     country = models.CharField(max_length=255, null=True, blank=True)
#     league = models.CharField(max_length=255, null=True, blank=True)
#     league_id = models.ForeignKey(Leagues, null=True, blank=True, on_delete=models.SET_NULL)
#     venue = models.JSONField(null=True, blank=True)
#     commence_datetime = models.DateTimeField(null=True, blank=True)
#     status = models.JSONField(), 
#     extras = models.JSONField(null=True, blank=True)
#     updated_at = models.DateTimeField(auto_now=True)

#     def __str__(self):
#         return f"{self.match_id} - {self.league} {self.sport}"


class MatchOdds(models.Model):
    # match = models.IntegerField(null=True, blank=True)  # temporary for testing
    match = models.ForeignKey(Matches, related_name='matchodds', on_delete=models.CASCADE)
    sport = models.CharField(max_length=100)
    market_type = models.CharField(max_length=100) # store e.g '1X2', 'Both teams to score'
    odds =  models.JSONField()
    updated_at = models.DateTimeField(auto_now_add=True)
    extras = models.JSONField(null=True)

    class Meta:
        unique_together = ("match", "market_type")

    def __str__(self):
        return f"{self.match.match_id} - {self.market_type}"


class Agents(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='user')
    total_users = models.ManyToManyField(User, blank=True)
    total_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"Agent: {self.user.username} - Earnings: {self.total_users}"


class Tickets(models.Model):
    TICKET_STATUS = [
        ('Pending', 'Pending'),	
        ('Won', 'Won'),
        ('Lost', 'Lost'),
        ('Refund', 'Refund'),
        ('Void', 'Void'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    type = models.CharField(max_length=20, null=False)
    total_odds = models.DecimalField(max_digits=10, decimal_places=2)
    total_matches = models.IntegerField()
    selections = models.JSONField(default=list)
    stake = models.DecimalField(max_digits=10, decimal_places=2)
    win_boost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    potential_win = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=TICKET_STATUS, default="Pending")
    barcode = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    settled_at = models.DateTimeField(null=True)

    def __str__(self):
        return f"Ticket: {self.id} placed by {self.user.username} - {self.status}"
 
# models.py
class Limits(models.Model):
    currency = models.CharField(max_length=3, unique=True)  # USD, EUR, GBP etc.
    min_stake = models.DecimalField(max_digits=10, decimal_places=2)
    min_deposit = models.DecimalField(max_digits=10, decimal_places=2)
    max_win = models.DecimalField(max_digits=10, decimal_places=2)
    min_withdrawal = models.DecimalField(max_digits=10, decimal_places=2)
    max_withdrawal = models.DecimalField(max_digits=10, decimal_places=2)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.currency}: {self.min_stake}"


# models.py
class PaymentGateway(models.Model):
    name = models.CharField(max_length=50)  # "Stripe", "PayPal"
    is_active = models.BooleanField(default=True)
    config = models.JSONField()  # {"api_key": "encrypted", "webhook_url": "..."}
	
# models.py
class ComplianceRule(models.Model):
    country = models.CharField(max_length=2)  # "US", "UK"
    required_docs = models.JSONField()  # ["id_proof", "address_verify"]
    max_bet_amount = models.DecimalField(max_digits=10, decimal_places=2)



class BetSettlementRule(models.Model):
    market_type = models.CharField(max_length=50)  # e.g., "Over/Under 2.5"
    condition = models.JSONField()  # {"operator": ">", "value": 2.5}
    result = models.CharField(max_length=20)  # "win", "lose", "void"


class Promotion(models.Model):
    name = models.CharField(max_length=100)
    bonus_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    # eligible_markets = models.ManyToManyField() #pu markets in brackets



class MoneyBack(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, default=1)
    ticket_type = models.CharField(max_length=50, null=False, default='sports')
    ticket_id = models.IntegerField(default=10)
    minimum_odds = models.DecimalField(max_digits=10, decimal_places=2)
    amount_returned = models.DecimalField(max_digits=10, decimal_places=2)
    

class WinBoost(models.Model):
    number_of_selections = models.IntegerField()
    win_boost_percentage = models.DecimalField(max_digits=10, decimal_places=2)

class Results(models.Model):
    extras = models.JSONField(null=True)
    league_id = models.ForeignKey(Leagues, on_delete=models.CASCADE, db_column="league_id")
    match_id = models.CharField(max_length=50, null=False, blank=False)
    datetime = models.DateTimeField(blank=False, null=False)
    sport = models.CharField(max_length=50, null=False, blank=False)



# New models to cover extra endpoints
class Standings(models.Model):
    league = models.ForeignKey(Leagues, on_delete=models.CASCADE)
    sport = models.CharField(max_length=64, default="FOOTBALL")
    season = models.IntegerField(null=True, blank=True)
    standings = models.JSONField()  # full table json
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("league", "season", "sport")

class Lineup(models.Model):
    match = models.ForeignKey(Matches, on_delete=models.CASCADE)
    sport = models.CharField(max_length=64, default="FOOTBALL")
    lineup = models.JSONField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("match", "sport")

class Team(models.Model):
    team_id = models.BigIntegerField(unique=True)
    name = models.CharField(max_length=255)
    country = models.CharField(max_length=255, null=True, blank=True)
    logo = models.URLField(null=True, blank=True)
    sport = models.CharField(max_length=64, default="FOOTBALL")
    extras = models.JSONField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

class Player(models.Model):
    player_id = models.BigIntegerField(unique=True)
    name = models.CharField(max_length=255)
    team = models.ForeignKey(Team, null=True, blank=True, on_delete=models.SET_NULL)
    position = models.CharField(max_length=64, null=True, blank=True)
    nationality = models.CharField(max_length=255, null=True, blank=True)
    birth = models.DateField(null=True, blank=True)
    photo = models.URLField(null=True, blank=True)
    sport = models.CharField(max_length=64, default="FOOTBALL")
    extras = models.JSONField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

class Injury(models.Model):
    player = models.ForeignKey(Player, null=True, blank=True, on_delete=models.SET_NULL)
    team = models.ForeignKey(Team, null=True, blank=True, on_delete=models.SET_NULL)
    sport = models.CharField(max_length=64, default="FOOTBALL")
    details = models.JSONField()
    updated_at = models.DateTimeField(auto_now=True)

class Competition(models.Model):
    competition_id = models.BigIntegerField(unique=True)
    name = models.CharField(max_length=255)
    country = models.CharField(max_length=255, null=True, blank=True)
    season = models.IntegerField(null=True, blank=True)
    sport = models.CharField(max_length=64, default="FOOTBALL")
    extras = models.JSONField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

class Transfer(models.Model):
    player = models.ForeignKey(Player, null=True, blank=True, on_delete=models.SET_NULL)
    from_team = models.ForeignKey(Team, null=True, blank=True, related_name="left_transfers", on_delete=models.SET_NULL)
    to_team = models.ForeignKey(Team, null=True, blank=True, related_name="joined_transfers", on_delete=models.SET_NULL)
    details = models.JSONField()
    sport = models.CharField(max_length=64, default="FOOTBALL")
    updated_at = models.DateTimeField(auto_now=True)

class Prediction(models.Model):
    match = models.ForeignKey(Matches, on_delete=models.CASCADE)
    sport = models.CharField(max_length=64, default="FOOTBALL")
    payload = models.JSONField()
    updated_at = models.DateTimeField(auto_now=True)












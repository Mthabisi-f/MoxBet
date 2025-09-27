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
    agent_code = models.CharField(max_length=10, default="1234")
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


class Agents(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='agent_profile')
    total_users = models.ManyToManyField(User, blank=True, related_name='agent_users')
    total_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"Agent: {self.user.username} - Earnings: {self.total_earnings}"

class Tickets(models.Model):
    TICKET_STATUS = [
        ('Pending', 'Pending'),	
        ('Won', 'Won'),
        ('Lost', 'Lost'),
        ('Refund', 'Refund'),
        ('Void', 'Void'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    type = models.CharField(max_length=50, null=False)
    total_odds = models.DecimalField(max_digits=30, decimal_places=2)
    total_matches = models.IntegerField()
    selections = models.JSONField(default=list)
    stake = models.DecimalField(max_digits=15, decimal_places=2)
    win_boost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    potential_win = models.DecimalField(max_digits=30, decimal_places=2)
    status = models.CharField(max_length=50, choices=TICKET_STATUS, default="Pending")
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


class WinBoost(models.Model):
    number_of_selections = models.IntegerField()
    win_boost_percentage = models.DecimalField(max_digits=10, decimal_places=2)


class MoneyBack(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='moneybacks')
    ticket = models.ForeignKey(Tickets, on_delete=models.CASCADE, related_name='moneybacks')
    ticket_type = models.CharField(max_length=50, null=True, blank=True)
    minimum_odds = models.FloatField()
    amount_returned = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Refund {self.amount_returned} for Ticket {self.ticket_id} by {self.user.username}"













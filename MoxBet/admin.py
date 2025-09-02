from django.contrib import admin
from .models import User, Transactions, Leagues, Limits, Tickets, WinBoost, Bookings, Results

# Register your models here.
admin.site.register(User)
admin.site.register(Transactions)
admin.site.register(Leagues)
admin.site.register(Limits)
admin.site.register(Tickets)
admin.site.register(WinBoost)
admin.site.register(Bookings)
admin.site.register(Results)


class LeaguesAdmin(admin.ModelAdmin):
    list_display = ("League","country", "sport", "is_priority")
    list_filter = ("sport", "is_priority")
    search_fields = ("league")
    list_editable = ("is_priority")

class StakeLimitAdmin(admin.ModelAdmin):
    list_display = ('currency', 'min_stake', 'max_stake')
    search_fields = ('currency',)


class TicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'type', 'status')
    actions = ['force_settle']

    def force_settle(self, request, queryset):
        from . import settle_ticket
        for ticket in queryset:
            settle_ticket(ticket)
        self.message_user(request, f"Settled {queryset.count()} tickets")

# @admin.register(MarketTypeMapping)
class MarketAdmin(admin.ModelAdmin):
    list_display = ('sport', 'backend_market', 'settlement_function')



from django.contrib import admin
from .models import User, Transactions, Limits, Tickets, WinBoost, Bookings, Agents

# Register your models here.
admin.site.register(User)
admin.site.register(Agents)
admin.site.register(Transactions)
admin.site.register(Limits)
admin.site.register(Tickets)
admin.site.register(WinBoost)
admin.site.register(Bookings)


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



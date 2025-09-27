# signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Tickets, Agents, User

@receiver(post_save, sender=Tickets)
def add_agent_commission(sender, instance, created, **kwargs):
    if created:  # Only when a ticket is first created
        user = instance.user
        agent_user = User.objects.filter(agent_code=user.agent_code).first()

        if agent_user:
            agent_profile, created = Agents.objects.get_or_create(user=agent_user)
            agent_profile.total_earnings += 1  # R1 per ticket
            agent_profile.save()

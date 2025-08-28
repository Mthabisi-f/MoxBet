from rest_framework.decorators import api_view
from rest_framework.response import Response
from models import Tickets
from . import settle_ticket

@api_view(['POST'])
def settle_ticket_view(request, ticket_id):
    ticket = Tickets.objects.get(id=ticket_id, user=request.user)
    settle_ticket(ticket)
    return Response({
        'status': ticket.status,
        'type': ticket.get_ticket_type_display()
    })

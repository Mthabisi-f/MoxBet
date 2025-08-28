from .sports import SportsSettlementHandler
from .casino import CasinoSettlementHandler
from .virtual import VirtualSettlementHandler

def settle_ticket(ticket):
    handlers = {
        'sports': SportsSettlementHandler,
        'casino': CasinoSettlementHandler,
        'virtual': VirtualSettlementHandler
    }
    handler_class = handlers.get(ticket.type)
    if not handler_class:
        raise ValueError(f"No handler for ticket type {ticket.type}")
    return handler_class(ticket).settle()

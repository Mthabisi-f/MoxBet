from django.core.mail import mail_admins
import logging

logger = logging.getLogger(__name__)

class SettlementHandler:
    def __init__(self, ticket):
        self.ticket = ticket
    
    def settle(self):
        raise NotImplementedError("Subclasses must implement this")
    
    def _alert_missing_function(self, func_name):
        subject = f"Missing settlement function: {func_name}"
        message = f"Implement in {self.__class__.__name__}"
        mail_admins(subject, message)
        logger.error(message)

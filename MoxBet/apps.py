from django.apps import AppConfig


class MoxbetConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'MoxBet'
    label = 'MoxBet'
    verbose_name = 'MoxBet'

    def ready(self):
        import MoxBet.signals

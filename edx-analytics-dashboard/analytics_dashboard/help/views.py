from analytics_dashboard.help import HELP_CONTEXT_TOKEN_NAME


class ContextSensitiveHelpMixin:
    """
    Adds page-specific data to enable context-sensitive help.
    """

    help_token = None

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context[HELP_CONTEXT_TOKEN_NAME] = self.help_token
        return context

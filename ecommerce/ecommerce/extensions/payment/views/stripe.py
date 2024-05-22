

import logging

from django.core.exceptions import MultipleObjectsReturned, ObjectDoesNotExist
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import redirect
from oscar.apps.partner import strategy
from oscar.core.loading import get_class, get_model
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from stripe.error import CardError

from ecommerce.extensions.basket.constants import PAYMENT_INTENT_ID_ATTRIBUTE
from ecommerce.extensions.basket.utils import basket_add_organization_attribute, basket_add_payment_intent_id_attribute
from ecommerce.extensions.checkout.mixins import EdxOrderPlacementMixin
from ecommerce.extensions.checkout.utils import get_receipt_page_url
from ecommerce.extensions.payment.core.sdn import checkSDN
from ecommerce.extensions.payment.forms import StripeSubmitForm
from ecommerce.extensions.payment.processors.stripe import Stripe
from ecommerce.extensions.payment.views import BasePaymentSubmitView

logger = logging.getLogger(__name__)

Applicator = get_class('offer.applicator', 'Applicator')
BasketAttribute = get_model('basket', 'BasketAttribute')
BasketAttributeType = get_model('basket', 'BasketAttributeType')
BillingAddress = get_model('order', 'BillingAddress')
Country = get_model('address', 'Country')
NoShippingRequired = get_class('shipping.methods', 'NoShippingRequired')
OrderTotalCalculator = get_class('checkout.calculators', 'OrderTotalCalculator')
PaymentProcessorResponse = get_model('payment', 'PaymentProcessorResponse')


class StripeSubmitView(EdxOrderPlacementMixin, BasePaymentSubmitView):
    """ Stripe payment handler.

    The payment form should POST here. This view will handle creating the charge at Stripe, creating an order,
    and redirecting the user to the receipt page.
    """
    form_class = StripeSubmitForm

    @property
    def payment_processor(self):
        return Stripe(self.request.site)

    def form_valid(self, form):
        form_data = form.cleaned_data
        basket = form_data['basket']
        payment_intent_id = form_data['payment_intent_id']
        order_number = basket.order_number

        basket_add_organization_attribute(basket, self.request.POST)
        basket_add_payment_intent_id_attribute(basket, self.request.POST)

        try:
            self.handle_payment(payment_intent_id, basket)
        except Exception:  # pylint: disable=broad-except
            logger.exception('An error occurred while processing the Stripe payment for basket [%d].', basket.id)
            return JsonResponse({}, status=400)

        try:
            order = self.create_order(self.request, basket)
        except Exception:  # pylint: disable=broad-except
            logger.exception('An error occurred while processing the Stripe payment for basket [%d].', basket.id)
            return JsonResponse({}, status=400)

        self.handle_post_order(order)

        receipt_url = get_receipt_page_url(
            self.request,
            site_configuration=self.request.site.siteconfiguration,
            order_number=order_number,
            disable_back_button=True
        )
        return JsonResponse({'url': receipt_url}, status=201)


class StripeCheckoutView(EdxOrderPlacementMixin, APIView):
    http_method_names = ['post']

    # DRF APIView wrapper which allows clients to use JWT authentication when
    # making Stripe checkout submit requests.
    permission_classes = [IsAuthenticated]

    @property
    def payment_processor(self):
        return Stripe(self.request.site)

    def check_sdn(self, request, data):
        """
        Check that the supplied request and form data passes SDN checks.

        Returns:
            hit_count (int) if the SDN check fails, or None if it succeeds.
        """
        hit_count = checkSDN(
            request,
            data['name'],
            data['city'],
            data['country'])

        if hit_count > 0:
            logger.info(
                'SDNCheck function called for basket [%d]. It received %d hit(s).',
                request.basket.id,
                hit_count,
            )
            return hit_count

        logger.info(
            'SDNCheck function called for basket [%d]. It did not receive a hit.',
            request.basket.id,
        )
        return None

    def _get_basket(self, payment_intent_id):
        """
        Retrieve a basket using a payment intent ID.

        Arguments:
            payment_intent_id: payment_intent_id received from Stripe.

        Returns:
            It will return related basket or log exception and return None if
            duplicate payment_intent_id* received or any other exception occurred.
        """
        try:
            payment_intent_id_attribute, __ = BasketAttributeType.objects.get_or_create(
                name=PAYMENT_INTENT_ID_ATTRIBUTE
            )
            basket_attribute = BasketAttribute.objects.get(
                attribute_type=payment_intent_id_attribute,
                value_text=payment_intent_id,
            )
            basket = basket_attribute.basket
            basket.strategy = strategy.Default()

            Applicator().apply(basket, basket.owner, self.request)
            logger.info(
                'Applicator applied, basket id: [%s]. Processed by [%s].',
                basket.id, self.payment_processor.NAME)

            basket_add_organization_attribute(basket, self.request.GET)
        except MultipleObjectsReturned:
            logger.warning(u"Duplicate payment_intent_id [%s] received from Stripe.", payment_intent_id)
            return None
        except ObjectDoesNotExist:
            logger.warning(u"Could not find payment_intent_id [%s] among baskets.", payment_intent_id)
            return None
        except Exception:  # pylint: disable=broad-except
            logger.exception(u"Unexpected error during basket retrieval while executing Stripe payment.")
            return None
        return basket

    def post(self, request):
        """
        Handle an incoming payment submission from the payment MFE after capture-context.
        SDN Check and confirmation by Stripe on the payment intent is performed.
        """
        stripe_response = request.POST.dict()
        payment_intent_id = stripe_response.get('payment_intent_id')

        basket = self._get_basket(payment_intent_id)

        if not basket:
            logger.info(
                'Received Stripe payment notification for non-existent basket with payment intent id [%s].',
                payment_intent_id,
            )
            return redirect(self.payment_processor.error_url)

        logger.info(
            '%s called for Stripe payment intent id [%s], basket [%d] with status [%s], and order number [%s].',
            self.__class__.__name__,
            request.POST.get('payment_intent_id'),
            basket.id,
            basket.status,
            basket.order_number,
        )

        # Check if skus in basket match what the frontend has
        # This is intended to prevent undesired behavior where a user opens up
        # 2 tabs in their browser to buy 2 courses, attempts to purchase the
        # course in the 1st tab, but receives the course in the 2nd tab
        # (the 2nd course is "correctly" displayed on the receipt page).
        # Why?
        # The basket in ecommerce is updated with the product of the
        # 2nd tab when it is loaded. When purchase is clicked on the 1st tab,
        # the checkout happens for the user and the basket... but not with the
        # course listed on the 1st tab's display.
        # What to do?
        # When the frontend makes a purchase, they have the product SKUs available
        # to them. Let's hand those to the backend and verify what they think
        # they are buying matches what we have in the basket. If not, throw
        # an error and stop the purchase.
        request_skus = stripe_response.get('skus')
        if request_skus:
            request_skus = set(request_skus.split(','))
            basket_skus = set(basket.lines.values_list(
                'stockrecord__partner_sku',
                flat=True
            ))
            if request_skus != basket_skus:
                logger.warning(
                    'Basket [%d] SKU mismatch! request_skus [%s] and basket_skus [%s].',
                    basket.id,
                    request_skus,
                    basket_skus,
                )
                return self.sku_mismatch_error_response()

        # SDN Check here!
        billing_address_obj = self.payment_processor.get_address_from_token(
            payment_intent_id
        )
        sdn_check_data = {
            # Stripe has 1 name field so we use first_name on billing_address_obj
            'name': billing_address_obj.first_name,
            'city': billing_address_obj.city,
            'country': billing_address_obj.country_id,
        }
        sdn_check_failure = self.check_sdn(self.request, sdn_check_data)
        if sdn_check_failure is not None:
            return self.sdn_error_page_response(sdn_check_failure)

        try:
            with transaction.atomic():
                try:
                    self.handle_payment(stripe_response, basket)
                except CardError as err:
                    return self.stripe_error_response(err)
        except:  # pylint: disable=bare-except
            logger.exception('Attempts to handle payment for basket [%d] failed.', basket.id)
            return self.error_page_response()

        try:
            billing_address = self.create_billing_address(
                user=self.request.user,
                billing_address=billing_address_obj
            )
        except Exception as err:  # pylint: disable=broad-except
            logger.exception('Error creating billing address for basket [%d]: %s', basket.id, err)
            billing_address = None

        try:
            order = self.create_order(request, basket, billing_address)
            self.handle_post_order(order)
        except Exception:  # pylint: disable=broad-except
            logger.exception(
                'Error processing order for transaction [%s], with order [%s] and basket [%d]. Processed by [%s].',
                payment_intent_id,
                basket.order_number,
                basket.id,
                self.payment_processor.NAME,
            )
            return self.error_page_response()

        return self.receipt_page_response(basket)

    def error_page_response(self):
        """Tell the frontend to redirect to a generic error page."""
        return JsonResponse({}, status=400)

    def sku_mismatch_error_response(self):
        """Tell the frontend the SKU in the request does not match the basket."""
        return JsonResponse({
            'sku_error': True,
        }, status=400)

    def sdn_error_page_response(self, hit_count):
        """Tell the frontend to redirect to the SDN error page."""
        return JsonResponse({
            'sdn_check_failure': {'hit_count': hit_count}
        }, status=400)

    def receipt_page_response(self, basket):
        """Tell the frontend to redirect to the receipt page."""
        receipt_page_url = get_receipt_page_url(
            self.request,
            order_number=basket.order_number,
            site_configuration=basket.site.siteconfiguration,
            disable_back_button=True
        )
        return JsonResponse({
            'receipt_page_url': receipt_page_url,
        }, status=201)

    def stripe_error_response(self, error):
        """Tell the frontend that a Stripe error has occurred."""
        return JsonResponse({
            'error_code': error.code,
            'user_message': error.user_message,
        }, status=400)

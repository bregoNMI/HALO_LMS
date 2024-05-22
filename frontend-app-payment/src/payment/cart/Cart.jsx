import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage, injectIntl, intlShape } from '@edx/frontend-platform/i18n';
import { Collapsible } from '@openedx/paragon';

import messages from './Cart.messages';
import { cartSelector, currencyDisclaimerSelector } from '../data/selectors';
import { ORDER_TYPES } from '../data/constants';

import BulkOrderSummaryTable from './BulkOrderSummaryTable';
import CartSkeleton from './CartSkeleton';
import CartContents from './CartContents';
import CouponForm from './CouponForm';
import { CurrencyDisclaimer } from './CurrencyDisclaimer';
import OrderSummary from './OrderSummary';
import OrderDetails from './order-details';
import Offers from './Offers';
import ProductLineItem from './ProductLineItem';
import SummaryTable from './SummaryTable';
import TotalTable from './TotalTable';
import UpdateQuantityForm from './UpdateQuantityForm';

class Cart extends React.Component {
  renderCart() {
    const {
      products,
      orderType,
      isCurrencyConverted,
      isNumEnrolledExperiment,
      REV1045Experiment,
      isTransparentPricingExperiment,
      enrollmentCountData,
      orderTotal,
      showCouponForm,
      summaryPrice,
      summarySubtotal,
      summaryQuantity,
      summaryDiscounts,
      offers,
      loaded,
    } = this.props;

    const isBulkOrder = orderType === ORDER_TYPES.BULK_ENROLLMENT;

    return (
      <div>
        <span className="sr-only">
          <FormattedMessage
            id="payment.screen.reader.cart.details.loaded"
            defaultMessage="Shopping cart details are loaded."
            description="Screen reader text to be read when cart details load."
          />
        </span>

        <CartContents>
          {products.map(product => (
            <ProductLineItem
              key={product.title}
              isNumEnrolledExperiment={isNumEnrolledExperiment}
              REV1045Experiment={REV1045Experiment}
              enrollmentCountData={enrollmentCountData}
              {...product}
            />
          ))}

          {isBulkOrder ? <UpdateQuantityForm /> : null}
        </CartContents>

        {!REV1045Experiment || loaded
          ? (
            <OrderSummary> {isBulkOrder ? (
              <BulkOrderSummaryTable
                price={summaryPrice}
                subtotal={summarySubtotal}
                quantity={summaryQuantity}
              />
            ) : (<SummaryTable price={summaryPrice} />)}
              <Offers
                discounts={summaryDiscounts}
                offers={offers}
                isBundle={products.length > 1}
              />

              {showCouponForm
                ? <CouponForm /> : null}

              <TotalTable total={orderTotal} />

              {isCurrencyConverted ? (
                <CurrencyDisclaimer
                  currencyDisclaimerSelector={currencyDisclaimerSelector}
                />
              ) : null}
            </OrderSummary>
          ) : (
            <>
              <div className="skeleton py-2 mb-3 w-50" />
              <div className="skeleton py-2 mb-2" />
              <div className="skeleton py-2 mb-5" />
            </>
          )}

        {isTransparentPricingExperiment
          ? (
            <Collapsible
              styling="basic"
              title="Fair-Price Promise"
              className="pb-5 pt-1 mt-n5"
              id="fair-price-collapsible"
            >
              <p style={{ textAlign: 'justify' }}>Major brands in online education markup their products 2-5x the actual cost due to subscription pricing. We do things differently. To make online education accessible to everyone everywhere, we keep our pricing simple and transparent. A one-time investment will bring you an array of possibilities; whether entering the job market, changing fields, seeking promotion or exploring new interests, edX delivers courses for curious minds with an affordable price tag.</p>
            </Collapsible>
          ) : null }

        <OrderDetails REV1045Experiment={REV1045Experiment} products={products} />
      </div>
    );
  }

  render() {
    const {
      intl,
      loading,
      REV1045Experiment,
    } = this.props;

    return (
      <section
        aria-live="polite"
        aria-relevant="all"
        aria-label={intl.formatMessage(messages['payment.section.cart.label'])}
      >
        {!REV1045Experiment && loading ? <CartSkeleton /> : this.renderCart() }
      </section>
    );
  }
}

Cart.propTypes = {
  intl: intlShape.isRequired,
  isNumEnrolledExperiment: PropTypes.bool,
  REV1045Experiment: PropTypes.bool,
  isTransparentPricingExperiment: PropTypes.bool,
  enrollmentCountData: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    enrollment_count: PropTypes.number,
  })),
  loading: PropTypes.bool,
  loaded: PropTypes.bool,
  products: PropTypes.arrayOf(PropTypes.shape({
    imageUrl: PropTypes.string,
    title: PropTypes.string,
    certificateType: PropTypes.oneOf(['audit', 'honor', 'verified', 'no-id-professional', 'professional', 'credit']),
  })),
  showCouponForm: PropTypes.bool,
  orderType: PropTypes.oneOf(Object.values(ORDER_TYPES)),
  isCurrencyConverted: PropTypes.bool,
  orderTotal: PropTypes.number,
  offers: PropTypes.arrayOf(PropTypes.shape({
    benefitType: PropTypes.oneOf(['Percentage', 'Absolute']).isRequired,
    benefitValue: PropTypes.number.isRequired,
    provider: PropTypes.string,
  })),
  summarySubtotal: PropTypes.number,
  summaryQuantity: PropTypes.number,
  summaryDiscounts: PropTypes.number,
  summaryPrice: PropTypes.number,
};

Cart.defaultProps = {
  isNumEnrolledExperiment: false,
  REV1045Experiment: false,
  isTransparentPricingExperiment: false,
  enrollmentCountData: null,
  loading: true,
  loaded: false,
  products: [],
  orderType: ORDER_TYPES.SEAT,
  showCouponForm: false,
  isCurrencyConverted: false,
  orderTotal: undefined,
  offers: [],
  summarySubtotal: undefined,
  summaryQuantity: undefined,
  summaryDiscounts: undefined,
  summaryPrice: undefined,
};

export default connect(cartSelector)(injectIntl(Cart));

/* eslint-disable max-len */
import React from 'react';
import { useSelector } from 'react-redux';
import {
  FormattedMessage, useIntl,
} from '@edx/frontend-platform/i18n';

import messages from '../../payment/cart/Cart.messages';
import { detailsSelector } from '../data/details/selectors';

import OrderSummary from '../../payment/cart/OrderSummary';
import ProductLineItem from '../../payment/cart/ProductLineItem';

import SubscriptionDetailsSkeleton from './skeleton/SubscriptionDetailsSkeleton';
import SubscriptionLegal from './legal/SubscriptionLegal';
import SubscriptionContent from './content/SubscriptionContent';
import { SubscriptionTotalTable } from './total-table/SubscriptionTotalTable';
import { SubscriptionSummaryTablePrice } from './summary-table/SubscriptionSummaryTablePrice';
import { SubscriptionOrderDetails } from './order-details/SubscriptionOrderDetails';

/**
 * SubscriptionDetails component
 * renders the subscription details
 */
export const SubscriptionDetails = () => {
  const intl = useIntl();
  const {
    loading,
    loaded,
    products,
    programTitle,
    organizations,
    price,
    programType,
    currency,
    totalPrice,
    isTrialEligible,
    programUuid,
    paymentMethod,
  } = useSelector(detailsSelector);

  const programDetails = {
    programTitle,
    programType,
    organizations,
    price,
  };

  const renderDetails = () => (
    <div>
      <span className="sr-only">
        <FormattedMessage
          id="subscription.screen.reader.details.loaded"
          defaultMessage="Shopping details are loaded."
          description="Screen reader text to be read when details load."
        />
      </span>

      <SubscriptionContent details={programDetails}>
        {products.map(product => (
          <ProductLineItem
            key={product.title}
            {...product}
          />
        ))}
      </SubscriptionContent>
      {loaded
        ? (
          <OrderSummary
            isSubscription
            subscriptionEventProps={{
              isTrialEligible,
              isNewSubscription: isTrialEligible,
              paymentProcessor: paymentMethod,
              programUuid,
            }}
          >
            <SubscriptionSummaryTablePrice
              price={price}
              isTrialEligible={isTrialEligible}
              currency={currency}
            />
            <SubscriptionTotalTable
              total={totalPrice}
              currency={currency}
            />
          </OrderSummary>
        ) : (
          <>
            <div className="skeleton py-2 mb-3 w-50" />
            <div className="skeleton py-2 mb-2" />
            <div className="skeleton py-2 mb-5" />
          </>
        )}
      <SubscriptionOrderDetails programTitle={programDetails.programTitle} />
      <SubscriptionLegal
        programTitle={programDetails.programTitle}
        price={programDetails.price}
        currency={currency}
      />
    </div>
  );

  return (
    <section
      aria-live="polite"
      aria-relevant="all"
      aria-label={intl.formatMessage(messages['payment.section.cart.label'])}
    >
      {loading ? <SubscriptionDetailsSkeleton /> : renderDetails() }
    </section>
  );
};

export default SubscriptionDetails;

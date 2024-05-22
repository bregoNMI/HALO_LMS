import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { reduxForm, SubmissionError } from 'redux-form';
import { sendTrackEvent } from '@edx/frontend-platform/analytics';
import { injectIntl } from '@edx/frontend-platform/i18n';

import CardDetails from './CardDetails';
import CardHolderInformation from './CardHolderInformation';
import PlaceOrderButton from './PlaceOrderButton';
import {
  getRequiredFields, validateCardDetails, validateRequiredFields, validateAsciiNames,
} from './utils/form-validators';
import { updateCaptureKeySelector, updateSubmitErrorsSelector } from '../../data/selectors';
import { fetchCaptureKey } from '../../data/actions';
import { markPerformanceIfAble, getPerformanceProperties } from '../../performanceEventing';
import { ErrorFocusContext } from './contexts';

export class PaymentFormComponent extends React.Component {
  constructor(props) {
    super(props);
    this.formRef = React.createRef();
    this.state = {
      firstErrorId: null,
      shouldFocusFirstError: false,
    };
  }

  componentDidMount() {
    markPerformanceIfAble('Payment Form component rendered');
    sendTrackEvent(
      'edx.bi.ecommerce.payment_mfe.payment_form_rendered',
      {
        ...getPerformanceProperties(),
        paymentProcessor: 'Cybersource',
      },
    );
    this.props.fetchCaptureKey();
  }

  componentDidUpdate() {
    this.focusFirstError();
  }

  onSubmit = (values) => {
    // istanbul ignore if
    if (this.props.disabled) { return; }
    this.setState({ shouldFocusFirstError: true });
    const requiredFields = getRequiredFields(values, this.props.isBulkOrder);
    const {
      firstName,
      lastName,
      address,
      unit,
      city,
      country,
      state,
      postalCode,
      cardExpirationMonth,
      cardExpirationYear,
      organization,
      purchasedForOrganization,
    } = values;

    const errors = {
      ...validateRequiredFields(requiredFields),
      ...validateAsciiNames(
        firstName,
        lastName,
      ),
      ...validateCardDetails(
        cardExpirationMonth,
        cardExpirationYear,
      ),
    };

    if (Object.keys(errors).length > 0) {
      throw new SubmissionError(errors);
    }

    this.props.onSubmitPayment({
      cardHolderInfo: {
        firstName,
        lastName,
        address,
        unit,
        city,
        country,
        state,
        postalCode,
        organization,
        purchasedForOrganization,
      },
      cardDetails: {
        cardExpirationMonth,
        cardExpirationYear,
      },
    });
  };

  focusFirstError() {
    if (
      this.state.shouldFocusFirstError
      && Object.keys(this.props.submitErrors).length > 0
    ) {
      const form = this.formRef.current;
      const elementSelectors = Object.keys(this.props.submitErrors).map((fieldName) => `[id=${fieldName}]`);
      const firstElementWithError = form.querySelector(elementSelectors.join(', '));
      if (firstElementWithError) {
        if (['input', 'select'].includes(firstElementWithError.tagName.toLowerCase())) {
          firstElementWithError.focus();
          this.setState({ shouldFocusFirstError: false, firstErrorId: null });
        } else if (this.state.firstErrorId !== firstElementWithError.id) {
          this.setState({
            firstErrorId: firstElementWithError.id,
          });
        }
      }
    }
  }

  render() {
    const {
      handleSubmit,
      loading,
      disabled,
      isProcessing,
      isBulkOrder,
      isQuantityUpdating,
    } = this.props;

    const showLoadingButton = (loading || isQuantityUpdating || !window.microform) && !isProcessing;

    return (
      <ErrorFocusContext.Provider value={this.state.firstErrorId}>
        <form
          data-testid="payment-form"
          onSubmit={handleSubmit(this.onSubmit)}
          ref={this.formRef}
          noValidate
        >
          <CardHolderInformation
            showBulkEnrollmentFields={isBulkOrder}
            disabled={disabled}
          />
          <CardDetails
            disabled={disabled}
          />
          <PlaceOrderButton
            onSubmitButtonClick={this.props.onSubmitButtonClick}
            showLoadingButton={showLoadingButton}
            disabled={disabled}
            isProcessing={isProcessing}
          />
        </form>
      </ErrorFocusContext.Provider>
    );
  }
}

PaymentFormComponent.propTypes = {
  handleSubmit: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  isProcessing: PropTypes.bool,
  isBulkOrder: PropTypes.bool,
  isQuantityUpdating: PropTypes.bool,
  loading: PropTypes.bool,
  onSubmitPayment: PropTypes.func.isRequired,
  onSubmitButtonClick: PropTypes.func.isRequired,
  submitErrors: PropTypes.objectOf(PropTypes.string),
  fetchCaptureKey: PropTypes.func.isRequired,
};

PaymentFormComponent.defaultProps = {
  disabled: false,
  loading: true,
  isBulkOrder: false,
  isQuantityUpdating: false,
  isProcessing: false,
  submitErrors: {},
};

const mapStateToProps = (state) => {
  const newProps = {
    ...updateCaptureKeySelector(state),
    ...updateSubmitErrorsSelector('payment')(state),
  };
  return newProps;
};

// The key `form` here needs to match the key provided to
// combineReducers when setting up the form reducer.
export default reduxForm({ form: 'payment' })(connect(
  mapStateToProps,
  {
    fetchCaptureKey,
  },
)(injectIntl(PaymentFormComponent)));

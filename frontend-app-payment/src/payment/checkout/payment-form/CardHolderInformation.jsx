import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { clearFields, Field } from 'redux-form';
import {
  injectIntl, intlShape, FormattedMessage, getCountryList, getLocale,
} from '@edx/frontend-platform/i18n';

import FormInput from './FormInput';
import FormSelect from './FormSelect';
import { isPostalCodeRequired } from './utils/form-validators';

import messages from './CardHolderInformation.messages';
import StateProvinceFormInput from './StateProvinceFormInput';

export class CardHolderInformationComponent extends React.Component {
  constructor(props) {
    super(props);

    this.state = { selectedCountry: null };
    this.countryOptions = getCountryList(getLocale()).map(({ code, name }) => ({ value: code, label: name }));
  }

  handleSelectCountry = (event, newValue) => {
    this.setState({ selectedCountry: newValue });
    this.props.clearFields('payment', false, false, ['state']);
  };

  handlePostalCodeLabel(shouldRequirePostalCode) {
    if (shouldRequirePostalCode) {
      return (
        <FormattedMessage
          id="payment.card.holder.information.postal.code.label.required"
          defaultMessage="Zip/Postal Code (required)"
          description="The label for the card holder zip/postal code field (required)"
        />
      );
    }
    return (
      <FormattedMessage
        id="payment.card.holder.information.postal.code.label"
        defaultMessage="Zip/Postal Code"
        description="The label for the card holder zip/postal code field"
      />
    );
  }

  renderCountryOptions() {
    const items = [(
      <option key="" value="">
        {this.props.intl.formatMessage(messages['payment.card.holder.information.country.options.empty'])}
      </option>
    )];
    for (let i = 0; i < this.countryOptions.length; i += 1) {
      const { value, label } = this.countryOptions[i];
      items.push(<option key={value} value={value}>{label}</option>);
    }
    return items;
  }

  render() {
    const { disabled, showBulkEnrollmentFields } = this.props;
    const shouldRequirePostalCode = isPostalCodeRequired(this.state.selectedCountry)
    && this.props.enableStripePaymentProcessor;

    return (
      <div className="basket-section">
        <h5 aria-level="2">
          <FormattedMessage
            id="payment.card.holder.information.heading"
            defaultMessage="Card Holder Information"
            description="The heading for the credit card holder information form"
          />
        </h5>
        <div className="row">
          <div className="col-lg-6 form-group">
            <label htmlFor="firstName">
              <FormattedMessage
                id="payment.card.holder.information.first.name.label"
                defaultMessage="First Name (required)"
                description="The label for the required card holder first name field"
              />
            </label>
            <Field
              id="firstName"
              name="firstName"
              component={FormInput}
              type="text"
              required
              disabled={disabled}
              autoComplete="given-name"
            />
          </div>
          <div className="col-lg-6 form-group">
            <label htmlFor="lastName">
              <FormattedMessage
                id="payment.card.holder.information.last.name.label"
                defaultMessage="Last Name (required)"
                description="The label for the required card holder last name field"
              />
            </label>
            <Field
              id="lastName"
              name="lastName"
              component={FormInput}
              type="text"
              required
              disabled={disabled}
              autoComplete="family-name"
            />
          </div>
        </div>

        {showBulkEnrollmentFields ? (
          <div className="row">
            <div className="col-lg-6 form-group">
              <label htmlFor="organization">
                <FormattedMessage
                  id="payment.card.holder.information.organization.label"
                  defaultMessage="Organization (required)"
                  description="The label for the required organization field"
                />
              </label>
              <Field
                id="organization"
                name="organization"
                component={FormInput}
                type="text"
                required
                disabled={disabled}
                autoComplete="organization"
              />
            </div>
          </div>
        ) : null}

        <div className="row">
          <div className="col-lg-6 form-group">
            <label htmlFor="address">
              <FormattedMessage
                id="payment.card.holder.information.address.label"
                defaultMessage="Address (required)"
                description="The label for the required card holder address field"
              />
            </label>
            <Field
              id="address"
              name="address"
              component={FormInput}
              type="text"
              required
              disabled={disabled}
              autoComplete="street-address"
              maxLength="60"
            />
          </div>
          <div className="col-lg-6 form-group">
            <label htmlFor="unit">
              <FormattedMessage
                id="payment.card.holder.information.unit.label"
                defaultMessage="Suite/Apartment Number"
                description="The label for the card holder suite/apartment number field"
              />
            </label>
            <Field
              id="unit"
              name="unit"
              component={FormInput}
              type="text"
              disabled={disabled}
              autoComplete="address-line2"
              maxLength="29"
            />
          </div>
        </div>

        <div className="row">
          <div className="col-lg-6 form-group">
            <label htmlFor="city">
              <FormattedMessage
                id="payment.card.holder.information.city.label"
                defaultMessage="City (required)"
                description="The label for the required card holder city field"
              />
            </label>
            <Field
              id="city"
              name="city"
              component={FormInput}
              type="text"
              required
              disabled={disabled}
              autoComplete="address-level2"
              maxLength="32"
            />
          </div>
          <div className="col-lg-6 form-group">
            <label htmlFor="country">
              <FormattedMessage
                id="payment.card.holder.information.country.label"
                defaultMessage="Country (required)"
                description="The label for the required card holder country field"
              />
            </label>
            <div data-hj-suppress>
              <Field
                id="country"
                name="country"
                component={FormSelect}
                options={this.renderCountryOptions()}
                required
                onChange={this.handleSelectCountry}
                disabled={disabled}
                autoComplete="country"
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-6 form-group">
            <StateProvinceFormInput
              country={this.state.selectedCountry}
              disabled={disabled}
              id="state"
              autoComplete="address-level1"
              maxLength="20"
            />
          </div>
          <div className="col-lg-6 form-group">
            <label htmlFor="postalCode">
              {this.handlePostalCodeLabel(shouldRequirePostalCode)}
            </label>
            <Field
              id="postalCode"
              name="postalCode"
              component={FormInput}
              type="text"
              disabled={disabled}
              autoComplete="postal-code"
              maxLength="9"
              required={shouldRequirePostalCode}
            />
          </div>
        </div>
        {showBulkEnrollmentFields ? (
          <div className="row form-group justify-content-start align-items-center">
            <div className="col-0 pr-0 pl-3">
              <Field
                id="purchasedForOrganization"
                name="purchasedForOrganization"
                component={FormInput}
                type="checkbox"
              />
            </div>
            <div className="col">
              <label
                htmlFor="purchasedForOrganization"
                className="mb-0"
              >
                <FormattedMessage
                  id="payment.card.holder.information.purchased.for.organization"
                  defaultMessage="I am purchasing on behalf of my employer or other professional organization"
                  decription="checkbox for if the purchaser is buying this course on behalf of an organization"
                />
              </label>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
}

CardHolderInformationComponent.propTypes = {
  clearFields: PropTypes.func.isRequired,
  intl: intlShape.isRequired,
  disabled: PropTypes.bool,
  enableStripePaymentProcessor: PropTypes.bool,
  showBulkEnrollmentFields: PropTypes.bool,
};

CardHolderInformationComponent.defaultProps = {
  disabled: false,
  enableStripePaymentProcessor: false,
  showBulkEnrollmentFields: false,
};

export default connect(
  null,
  { clearFields },
)(injectIntl(CardHolderInformationComponent));

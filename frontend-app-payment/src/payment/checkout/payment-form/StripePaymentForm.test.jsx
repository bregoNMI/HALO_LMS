/* eslint-disable react/jsx-no-constructed-context-values */
import React from 'react';
import * as reactRedux from 'react-redux';
import { createStore } from 'redux';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider, configure as configureI18n } from '@edx/frontend-platform/i18n';
import { Factory } from 'rosie';
import configureMockStore from 'redux-mock-store';

import { Elements } from '@stripe/react-stripe-js';
import { AppContext } from '@edx/frontend-platform/react';
import StripePaymentForm from './StripePaymentForm';
import * as formValidators from './utils/form-validators';
import createRootReducer from '../../../data/reducers';
import '../../__factories__/userAccount.factory';
import * as mocks from '../stripeMocks';
import { basketSelector } from '../../data/selectors';

jest.mock('@edx/frontend-platform/analytics', () => ({
  sendTrackEvent: jest.fn(),
}));

jest.useFakeTimers('modern');

const validateRequiredFieldsMock = jest.spyOn(formValidators, 'validateRequiredFields');

const mockStore = configureMockStore();

configureI18n({
  config: {
    ENVIRONMENT: process.env.ENVIRONMENT,
    LANGUAGE_PREFERENCE_COOKIE_NAME: process.env.LANGUAGE_PREFERENCE_COOKIE_NAME,
  },
  loggingService: {
    logError: jest.fn(),
    logInfo: jest.fn(),
  },
  messages: {
    uk: {},
    th: {},
    ru: {},
    'pt-br': {},
    pl: {},
    'ko-kr': {},
    id: {},
    he: {},
    ca: {},
    'zh-cn': {},
    fr: {},
    'es-419': {},
    ar: {},
  },
});

const authenticatedUser = Factory.build('userAccount');

describe('<StripePaymentForm />', () => {
  let store;
  let mockStripe;
  let mockElements;
  let state;
  let mockElement;
  let paymentElement;

  beforeEach(() => {
    store = createStore(createRootReducer(), {});
    mockStripe = mocks.mockStripe();
    mockElement = mocks.mockElement();
    mockElements = mocks.mockElements();
    mockStripe.elements.mockReturnValue(mockElements);
    mockElements.create.mockReturnValue(mockElement);

    state = {
      payment: {
        basket: {
          loading: true,
          loaded: false,
          submitting: false,
          redirect: false,
          isBasketProcessing: false,
          products: [{ sku: '00000' }],
          enableStripePaymentProcessor: true,
        },
        clientSecret: { isClientSecretProcessing: false, clientSecretId: '' },
      },
      feedback: { byId: {}, orderedIds: [] },
      form: {},
    };

    const wrapper = render((
      <IntlProvider locale="en">
        <AppContext.Provider value={{ authenticatedUser }}>
          <reactRedux.Provider store={mockStore(state)}>
            <Elements stripe={mockStripe}>
              <StripePaymentForm
                handleSubmit={() => {}}
                onSubmitPayment={() => {}}
                onSubmitButtonClick={() => {}}
                paymentDataSelector={basketSelector}
              />
            </Elements>
          </reactRedux.Provider>
        </AppContext.Provider>
      </IntlProvider>
    ));
    paymentElement = wrapper.container.querySelectorAll('#payment-element');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('load stripe', () => {
    it('creates the payment element', () => {
      expect(mockElements.create).toHaveBeenCalledWith('payment', null);
      expect(paymentElement.length > 0).toBe(true);
    });
  });

  describe('getRequiredFields', () => {
    it('returns expected required fields', () => {
      const testFormValues = [
        {
          firstName: '',
          lastName: '',
          address: '',
          city: '',
          country: 'AQ', // Antarctica does not have states, postal code not required
          optionalField: '',
        },
        {
          firstName: '',
          lastName: '',
          address: '',
          city: '',
          country: 'GB', // United Kingdom has states, state becomes required, postal code is required
          postalCode: '',
          state: '',
          optionalField: '',
        },
        {
          firstName: '',
          lastName: '',
          address: '',
          city: '',
          country: 'CA', // Canada state and postal code are required
          postalCode: '',
          state: '',
          optionalField: '',
        },
        {
          firstName: '',
          lastName: '',
          address: '',
          city: '',
          country: 'US', // United States state and postal code are required
          postalCode: '',
          state: '',
          optionalField: '',
        },
        {
          firstName: '',
          lastName: '',
          address: '',
          city: '',
          country: 'IN', // India state is required
          state: '',
          optionalField: '',
        },
      ];

      testFormValues.forEach((formValues) => {
        const requiredFields = formValidators.getRequiredFields(formValues, false, true);
        const { optionalField, ...expectedRequiredFields } = formValues;
        expect(requiredFields).toStrictEqual(expectedRequiredFields);
      });
    });

    it('returns organization fields for a bulk order', () => {
      const isBulkOrder = true;
      render((
        <IntlProvider locale="en">
          <AppContext.Provider value={{ authenticatedUser }}>
            <reactRedux.Provider store={store}>
              <Elements stripe={mockStripe}>
                <StripePaymentForm
                  isBulkOrder
                  handleSubmit={() => {}}
                  onSubmitPayment={() => {}}
                  onSubmitButtonClick={() => {}}
                  paymentDataSelector={basketSelector}
                />
              </Elements>
            </reactRedux.Provider>
          </AppContext.Provider>
        </IntlProvider>
      ));

      const formValues = {
        firstName: '',
        lastName: '',
        address: '',
        city: '',
        country: 'UK',
        cardNumber: '',
        securityCode: '',
        cardExpirationMonth: '',
        cardExpirationYear: '',
        optionalField: '',
        organization: 'edx',
      };

      const requiredFields = formValidators.getRequiredFields(formValues, isBulkOrder);
      expect(formValues.organization).toEqual(requiredFields.organization);
    });
  });
  describe('onSubmit', () => {
    it('throws expected errors', () => {
      state = {
        payment: {
          basket: {
            loading: true,
            loaded: false,
            submitting: false,
            redirect: false,
            isBasketProcessing: false,
            products: [{ sku: '00000' }],
            enableStripePaymentProcessor: true,
          },
          clientSecret: { isClientSecretProcessing: false, clientSecretId: '' },
        },
        feedback: { byId: {}, orderedIds: [] },
        form: {
          payment: {
            submitErrors: { firstName: 'error' },
          },
        },
      };
      const submitStripePayment = jest.fn();
      render((
        <IntlProvider locale="en">
          <AppContext.Provider value={{ authenticatedUser }}>
            <reactRedux.Provider store={mockStore(state)}>
              <Elements stripe={mockStripe}>
                <StripePaymentForm
                  handleSubmit={() => {}}
                  onSubmitPayment={() => submitStripePayment}
                  onSubmitButtonClick={() => {}}
                  shouldFocusFirstError
                  firstErrorId={null}
                  paymentDataSelector={basketSelector}
                  isProcessing
                />
              </Elements>
            </reactRedux.Provider>
          </AppContext.Provider>
        </IntlProvider>
      ));
      const SubmissionError = jest.fn();
      const testData = [
        [
          { firstName: 'This field is required' },
          new SubmissionError({
            firstName: 'This field is required',
          }),
        ],
        [
          {},
          null,
        ],
      ];

      testData.forEach((testCaseData) => {
        validateRequiredFieldsMock.mockReturnValueOnce(testCaseData[0]);
        if (testCaseData[1]) {
          expect(() => fireEvent.click(screen.getByText('Place Order')));
          expect(submitStripePayment).not.toHaveBeenCalled();
        } else {
          expect(() => fireEvent.click(screen.getByText('Place Order'))).not.toThrow();
        }
      });
    });
  });

  describe('validateRequiredFields', () => {
    it('returns errors if values are empty', () => {
      const values = {
        firsName: 'Jane',
        lastName: undefined,
      };
      const expectedErrors = {
        lastName: 'payment.form.errors.required.field',
      };
      expect(formValidators.validateRequiredFields(values)).toEqual(expectedErrors);
    });
  });
});

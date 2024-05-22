import { logError } from '@edx/frontend-platform/logging';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { handleApiError } from '../../data/handleRequestError';

import checkout from './service';

jest.mock('@edx/frontend-platform/logging', () => ({
  logError: jest.fn(),
}));

jest.mock('../../data/handleRequestError');

jest.mock('@edx/frontend-platform/auth');

const axiosMock = new MockAdapter(axios);
getAuthenticatedHttpClient.mockReturnValue(axios);

beforeEach(() => {
  axiosMock.reset();
  logError.mockReset();
});

describe('Stripe Service', () => {
  const paymentIntent = {
    id: 'pi_3LsftNIadiFyUl1x2TWxaADZ',
  };
  const stripe = { updatePaymentIntent: jest.fn(() => Promise.resolve({ paymentIntent })) };
  const { STRIPE_RESPONSE_URL } = process.env;
  const mockSetLocation = jest.fn();
  const basket = { basketId: 1 };
  const skus = '8CF08E5';
  const elements = jest.fn();
  const context = jest.fn();
  context.authenticatedUser = { email: 'example@example.com' };

  const values = {
    firstName: 'John',
    lastName: 'Smith',
    address: '123 House Lane',
    unit: '1',
    city: 'TownVille',
    country: 'USA',
    state: 'New York',
    postalCode: '12345',
    organization: 'My Company',
    purchasedForOrganization: true,
  };

  it('should generate and submit a form on success', async () => {
    const successResponseData = { receipt_page_url: 'mock://receipt.page' };
    axiosMock.onPost(STRIPE_RESPONSE_URL).reply(200, successResponseData);
    await checkout(basket, {
      skus, elements, stripe, context, values,
    }, mockSetLocation).then(() => {
      expect(mockSetLocation).toHaveBeenCalledWith(successResponseData.receipt_page_url);
    });
  });

  it('should throw an error if the stripe checkout request errors on the SDN check', async () => {
    const errorResponseData = {
      error: 'There was an error submitting the basket',
      sdn_check_failure: { hit_count: 1 },
    };

    axiosMock.onPost(STRIPE_RESPONSE_URL).reply(403, errorResponseData);
    mockSetLocation.mockClear();

    expect.hasAssertions();
    await expect(checkout(basket, {
      skus, elements, stripe, context, values,
    }, mockSetLocation)).rejects.toEqual(
      new Error('This card holder did not pass the SDN check.'),
    );
    expect(logError).toHaveBeenCalledWith(expect.any(Error), {
      messagePrefix: 'SDN Check Error',
      paymentMethod: 'Stripe',
      paymentErrorType: 'SDN Check Submit Api',
      basketId: basket.basketId,
    });
  });

  it('should throw and log on error', async () => {
    axiosMock.onPost(STRIPE_RESPONSE_URL).reply(403);

    await checkout(basket, {
      skus, elements, stripe, context, values,
    }, mockSetLocation).catch(() => {
      expect(logError)
        .toHaveBeenCalledWith(expect.any(Error), {
          messagePrefix: 'Stripe Submit Error',
          paymentMethod: 'Stripe',
          paymentErrorType: 'Submit Error',
          basketId: basket.basketId,
        });
      expect(handleApiError).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

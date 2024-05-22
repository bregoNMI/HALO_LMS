import { Factory } from 'rosie'; // eslint-disable-line import/no-extraneous-dependencies

Factory.define('subscriptionStatus')
  .attrs({
    confirmation_client_secret: '3asd-3nk3-2kl3-kl32-32lw',
    status: 'succeeded', // CONFIRMATION_STATUS.succeeded,
    subscription_id: 'SUB_in32n32ds',
    price: 79.00,
    paymentMethodId: 'pm_3A3d3g4yg4',

    // 3DS
    submitting: false,
    submitted: false,
  });

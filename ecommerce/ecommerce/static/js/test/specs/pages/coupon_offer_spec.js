define([
    'jquery',
    'utils/analytics_utils',
    'pages/coupon_offer_page',
    'models/tracking_model'
],
    function($,
             AnalyticsUtils,
             CouponOfferPage,
             TrackingModel
             ) {
        'use strict';

        describe('Coupon offer page', function() {
            beforeEach(function() {
                $('<a href=""' +
                'id="PurchaseCertificate"' +
                'class="btn btn-success btn-purchase"' +
                'data-track-type="click"' +
                'data-track-event="edx.bi.ecommerce.coupons.accept_offer"' +
                'data-track-category="Coupons accepted offer"' +
                'data-course-id="{{ course.id }}">' +
                'Purchase Certificate' +
                '</a>').appendTo('body');
                $('<script type="text/javascript">var initModelData = {};</script>').appendTo('body');
            });

            afterEach(function() {
                $('body').empty();
            });

            describe('Analytics', function() {
                beforeEach(function() {
                    spyOn(TrackingModel.prototype, 'isTracking').and.callFake(function() {
                        return true;
                    });
                    spyOn(window.analytics, 'track');
                    window.analytics.user = function() {
                        return {id: function() { return null; }};
                    };
                    AnalyticsUtils.analyticsSetUp();
                    new CouponOfferPage();
                });

                it('should trigger purchase certificate event', function() {
                    $('a#PurchaseCertificate').trigger('click');
                    expect(window.analytics.track).toHaveBeenCalledWith(
                        'edx.bi.ecommerce.coupons.accept_offer',
                        {category: 'Coupons accepted offer', type: 'click'}
                    );
                });
            });
        });
    });

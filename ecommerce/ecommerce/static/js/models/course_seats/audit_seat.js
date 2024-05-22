define([
    'underscore',
    'models/course_seats/course_seat'
],
    function(_,
             CourseSeat) {
        'use strict';

        return CourseSeat.extend({
            defaults: _.extend({}, CourseSeat.prototype.defaults,
                {
                    certificate_type: null,
                    id_verification_required: false,
                    price: 0
                }
            )
        }, {seatType: 'audit'});
    }
);

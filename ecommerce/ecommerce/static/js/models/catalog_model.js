define([
    'backbone',
    'backbone.relational'
],
    function(Backbone) {
        'use strict';

        return Backbone.RelationalModel.extend({
            urlRoot: '/api/v2/catalogs/course_catalogs/'
        });
    }
);

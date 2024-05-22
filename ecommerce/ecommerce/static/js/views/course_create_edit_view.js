define([
    'jquery',
    'backbone',
    'backbone.super',
    'underscore',
    'views/course_form_view',
    'text!templates/course_create_edit.html',
    'bootstrap'
],
    function($,
             Backbone,
             BackboneSuper,
             _,
             CourseFormView,
             CourseCreateEditTemplate) {
        'use strict';

        return Backbone.View.extend({
            template: _.template(CourseCreateEditTemplate),
            className: 'course-create-edit-view',

            initialize: function(options) {
                // This indicates if we are editing or creating a course.
                this.editing = options.editing;
            },

            remove: function() {
                if (this.formView) {
                    this.formView.remove();
                    this.formView = null;
                }

                this._super(); // eslint-disable-line no-underscore-dangle
            },

            render: function() {
                var $html,
                    data = this.model.attributes;

                // The form should be instantiated only once.
                this.formView = this.formView || new CourseFormView({editing: this.editing, model: this.model});

                // Render the basic page layout
                data.editing = this.editing;
                $html = $(this.template(data));

                // Render the form
                this.formView.render();
                $html.find('.course-form-outer').html(this.formView.el);

                // Render the complete view
                this.$el.html($html);

                // Activate the tooltips
                this.$el.find('[data-toggle="tooltip"]').tooltip();

                return this;
            }
        });
    }
);

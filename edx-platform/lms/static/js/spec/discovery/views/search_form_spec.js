define(['jquery', 'js/discovery/views/search_form'], function($, SearchForm) {
    'use strict';

    describe('discovery.views.SearchForm', function() {
        beforeEach(function() {
            loadFixtures('js/fixtures/discovery.html');
            this.form = new SearchForm();
            this.onSearch = jasmine.createSpy('onSearch');
            this.form.on('search', this.onSearch);
        });

        it('trims input string', function() {
            var term = '  search string  ';
            $('.discovery-input').val(term);
            $('form').trigger('submit');
            expect(this.onSearch).toHaveBeenCalledWith($.trim(term));
        });

        it('handles calls to doSearch', function() {
            var term = '  search string  ';
            $('.discovery-input').val(term);
            this.form.doSearch(term);
            expect(this.onSearch).toHaveBeenCalledWith($.trim(term));
            expect($('.discovery-input').val()).toBe(term);
            expect($('#discovery-message')).toBeEmpty();
        });

        it('clears search', function() {
            $('.discovery-input').val('somethig');
            this.form.clearSearch();
            expect($('.discovery-input').val()).toBe('');
        });

        it('shows/hides loading indicator', function() {
            this.form.showLoadingIndicator();
            expect($('#loading-indicator')).not.toHaveClass('hidden');
            this.form.hideLoadingIndicator();
            expect($('#loading-indicator')).toHaveClass('hidden');
        });

        it('shows messages', function() {
            this.form.showFoundMessage(123);
            expect($('#discovery-message')).toContainHtml(123);
            this.form.showErrorMessage();
            expect($('#discovery-message')).not.toBeEmpty();
        });

        it('shows not found messages', function() {
            // message should not be displayed if search term is empty
            this.form.showNotFoundMessage();
            expect($('#discovery-message')).toBeEmpty();
            this.form.showNotFoundMessage('xyz');
            expect($('#discovery-message')).not.toBeEmpty();
            expect($('#discovery-message')).toContainHtml('xyz');
        });

        it('shows default error message', function() {
            this.form.showErrorMessage();
            expect(this.form.$message).toContainHtml('There was an error, try searching again.');
        });

        it('shows remote error message', function() {
            // eslint-disable-next-line prefer-const
            let remoteError = 'some-error-message';
            this.form.showErrorMessage(remoteError);
            expect(this.form.$message).toContainHtml(remoteError);
        });
    });
});

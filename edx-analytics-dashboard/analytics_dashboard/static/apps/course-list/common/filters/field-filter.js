/**
 * Returns results that match the field and value.
 */
define(() => {
  'use strict';

  const FieldFilter = function (field, value) {
    this.field = field;
    this.value = value;
  };

  FieldFilter.prototype.filter = function (collection) {
    const filterOptions = {};
    filterOptions[this.field] = this.value;
    return collection.where(filterOptions);
  };

  return FieldFilter;
});

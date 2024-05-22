module.exports = {
  next: null,
  previous: null,
  count: 4,
  numPages: 1,
  currentPage: 1,
  start: 0,
  canAddTaxonomy: true,
  results: [
    {
      id: -2,
      name: 'Content Authors',
      description: 'Allows tags for any user ID created on the instance.',
      enabled: true,
      allowMultiple: false,
      allowFreeText: false,
      systemDefined: true,
      visibleToAuthors: false,
      canChangeTaxonomy: false,
      canDeleteTaxonomy: false,
    },
    {
      id: -1,
      name: 'Languages',
      description: 'lang lang lang lang lang lang lang lang',
      enabled: true,
      allowMultiple: false,
      allowFreeText: false,
      systemDefined: true,
      visibleToAuthors: true,
      canChangeTaxonomy: false,
      canDeleteTaxonomy: false,
    },
    {
      id: 1,
      name: 'Taxonomy',
      description: 'This is a Description',
      enabled: true,
      allowMultiple: false,
      allowFreeText: false,
      systemDefined: false,
      visibleToAuthors: true,
      canChangeTaxonomy: true,
      canDeleteTaxonomy: true,
    },
    {
      id: 2,
      name: 'Taxonomy long long long long long long long long long long long long long long long long long long long',
      description: 'This is a Description long lon',
      enabled: true,
      allowMultiple: false,
      allowFreeText: false,
      systemDefined: false,
      visibleToAuthors: true,
      canChangeTaxonomy: true,
      canDeleteTaxonomy: true,
    },
  ],
};

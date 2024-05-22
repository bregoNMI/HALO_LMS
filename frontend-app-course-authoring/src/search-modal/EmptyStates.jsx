/* eslint-disable react/prop-types */
// @ts-check
import React from 'react';
import { FormattedMessage } from '@edx/frontend-platform/i18n';
import { Alert, Stack } from '@openedx/paragon';

import { useSearchContext } from './manager/SearchManager';
import EmptySearchImage from './images/empty-search.svg';
import NoResultImage from './images/no-results.svg';
import messages from './messages';

const InfoMessage = ({ title, subtitle, image }) => (
  <Stack className="d-flex mt-6 align-items-center">
    <p className="lead"> <FormattedMessage {...title} /> </p>
    <p className="small text-muted"> <FormattedMessage {...subtitle} /> </p>
    <img src={image} alt="" />
  </Stack>
);

/**
 * If the user hasn't put any keywords/filters yet, display an "empty state".
 * Likewise, if the results are empty (0 results), display a special message.
 * Otherwise, display the results, which are assumed to be the children prop.
 * @type {React.FC<{children: React.ReactElement}>}
 */
const EmptyStates = ({ children }) => {
  const {
    canClearFilters: hasFiltersApplied,
    totalHits,
    searchKeywords,
    hasError,
  } = useSearchContext();
  const hasQuery = !!searchKeywords;

  if (hasError) {
    return (
      <Alert variant="danger">
        <FormattedMessage {...messages.searchError} />
      </Alert>
    );
  }
  if (!hasQuery && !hasFiltersApplied) {
    // We haven't started the search yet. Display the "start your search" empty state
    return (
      <InfoMessage
        title={messages.emptySearchTitle}
        subtitle={messages.emptySearchSubtitle}
        image={EmptySearchImage}
      />
    );
  }
  if (totalHits === 0) {
    return (
      <InfoMessage
        title={messages.noResultsTitle}
        subtitle={messages.noResultsSubtitle}
        image={NoResultImage}
      />
    );
  }

  return children;
};

export default EmptyStates;

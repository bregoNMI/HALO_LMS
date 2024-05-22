import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  getLocale, injectIntl, intlShape, isRtl,
} from '@edx/frontend-platform/i18n';

import messages from '../messages';

const ProblemScoreDrawer = ({ intl, problemScores, subsection }) => {
  const isLocaleRtl = isRtl(getLocale());
  return (
    <span className="row w-100 m-0 x-small ml-4 pt-2 pl-1 text-gray-700 flex-nowrap">
      <span id="problem-score-label" className="col-auto p-0">{intl.formatMessage(messages.problemScoreLabel)}</span>
      <div className={classNames('col', 'p-0', { 'greyed-out': !subsection.learnerHasAccess })}>
        <ul className="list-unstyled row w-100 m-0" aria-labelledby="problem-score-label">
          {problemScores.map((problemScore, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={i} className="ml-3">{problemScore.earned}{isLocaleRtl ? '\\' : '/'}{problemScore.possible}</li>
          ))}
        </ul>
      </div>
    </span>
  );
};

ProblemScoreDrawer.propTypes = {
  intl: intlShape.isRequired,
  problemScores: PropTypes.arrayOf(PropTypes.shape({
    earned: PropTypes.number.isRequired,
    possible: PropTypes.number.isRequired,
  })).isRequired,
  subsection: PropTypes.shape({ learnerHasAccess: PropTypes.bool }).isRequired,
};

export default injectIntl(ProblemScoreDrawer);

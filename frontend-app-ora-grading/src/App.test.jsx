import React from 'react';
import { shallow } from '@edx/react-unit-test-utils';

import { App } from './App';

jest.mock('data/redux', () => ({
  app: {
    selectors: {
      courseMetadata: (state) => ({ courseMetadata: state }),
      isEnabled: (state) => ({ isEnabled: state }),
    },
  },
}));

jest.mock('@edx/frontend-component-header', () => ({
  LearningHeader: 'Header',
}));
jest.mock('@edx/frontend-component-footer', () => 'Footer');

jest.mock('containers/DemoWarning', () => 'DemoWarning');
jest.mock('containers/CTA', () => 'CTA');
jest.mock('containers/ListView', () => 'ListView');
jest.mock('components/Head', () => 'Head');

const logo = 'fakeLogo.png';
let el;

describe('App router component', () => {
  const props = {
    courseMetadata: {
      org: 'course-org',
      number: 'course-number',
      title: 'course-title',
    },
    isEnabled: true,
  };
  test('snapshot: enabled', () => {
    expect(shallow(<App {...props} />).snapshot).toMatchSnapshot();
  });
  test('snapshot: disabled (show demo warning)', () => {
    expect(shallow(<App {...props} isEnabled={false} />).snapshot).toMatchSnapshot();
  });
  describe('component', () => {
    beforeEach(() => {
      process.env.LOGO_POWERED_BY_OPEN_EDX_URL_SVG = logo;
      el = shallow(<App {...props} />);
    });
    describe('Router', () => {
      test('Routing - ListView is only route', () => {
        expect(el.instance.findByTestId('main')[0].children).toHaveLength(1);
        expect(el.instance.findByTestId('main')[0].children[0].type).toBe('ListView');
      });
    });
    test('Footer logo drawn from env variable', () => {
      expect(el.instance.findByTestId('footer')[0].props.logo).toEqual(logo);
    });

    test('Header to use courseMetadata props', () => {
      const {
        courseTitle,
        courseNumber,
        courseOrg,
      } = el.instance.findByTestId('header')[0].props;
      expect(courseTitle).toEqual(props.courseMetadata.title);
      expect(courseNumber).toEqual(props.courseMetadata.number);
      expect(courseOrg).toEqual(props.courseMetadata.org);
    });
  });
});

import React from 'react';
import { shallow } from '@edx/react-unit-test-utils';

import FileExtensionCell from './FileExtensionCell';

describe('FileExtensionCell', () => {
  describe('component', () => {
    const props = {
      value: 'file_name.with_extension.pdf',
    };
    let el;
    beforeEach(() => {
      el = shallow(<FileExtensionCell {...props} />);
    });
    test('snapshot', () => {
      expect(el.snapshot).toMatchSnapshot();
    });

    describe('behavior', () => {
      test('content', () => {
        expect(el.instance.children[0].el).toEqual('PDF');
      });
    });
  });
});

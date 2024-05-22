import { shallow } from '@edx/react-unit-test-utils';
import ORASettings from './Settings';

jest.mock('@edx/frontend-platform/i18n', () => ({
  ...jest.requireActual('@edx/frontend-platform/i18n'), // use actual for all non-hook parts
  injectIntl: (component) => component,
  intlShape: {},
}));
jest.mock('yup', () => ({
  boolean: jest.fn().mockReturnValue('Yub.boolean'),
}));
jest.mock('CourseAuthoring/generic/model-store', () => ({
  useModel: jest.fn().mockReturnValue({ documentationLinks: { learnMoreConfiguration: 'https://learnmore.test' } }),
}));
jest.mock('CourseAuthoring/generic/FormSwitchGroup', () => 'FormSwitchGroup');
jest.mock('CourseAuthoring/utils', () => ({
  useAppSetting: jest.fn().mockReturnValue(['abitrary value', jest.fn().mockName('saveSetting')]),
}));
jest.mock('CourseAuthoring/pages-and-resources/app-settings-modal/AppSettingsModal', () => 'AppSettingsModal');

const props = {
  onClose: jest.fn().mockName('onClose'),
  intl: {
    formatMessage: (message) => message.defaultMessage,
  },
};

describe('ORASettings', () => {
  it('should render', () => {
    const wrapper = shallow(<ORASettings {...props} />);
    expect(wrapper.snapshot).toMatchSnapshot();
  });
});

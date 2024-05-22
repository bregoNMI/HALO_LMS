import { getConfig } from '@edx/frontend-platform';
import React from 'react';
import { useDispatch } from 'react-redux';

import { StrictDict, useKeyedState } from '@edx/react-unit-test-utils';
import { logError } from '@edx/frontend-platform/logging';

import { fetchCourse } from '@src/courseware/data';
import { processEvent } from '@src/course-home/data/thunks';
import { useEventListener } from '@src/generic/hooks';
import { messageTypes } from '../constants';

import useLoadBearingHook from './useLoadBearingHook';

export const stateKeys = StrictDict({
  iframeHeight: 'iframeHeight',
  hasLoaded: 'hasLoaded',
  showError: 'showError',
  windowTopOffset: 'windowTopOffset',
});

const useIFrameBehavior = ({
  elementId,
  id,
  iframeUrl,
  onLoaded,
}) => {
  // Do not remove this hook.  See function description.
  useLoadBearingHook(id);

  const dispatch = useDispatch();

  const [iframeHeight, setIframeHeight] = useKeyedState(stateKeys.iframeHeight, 0);
  const [hasLoaded, setHasLoaded] = useKeyedState(stateKeys.hasLoaded, false);
  const [showError, setShowError] = useKeyedState(stateKeys.showError, false);
  const [windowTopOffset, setWindowTopOffset] = useKeyedState(stateKeys.windowTopOffset, null);

  React.useEffect(() => {
    const frame = document.getElementById(elementId);
    const { hash } = window.location;
    if (hash) {
      // The url hash will be sent to LMS-served iframe in order to find the location of the
      // hash within the iframe.
      frame.contentWindow.postMessage({ hashName: hash }, `${getConfig().LMS_BASE_URL}`);
    }
  }, [id, onLoaded, iframeHeight, hasLoaded]);

  const receiveMessage = React.useCallback(({ data }) => {
    const { type, payload } = data;
    if (type === messageTypes.resize) {
      setIframeHeight(payload.height);

      // We observe exit from the video xblock fullscreen mode
      // and scroll to the previously saved scroll position
      if (windowTopOffset !== null) {
        window.scrollTo(0, Number(windowTopOffset));
      }

      if (!hasLoaded && iframeHeight === 0 && payload.height > 0) {
        setHasLoaded(true);
        if (onLoaded) {
          onLoaded();
        }
      }
    } else if (type === messageTypes.videoFullScreen) {
      // We listen for this message from LMS to know when we need to
      // save or reset scroll position on toggle video xblock fullscreen mode
      setWindowTopOffset(payload.open ? window.scrollY : null);
    } else if (data.offset) {
      // We listen for this message from LMS to know when the page needs to
      // be scrolled to another location on the page.
      window.scrollTo(0, data.offset + document.getElementById('unit-iframe').offsetTop);
    }
  }, [
    id,
    onLoaded,
    hasLoaded,
    setHasLoaded,
    iframeHeight,
    setIframeHeight,
    windowTopOffset,
    setWindowTopOffset,
  ]);

  useEventListener('message', receiveMessage);

  /**
  * onLoad *should* only fire after everything in the iframe has finished its own load events.
  * Which means that the plugin.resize message (which calls setHasLoaded above) will have fired already
  * for a successful load. If it *has not fired*, we are in an error state. For example, the backend
  * could have given us a 4xx or 5xx response.
  */

  const handleIFrameLoad = () => {
    if (!hasLoaded) {
      setShowError(true);
      logError('Unit iframe failed to load. Server possibly returned 4xx or 5xx response.', {
        iframeUrl,
      });
    }
    window.onmessage = (e) => {
      if (e.data.event_name) {
        dispatch(processEvent(e.data, fetchCourse));
      }
    };
  };

  React.useEffect(() => {
    setIframeHeight(0);
    setHasLoaded(false);
  }, [iframeUrl]);

  return {
    iframeHeight,
    handleIFrameLoad,
    showError,
    hasLoaded,
  };
};

export default useIFrameBehavior;

# Unit Title Slot

### Slot ID: `unit_title_slot`
### Props:
* `courseId`
* `unitId`

## Description

This slot is used for adding content after the Unit title.

## Example

The following `env.config.jsx` will render the `course_id` and `unit_id` of the course as `<p>` elements.

![Screenshot of Content added after the Unit Title](./images/post_unit_title.png)

```js
import { DIRECT_PLUGIN, PLUGIN_OPERATIONS } from '@openedx/frontend-plugin-framework';

const config = {
  pluginSlots: {
    unit_title_slot: {
      plugins: [
        {
          // Insert custom content after unit title
          op: PLUGIN_OPERATIONS.Insert,
          widget: {
            id: 'custom_unit_title_content',
            type: DIRECT_PLUGIN,
            RenderWidget: ({courseId, unitId}) => (
              <>
                <p>📚: {courseId}</p>
                <p>📙: {unitId}</p>
              </>
            ),
          },
        },
      ]
    }
  },
}

export default config;
```

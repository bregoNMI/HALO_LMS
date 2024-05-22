define(['models/course-model', 'views/trends-view'], (CourseModel, TrendsView) => {
  'use strict';

  describe('Trends view', () => {
    it('should assemble format x-axis ticks', () => {
      const view = new TrendsView({
        model: new CourseModel(),
        modelAttribute: 'trends',
        x: {
          title: 'Title X',
          // key in the data
          key: 'date',
        },
      });
      expect(view.formatXTick('2014-06-15')).toBe('15 Jun 2014');
    });

    it('should parse x data as a timestamp', () => {
      const view = new TrendsView({
        model: new CourseModel(),
        modelAttribute: 'trends',
        x: {
          title: 'Title X',
          // key in the data
          key: 'date',
        },
      });
      expect(view.parseXData({ date: '2014-06-15' })).toBe(1402790400000);
    });
  });
});

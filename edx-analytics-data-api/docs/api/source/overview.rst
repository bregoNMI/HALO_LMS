.. _edX Data Analytics API Overview:

################################
edX Data Analytics API Overview
################################

The edX Data Analytics API provides the tools for building applications to view
and analyze student activity in your course.

The edX Platform APIs use REST design principles and support the JSON
data-interchange format.

****************************************
edX Data Analytics API Version 0, Alpha
****************************************

The edX Data Analytics API is currently at version 0 and is an Alpha release.
We plan on making significant enhancements and changes to the API.

The Data Analytics API uses key-based authentication and currently has no
built-in authorization mechanism. Therefore third parties cannot currently use
the Data Analytics API with edx.org data.

Open edX users can use the Data Analytics API with their own instances.

EdX plans to make the Data Analytics API available to partners in the future,
and invites feedback.

**************************************
edX Data Analytics API Version 1, Beta
**************************************

There is now a version 1 of the Data Analytics API. This version is largely the same
as v0, but the data for v1 endpoints is sourced from a new database. The new database is populated by
data outside of the current analytics pipeline. Open edX users can use version 1, but will need to populate the
database being used by the v1 API.

You can use version 1 of the API by updating your client URL version, for example:

``/api/v1/courses/{course_id}/activity/``


***********************************
edX Data Analytics API Capabilities
***********************************

With the edX Data Analytics API, you can:

* :ref:`Get Weekly Course Activity`
* :ref:`Get Recent Course Activity`
* :ref:`Get the Course Enrollment`
* :ref:`Get the Course Enrollment by Mode`
* :ref:`Get the Course Enrollment by Birth Year`
* :ref:`Get the Course Enrollment by Education Level`
* :ref:`Get the Course Enrollment by Gender`
* :ref:`Get the Course Enrollment by Location`
* :ref:`Get the Course Video Data`
* :ref:`Get the Grade Distribution for a Course`
* :ref:`Get the Answer Distribution for a Problem`
* :ref:`Get the View Count for a Subsection`
* :ref:`Get the Timeline for a Video`

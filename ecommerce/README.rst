⛔️ DEPRECATION WARNING
======================
This repository is deprecated and in maintainence-only operation while we work on a replacement, please see `this announcement <https://discuss.openedx.org/t/deprecation-removal-ecommerce-service-depr-22/6839>`__ for more information.
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

Although we have stopped integrating new contributions, we always appreciate security disclosures and patches sent to security@openedx.org

edX E-Commerce Service  |CI|_ |Codecov|_
============================================
.. |CI| image:: https://github.com/openedx/ecommerce/workflows/CI/badge.svg
.. _CI: https://github.com/openedx/ecommerce/actions?query=workflow%3ACI

.. |Codecov| image:: http://codecov.io/github/edx/ecommerce/coverage.svg?branch=master
.. _Codecov: http://codecov.io/github/edx/ecommerce?branch=master

This repository contains the edX E-Commerce Service, which relies heavily on `django-oscar <https://django-oscar.readthedocs.org/en/latest/>`_, as well as all frontend and backend code used to manage edX's product catalog and handle orders for those products.

Documentation
-------------

`Documentation <https://edx-ecommerce.readthedocs.io/en/latest/>`_ is hosted on Read the Docs. The source is hosted in this repo's `docs <https://github.com/openedx/ecommerce/tree/master/docs>`_ directory. To contribute, please open a PR against this repo.

License
-------

The code in this repository is licensed under version 3 of the AGPL unless otherwise noted. Please see the LICENSE_ file for details.

.. _LICENSE: https://github.com/openedx/ecommerce/blob/master/LICENSE

How To Contribute
-----------------

Notice: Internal 2U contributions should be made against the ``2u/main`` branch.  Open source contributions should continue to be made against the ``master`` branch.

Anyone merging to the ``2u/main`` branch of this repository is expected to `release and monitor their changes <https://2u-internal.atlassian.net/wiki/spaces/RS/pages/7963261/How+to+contribute+to+our+repositories>`__ (2U-private link); if you are not able to do this DO NOT MERGE, please coordinate with someone who can to ensure that the changes are released.

Please also read `How To Contribute <https://github.com/openedx/.github/blob/master/CONTRIBUTING.md>`__. Even though it was written with ``edx-platform`` in mind, these guidelines should be followed for Open edX code in general.

Reporting Security Issues
-------------------------

Please do not report security issues in public. Please email security@openedx.org.

Get Help
--------

Ask questions and discuss this project on `Slack <https://openedx.slack.com/messages/ecommerce/>`_ or in the `edx-code Google Group <https://groups.google.com/forum/#!forum/edx-code>`_.

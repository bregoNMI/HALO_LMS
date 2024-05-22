"""
Discussion notifications sender util.
"""
import re

from django.conf import settings
from lms.djangoapps.discussion.django_comment_client.permissions import get_team
from openedx_events.learning.data import UserNotificationData, CourseNotificationData
from openedx_events.learning.signals import USER_NOTIFICATION_REQUESTED, COURSE_NOTIFICATION_REQUESTED

from openedx.core.djangoapps.course_groups.models import CourseCohortsSettings
from openedx.core.djangoapps.discussions.utils import get_divided_discussions
from django.utils.translation import gettext_lazy as _

from openedx.core.djangoapps.django_comment_common.comment_client.comment import Comment
from openedx.core.djangoapps.django_comment_common.comment_client.subscriptions import Subscription
from openedx.core.djangoapps.django_comment_common.models import (
    FORUM_ROLE_ADMINISTRATOR,
    FORUM_ROLE_COMMUNITY_TA,
    FORUM_ROLE_MODERATOR,
    CourseDiscussionSettings,
)


class DiscussionNotificationSender:
    """
    Class to send notifications to users who are subscribed to the thread.
    """

    def __init__(self, thread, course, creator, parent_id=None):
        self.thread = thread
        self.course = course
        self.creator = creator
        self.parent_id = parent_id
        self.parent_response = None
        self._get_parent_response()

    def _send_notification(self, user_ids, notification_type, extra_context=None):
        """
        Send notification to users
        """
        if not user_ids:
            return

        if extra_context is None:
            extra_context = {}

        notification_data = UserNotificationData(
            user_ids=[int(user_id) for user_id in user_ids],
            context={
                "replier_name": self.creator.username,
                "post_title": self.thread.title,
                "course_name": self.course.display_name,
                "sender_id": self.creator.id,
                **extra_context,
            },
            notification_type=notification_type,
            content_url=f"{settings.DISCUSSIONS_MICROFRONTEND_URL}/{str(self.course.id)}/posts/{self.thread.id}",
            app_name="discussion",
            course_key=self.course.id,
        )
        USER_NOTIFICATION_REQUESTED.send_event(notification_data=notification_data)

    def _send_course_wide_notification(self, notification_type, audience_filters=None, extra_context=None):
        """
        Send notification to all users in the course
        """
        if not extra_context:
            extra_context = {}

        notification_data = CourseNotificationData(
            course_key=self.course.id,
            content_context={
                "replier_name": self.creator.username,
                "post_title": getattr(self.thread, 'title', ''),
                "course_name": self.course.display_name,
                "sender_id": self.creator.id,
                **extra_context,
            },
            notification_type=notification_type,
            content_url=f"{settings.DISCUSSIONS_MICROFRONTEND_URL}/{str(self.course.id)}/posts/{self.thread.id}",
            app_name="discussion",
            audience_filters=audience_filters,
        )
        COURSE_NOTIFICATION_REQUESTED.send_event(course_notification_data=notification_data)

    def _get_parent_response(self):
        """
        Get parent response object
        """
        if self.parent_id and not self.parent_response:
            self.parent_response = Comment(id=self.parent_id).retrieve()

        return self.parent_response

    def send_new_response_notification(self):
        """
        Send notification to users who are subscribed to the main thread/post i.e.
        there is a response to the main thread.
        """
        if not self.parent_id and self.creator.id != int(self.thread.user_id):
            self._send_notification([self.thread.user_id], "new_response")

    def _response_and_thread_has_same_creator(self) -> bool:
        """
        Check if response and main thread have same author.
        """
        return int(self.parent_response.user_id) == int(self.thread.user_id)

    def _response_and_comment_has_same_creator(self):
        return int(self.parent_response.attributes['user_id']) == self.creator.id

    def send_new_comment_notification(self):
        """
        Send notification to parent thread creator i.e. comment on the response.
        """
        if (
            self.parent_response and
            self.creator.id != int(self.thread.user_id)
        ):
            # use your if author of response is same as author of post.
            # use 'their' if comment author is also response author.
            author_name = (
                # Translators: Replier commented on "your" response to your post
                _("your")
                if self._response_and_thread_has_same_creator()
                else (
                    # Translators: Replier commented on "their" response to your post
                    _("their")
                    if self._response_and_comment_has_same_creator()
                    else f"{self.parent_response.username}'s"
                )
            )
            context = {
                "author_name": str(author_name),
            }
            self._send_notification([self.thread.user_id], "new_comment", extra_context=context)

    def send_new_comment_on_response_notification(self):
        """
        Send notification to parent response creator i.e. comment on the response.
        Do not send notification if author of response is same as author of post.
        """
        if (
            self.parent_response and
            self.creator.id != int(self.parent_response.user_id) and not
            self._response_and_thread_has_same_creator()
        ):
            self._send_notification([self.parent_response.user_id], "new_comment_on_response")

    def _check_if_subscriber_is_not_thread_or_content_creator(self, subscriber_id) -> bool:
        """
        Check if the subscriber is not the thread creator or response creator
        """
        is_not_creator = (
            subscriber_id != int(self.thread.user_id) and
            subscriber_id != int(self.creator.id)
        )
        if self.parent_response:
            return is_not_creator and subscriber_id != int(self.parent_response.user_id)

        return is_not_creator

    def send_response_on_followed_post_notification(self):
        """
        Send notification to followers of the thread/post
        except:
        Tread creator , response creator,
        """
        users = []
        page = 1
        has_more_subscribers = True

        while has_more_subscribers:

            subscribers = Subscription.fetch(self.thread.id, query_params={'page': page})
            if page <= subscribers.num_pages:
                for subscriber in subscribers.collection:
                    # Check if the subscriber is not the thread creator or response creator
                    subscriber_id = int(subscriber.get('subscriber_id'))
                    # do not send notification to the user who created the response and the thread
                    if self._check_if_subscriber_is_not_thread_or_content_creator(subscriber_id):
                        users.append(subscriber_id)
            else:
                has_more_subscribers = False
            page += 1
        # Remove duplicate users from the list of users to send notification
        users = list(set(users))
        if not self.parent_id:
            self._send_notification(users, "response_on_followed_post")
        else:
            self._send_notification(
                users,
                "comment_on_followed_post",
                extra_context={"author_name": self.parent_response.username}
            )

    def _create_cohort_course_audience(self):
        """
        Creates audience filter based on user cohort and role
        """
        course_key_str = str(self.course.id)
        discussion_cohorted = is_discussion_cohorted(course_key_str)

        # Retrieves cohort divided discussion
        try:
            discussion_settings = CourseDiscussionSettings.objects.get(course_id=course_key_str)
        except CourseDiscussionSettings.DoesNotExist:
            return {}
        divided_course_wide_discussions, divided_inline_discussions = get_divided_discussions(
            self.course,
            discussion_settings
        )

        # Checks if post has any cohort assigned
        group_id = self.thread.attributes.get('group_id')
        if group_id is None:
            return {}
        group_id = int(group_id)

        # Course wide topics
        all_topics = divided_inline_discussions + divided_course_wide_discussions
        topic_id = self.thread.attributes['commentable_id']
        topic_divided = topic_id in all_topics or discussion_settings.always_divide_inline_discussions

        # Team object from topic id
        team = get_team(topic_id)
        if team:
            return {
                'teams': [team.team_id],
            }
        if discussion_cohorted and topic_divided and group_id is not None:
            return {
                'cohorts': [group_id],
            }
        return {}

    def send_response_endorsed_on_thread_notification(self):
        """
        Sends a notification to the author of the thread
        response on his thread has been endorsed
        """
        if self.creator.id != int(self.thread.user_id):
            self._send_notification([self.thread.user_id], "response_endorsed_on_thread")

    def send_response_endorsed_notification(self):
        """
        Sends a notification to the author of the response
        """
        self._send_notification([self.creator.id], "response_endorsed")

    def send_new_thread_created_notification(self):
        """
        Send notification based on notification_type
        """
        thread_type = self.thread.attributes['thread_type']
        notification_type = (
            "new_question_post"
            if thread_type == "question"
            else ("new_discussion_post" if thread_type == "discussion" else "")
        )
        if notification_type not in ['new_discussion_post', 'new_question_post']:
            raise ValueError(f'Invalid notification type {notification_type}')

        audience_filters = self._create_cohort_course_audience()

        if audience_filters:
            # If the audience is cohorted/teamed, we add the course and forum roles to the audience.
            # Include course staff and instructors for course wide discussion notifications.
            audience_filters['course_roles'] = ['staff', 'instructor']

            # Include privileged forum roles for course wide discussion notifications.
            audience_filters['discussion_roles'] = [
                FORUM_ROLE_ADMINISTRATOR, FORUM_ROLE_MODERATOR, FORUM_ROLE_COMMUNITY_TA
            ]
        context = {
            'username': self.creator.username,
            'post_title': self.thread.title
        }
        self._send_course_wide_notification(notification_type, audience_filters, context)

    def send_reported_content_notification(self):
        """
        Send notification to users who are subscribed to the thread.
        """
        thread_body = self.thread.body if self.thread.body else ''

        thread_body = remove_html_tags(thread_body)
        thread_types = {
            # numeric key is the depth of the thread in the discussion
            'comment': {
                1: 'comment',
                0: 'response'
            },
            'thread': {
                0: 'thread'
            }
        }

        content_type = thread_types[self.thread.type][getattr(self.thread, 'depth', 0)]

        context = {
            'username': self.creator.username,
            'content_type': content_type,
            'content': thread_body
        }
        audience_filters = {'discussion_roles': [
            FORUM_ROLE_ADMINISTRATOR, FORUM_ROLE_MODERATOR, FORUM_ROLE_COMMUNITY_TA
        ]}
        self._send_course_wide_notification("content_reported", audience_filters, context)


def is_discussion_cohorted(course_key_str):
    """
    Returns if the discussion is divided by cohorts
    """
    try:
        cohort_settings = CourseCohortsSettings.objects.get(course_id=course_key_str)
        discussion_settings = CourseDiscussionSettings.objects.get(course_id=course_key_str)
    except (CourseCohortsSettings.DoesNotExist, CourseDiscussionSettings.DoesNotExist):
        return False
    return cohort_settings.is_cohorted and discussion_settings.always_divide_inline_discussions


def remove_html_tags(text):
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text)

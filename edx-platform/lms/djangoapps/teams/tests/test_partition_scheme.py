"""
Test the partitions and partitions services. The partitions tested
in this file are the following:
- TeamPartitionScheme
"""
from unittest.mock import MagicMock, patch

from common.djangoapps.student.tests.factories import UserFactory
from lms.djangoapps.teams.tests.factories import CourseTeamFactory
from lms.djangoapps.teams.team_partition_scheme import TeamPartitionScheme
from openedx.core.lib.teams_config import create_team_set_partitions_with_course_id
from xmodule.modulestore.tests.django_utils import ModuleStoreTestCase  # lint-amnesty, pylint: disable=wrong-import-order
from xmodule.modulestore.tests.factories import ToyCourseFactory
from xmodule.modulestore.django import modulestore
from xmodule.partitions.partitions import Group


@patch(
    "lms.djangoapps.teams.team_partition_scheme.CONTENT_GROUPS_FOR_TEAMS.is_enabled",
    lambda _: True
)
class TestTeamPartitionScheme(ModuleStoreTestCase):
    """
    Test the TeamPartitionScheme partition scheme and its related functions.
    """

    def setUp(self):
        """
        Regenerate a course with teams configuration, partition and groups,
        and a student for each test.
        """
        super().setUp()
        self.course_key = ToyCourseFactory.create().id
        self.course = modulestore().get_course(self.course_key)
        self.student = UserFactory.create()
        self.student.courseenrollment_set.create(course_id=self.course_key, is_active=True)
        self.team_sets = [
            MagicMock(name="1st TeamSet", teamset_id=1, user_partition_id=51),
            MagicMock(name="2nd TeamSet", teamset_id=2, user_partition_id=52),
        ]

    @patch("lms.djangoapps.teams.team_partition_scheme.TeamsConfigurationService")
    def test_create_user_partition_with_course_id(self, mock_teams_configuration_service):
        """
        Test that create_user_partition returns the correct user partitions for the input data.

        Expected result:
        - There's a user partition matching the ID given.
        """
        mock_teams_configuration_service().get_teams_configuration.return_value.teamsets = self.team_sets

        partition = TeamPartitionScheme.create_user_partition(
            id=self.team_sets[0].user_partition_id,
            name=f"Team Group: {self.team_sets[0].name}",
            description="Partition for segmenting users by team-set",
            parameters={
                "course_id": str(self.course_key),
                "team_set_id": self.team_sets[0].teamset_id,
            }
        )

        assert partition.id == self.team_sets[0].user_partition_id

    def test_team_partition_generator(self):
        """
        Test that create_team_set_partition returns the correct user partitions for the input data.

        Expected result:
        - The user partitions are created based on the team sets.
        """
        partitions = create_team_set_partitions_with_course_id(self.course_key, self.team_sets)

        assert partitions == [
            TeamPartitionScheme.create_user_partition(
                id=self.team_sets[0].user_partition_id,
                name=f"Team Group: {self.team_sets[0].name}",
                description="Partition for segmenting users by team-set",
                parameters={
                    "course_id": str(self.course_key),
                    "team_set_id": self.team_sets[0].teamset_id,
                }
            ),
            TeamPartitionScheme.create_user_partition(
                id=self.team_sets[1].user_partition_id,
                name=f"Team Group: {self.team_sets[1].name}",
                description="Partition for segmenting users by team-set",
                parameters={
                    "course_id": str(self.course_key),
                    "team_set_id": self.team_sets[1].teamset_id,
                }
            ),
        ]

    @patch("lms.djangoapps.teams.team_partition_scheme.TeamsConfigurationService")
    def test_get_partition_groups(self, mock_teams_configuration_service):
        """
        Test that the TeamPartitionScheme returns the correct groups for a team set.

        Expected result:
        - The groups in the partition match the teams in the team set.
        """
        mock_teams_configuration_service().get_teams_configuration.return_value.teamsets = self.team_sets
        team_1 = CourseTeamFactory.create(
            name="Team 1 in TeamSet",
            course_id=self.course_key,
            topic_id=self.team_sets[0].teamset_id,
        )
        team_2 = CourseTeamFactory.create(
            name="Team 2 in TeamSet",
            course_id=self.course_key,
            topic_id=self.team_sets[0].teamset_id,
        )
        team_partition_scheme = TeamPartitionScheme.create_user_partition(
            id=self.team_sets[0].user_partition_id,
            name=f"Team Group: {self.team_sets[0].name}",
            description="Partition for segmenting users by team-set",
            parameters={
                "course_id": str(self.course_key),
                "team_set_id": self.team_sets[0].teamset_id,
            }
        )

        assert team_partition_scheme.groups == [
            Group(team_1.id, str(team_1.name)),
            Group(team_2.id, str(team_2.name)),
        ]

    @patch("lms.djangoapps.teams.team_partition_scheme.TeamsConfigurationService")
    def test_get_group_for_user(self, mock_teams_configuration_service):
        """
        Test that the TeamPartitionScheme returns the correct group for a
        student in a team when the team is linked to a partition group.

        Expected result:
        - The group returned matches the team the student is in.
        """
        mock_teams_configuration_service().get_teams_configuration.return_value.teamsets = self.team_sets
        team = CourseTeamFactory.create(
            name="Team in 1st TeamSet",
            course_id=self.course_key,
            topic_id=self.team_sets[0].teamset_id,
        )
        team.add_user(self.student)
        team_partition_scheme = TeamPartitionScheme.create_user_partition(
            id=self.team_sets[0].user_partition_id,
            name=f"Team Group: {self.team_sets[0].name}",
            description="Partition for segmenting users by team-set",
            parameters={
                "course_id": str(self.course_key),
                "team_set_id": self.team_sets[0].teamset_id,
            }
        )

        assert TeamPartitionScheme.get_group_for_user(
            self.course_key, self.student, team_partition_scheme
        ) == team_partition_scheme.groups[0]

    def test_get_group_for_user_no_team(self):
        """
        Test that the TeamPartitionScheme returns None for a student not in a team.

        Expected result:
        - The group returned is None.
        """
        team_partition_scheme = TeamPartitionScheme.create_user_partition(
            id=51,
            name="Team Group: 1st TeamSet",
            description="Partition for segmenting users by team-set",
            parameters={
                "course_id": str(self.course_key),
                "team_set_id": 1,
            }
        )

        assert TeamPartitionScheme.get_group_for_user(
            self.course_key, self.student, team_partition_scheme
        ) is None

    @patch("lms.djangoapps.teams.team_partition_scheme.get_course_masquerade")
    @patch("lms.djangoapps.teams.team_partition_scheme.get_masquerading_user_group")
    @patch("lms.djangoapps.teams.team_partition_scheme.is_masquerading_as_specific_student")
    def test_group_for_user_masquerading(
        self,
        mock_is_masquerading_as_specific_student,
        mock_get_masquerading_user_group,
        mock_get_course_masquerade
    ):
        """
        Test that the TeamPartitionScheme calls the masquerading functions when
        the user is masquerading.

        Expected result:
        - The masquerading functions are called.
        """
        team_partition_scheme = TeamPartitionScheme.create_user_partition(
            id=51,
            name="Team Group: 1st TeamSet",
            description="Partition for segmenting users by team-set",
            parameters={
                "course_id": str(self.course_key),
                "team_set_id": 1,
            }
        )
        mock_get_course_masquerade.return_value = True
        mock_is_masquerading_as_specific_student.return_value = False

        TeamPartitionScheme.get_group_for_user(
            self.course_key, self.student, team_partition_scheme
        )

        mock_get_masquerading_user_group.assert_called_once_with(self.course_key, self.student, team_partition_scheme)

BADGE_CATALOG = [
    # Learning Progress
    {
        "slug": "certified_learner_1",
        "name": "Certified Learner",
        "description": "Completed your first course.",
        "criteria": {"event": "course_complete", "count": 1, "reward": {"credits": 75}},
        "icon_static": "client_admin\Images\HALO LMS No Graphic Test-27.png",
    },
    {
        "slug": "certified_learner_5",
        "name": "Knowledge Seeker",
        "description": "Completed 5 courses.",
        "criteria": {"event": "course_complete", "count": 5, "reward": {"credits": 250}},
        "icon_static": "client_admin\Images\HALO LMS No Graphic Test-30.png",
    },
    {
        "slug": "quiz_master",
        "name": "Quiz Master",
        "description": "Get a 100% on a lesson quiz.",
        "criteria": {"event": "quiz_complete", "min_score": 100, "reward": {"credits": 100}},
        "icon_static": "client_admin\Images\HALO LMS No Graphic Test-27.png",
    },

    # Streaks and Logins
    {
        "slug": "welcome_aboard",
        "name": "Welcome Aboard",
        "description": "Log in for the first time.",
        "criteria": {"event": "user_login", "count": 1, "reward": {"credits": 40}},
        "icon_static": "images/gamification/badges/Welcome_Aboard_Badge.png",
    },
    {
        "slug": "dedicated_learner",
        "name": "Dedicated Learner",
        "description": "Go on a 7 day streak.",
        "criteria": {"event": "user_login", "streak_days": 7, "reward": {"credits": 200}},
        "icon_static": "client_admin\Images\HALO LMS No Graphic Test-27.png",
    },

    # Fun / Extra
    {
        "slug": "night_owl",
        "name": "Night Owl",
        "description": "Complete a lesson after 10 PM.",
        "criteria": {"event": "lesson_complete", "time_range": "22:00-06:00", "reward": {"credits": 120}},
        "icon_static": "client_admin\Images\HALO LMS No Graphic Test-27.png",
    },

    # Facial Verification
    {
        "slug": "verified_learner",
        "name": "Verified Learner",
        "description": "Complete your first verified facial verification check.",
        "criteria": {"event": "facial_verification", "count": 1, "reward": {"credits": 80}},
        "icon_static": "images/gamification/badges/Verified_Learner_Badge.png",
    },
]
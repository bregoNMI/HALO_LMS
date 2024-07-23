from django.db import models
from django.contrib.auth.models import User

# Define a Course model
class Course(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

# Define a Module model
class Module(models.Model):
    course = models.ForeignKey(Course, related_name='modules', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField()

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

# Update the Lesson model to be associated with a Module
class Lesson(models.Model):
    module = models.ForeignKey(Module, related_name='lessons', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    content = models.TextField()
    order = models.PositiveIntegerField()

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

# Define a UserCourse model to track the courses a user is enrolled in
class UserCourse(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    progress = models.PositiveIntegerField(default=0)  # percentage of the course completed by the user

    def __str__(self):
        return f"{self.user.username} - {self.course.title}"

# Define a Quiz model
class Quiz(models.Model):
    lesson = models.ForeignKey(Lesson, related_name='quizzes', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.title

# Define a Question model
class Question(models.Model):
    quiz = models.ForeignKey(Quiz, related_name='questions', on_delete=models.CASCADE)
    text = models.TextField()

    def __str__(self):
        return self.text

# Define an Answer model
class Answer(models.Model):
    question = models.ForeignKey(Question, related_name='answers', on_delete=models.CASCADE)
    text = models.TextField()
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return self.text
    
class ProfileManager(models.Manager):

    def new_profile(self, user, *args):
        new_profile = self.create(
            user=user,
            photoid="",
            passportphoto="",
        )

        return new_profile
    
# Combined Applicant and Profile
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, editable=False)
    username = models.CharField(('Username'), max_length=30, blank=True)
    email = models.EmailField(('email address'), unique=True)
    first_name = models.CharField(('first name'), max_length=30, blank=True)
    last_name = models.CharField(('last name'), max_length=30, blank=True)
    name_on_cert = models.CharField(('name on certificate'), max_length=64, blank=True)
    associate_school = models.CharField(default='NMI / NEMO', max_length=30, blank=False)
    archived = models.BooleanField(default=False)
    role = models.CharField(max_length=30, default='Student')
    birth_date = models.DateField(null=True, blank=True)
    address_1 = models.CharField(max_length=256)
    address_2 = models.CharField(max_length=256, null=True, blank=True)
    city = models.CharField(max_length=64)
    state = models.CharField(max_length=64, verbose_name='State/Province')
    code = models.CharField(max_length=15, verbose_name='Postal Code')
    country = models.CharField(max_length=256)
    citizenship = models.CharField(max_length=256)
    phone = models.CharField(default='9999999999', blank=False, max_length=18)
    sex = models.CharField(max_length=30, blank=True)
    delivery_method = models.CharField(max_length=64, blank=True)
    referral = models.CharField(max_length=512, blank=True)
    initials = models.CharField(max_length=5, default='ABC')
    photoid = models.ImageField()
    passportphoto = models.ImageField()
    date_joined = models.DateTimeField(('date joined'), auto_now_add=True)

    objects = ProfileManager()

    def __str__(self):
        return f'{self.user.username} Profile'

    def get_departments(self):
        if self.departments.count() == 0:
            return "None"
        else:
            return ', '.join([dpt.department for dpt in self.departments.all()])

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
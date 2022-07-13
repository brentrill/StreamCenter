from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    pass


class Artist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="artists")
    name = models.CharField(max_length=100, unique=True)
    soundcloud_link = models.TextField(max_length=300, blank=True, default='')
    spotify_link = models.TextField(max_length=300, blank=True, default='')
    youtube_link = models.TextField(max_length=300, blank=True, default='')

    def serialize(self):
        return {
            "id": self.id,
            "user": self.user.username,
            "name": self.name,
            "links": [self.soundcloud_link, self.spotify_link, self.youtube_link],
        }

    def __str__(self):
        watching = f'For {self.user.username} we are watching {self.name} on '
        if self.soundcloud_link != '':
            watching += 'Soundcloud '
        if self.spotify_link != '':
            watching += 'Spotify '
        if self.youtube_link != '':
            watching += 'YouTube '
        return watching


# this is not the best model design. there is one timestamp shared by both the favorites
# and laters, so the most recent ordering may not be correct if a post is both favorited
# and latered at different times.
class Saved(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="saved")
    post_link = models.TextField(max_length=500)
    favorited = models.BooleanField(default=False)
    later = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'User {self.user.username} saved a post to Favorites: {self.favorited} Listen Later: {self.later}'
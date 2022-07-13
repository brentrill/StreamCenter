from django.urls import path

from . import views

urlpatterns = [
    path("home", views.index, name="index"),
    path("", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),

    # API Routes
    path("add_artist", views.add_artist, name="add_artist"),
    path("get_tracks", views.get_tracks, name="get_tracks"),
    path("get_soundcloud_tracks", views.get_soundcloud_tracks, name="get_soundcloud_tracks"),
    path("get_spotify_tracks", views.get_spotify_tracks, name="get_spotify_tracks"),
    path("get_youtube_tracks", views.get_youtube_tracks, name="get_youtube_tracks"),
    path("artists", views.artists, name="artists"),
    path("artists/<int:id>", views.edit_artist, name="edit"),
    path("save", views.save, name="save"),
    path("saved_tracks", views.saved_tracks, name="saved"),
    path("delete/<int:id>", views.delete_artist, name="delete"),
]
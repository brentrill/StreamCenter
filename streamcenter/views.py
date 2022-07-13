from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt

import json
import requests
import base64

from .models import User, Artist, Saved

from pytube import Channel, YouTube

# For Soundcloud API
# Note: Soundcloud is fairly unstable. Most of the time there are one or two artists
# that fail to receive data. However if no artists get soundcloud data, then the client_id
# or app_version may need to be updated. I got them by inspecting the Request URLs (after 
# filtering for 'api') in the network tab of chrome dev tools when visiting soundcloud.
client_id = 'cvRAZnbmwcaau0MyfJTGwtUjhQNvQlio'
app_version = '1655720042'


def index(request):
    if request.user.is_authenticated:
        return render(request, "streamcenter/index.html")
    else:
        return HttpResponseRedirect(reverse("login"))


def login_view(request):
    if request.user.is_authenticated:
        return HttpResponseRedirect(reverse("index"))
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "streamcenter/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "streamcenter/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("login"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "streamcenter/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "streamcenter/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "streamcenter/register.html")


# checks if artist name exists already, adds/updates DB
@csrf_exempt    
def add_artist(request):
    if request.method != 'POST':
        return render(request, "index.html")

    json_data = json.loads(request.body)
    if Artist.objects.filter(user=request.user, name__iexact=json_data['name']).exists():
        artist = Artist.objects.get(user=request.user, name__iexact=json_data['name'])
        if json_data['soundcloud'] != "":
            artist.soundcloud_link = json_data['soundcloud']
        if json_data['spotify'] != "":
            artist.spotify_link = json_data['spotify']
        if json_data['youtube'] != "":
            artist.youtube_link = json_data['youtube']
    else:
        artist = Artist(user=request.user,
                        name=json_data['name'],
                        soundcloud_link=json_data['soundcloud'],
                        spotify_link=json_data['spotify'],
                        youtube_link=json_data['youtube'],)
    artist.save()

    return JsonResponse(artist.serialize(), status=200)


# returns DB info for all artists, for use in the modify page
@csrf_exempt
def artists(request):
    artists = Artist.objects.filter(user=request.user)

    response = {
        'artists': [artist.serialize() for artist in artists],
    }

    return JsonResponse(response, status=200)


@csrf_exempt
def edit_artist(request, id):
    artist = Artist.objects.get(id=id)

    if artist.user != request.user:
        return HttpResponse('You cannot edit this artist.')

    json_data = json.loads(request.body)
    artist.name = json_data['name']
    artist.soundcloud_link = json_data['soundcloud']
    artist.youtube_link = json_data['youtube']
    artist.spotify_link = json_data['spotify']
    artist.save()

    return HttpResponse(json_data, status=200)


@csrf_exempt
def delete_artist(request, id):
    if request.method != 'DELETE':
        return render(request, "index.html")

    artist = Artist.objects.get(id=id)
    if artist:
        if artist.user != request.user:
            return HttpResponse('You cannot delete this artist.')
        artist.delete()

    return HttpResponseRedirect(reverse("index"))


def get_tracks(request):
    # soundcloud client_id needs to be periodically updated. find out how to handle
    # this error.
    sc_tracks, sc_recent = get_soundcloud_tracks(request)
    sp_tracks, sp_recent = get_spotify_tracks(request)
    yt_tracks, yt_recent = get_youtube_tracks(request)

    # comparing the most_recent dictionaries to get the order of appearance of artists
    dict_list = [sc_recent, sp_recent, yt_recent]
    artists = set(artist for dict in dict_list for artist in dict)
    most_recent = {artist: max([dict[artist] for dict in dict_list if artist in dict]) for artist in artists}
    # sorting the new, filtered most_recent
    most_recent = dict(sorted(most_recent.items(), key = lambda kv: kv[1], reverse = True))

    response = {
        'soundcloud_tracks': sc_tracks,
        'spotify_tracks': sp_tracks,
        'youtube_tracks': yt_tracks,
        'most_recent': most_recent,
        'favorites': user_favorited(request),
        'laters': user_later(request),
    }
    response = json.dumps(response)

    return HttpResponse(response, status=200)


def user_favorited(request):
    favorites = list(Saved.objects.filter(user=request.user, favorited=True).values_list('post_link', flat=True))

    return favorites


def user_later(request):
    laters = list(Saved.objects.filter(user=request.user, later=True).values_list('post_link', flat=True))

    return laters


def saved_tracks(request):
    favorites = list(Saved.objects.filter(user=request.user, favorited=True).values_list('post_link', flat=True))
    laters = list(Saved.objects.filter(user=request.user, later=True).values_list('post_link', flat=True))

    response = {
        'favorites': favorites,
        'laters': laters,
    }
    response = json.dumps(response)

    return HttpResponse(response, status=200)


@csrf_exempt
def save(request):
    if request.method != 'POST':
        return render(request, "index.html")
    
    data = json.loads(request.body)

    # Update database. here i use the HTML block to identify the post, since posts
    # are retrieved by request from the respective sites and not stored in the database
    # until they are favorited. i chose this method so one can unfavorite from the same
    # page, but the database could break if one of the streaming services changes
    # the way tracks are embedded.
    if data['favorited_state']:
        try:
            post = Saved.objects.get(user=request.user, post_link=data['post'])
            post.favorited = not post.favorited
        except:
            post = Saved(user=request.user,
                        post_link=data['post'],
                        favorited=True)
        post.save()

    if data['listen_state']:
        try:
            post = Saved.objects.get(user=request.user, post_link=data['post'])
            post.later = not post.later
        except:
            post = Saved(user=request.user,
                        post_link=data['post'],
                        later=True)
        post.save()

    response = {
        'favorited_state': 1 if post.favorited else 0,
        'listen_state': 1 if post.later else 0,
    }

    # Deletes entry if both later and favorited values are False.
    if not post.favorited and not post.later:
        post.delete()
        return HttpResponse('Entry deleted')

    return JsonResponse(response, status=200)


""" SOUNDCLOUD API SECTION """
def get_soundcloud_tracks(request):
    artist_urls = Artist.objects.filter(user=request.user).exclude(soundcloud_link__exact='')
    artist_ids = get_artist_id(request, artist_urls, 5) # number of recursive calls if GET fails
    # getting tracks
    tracks, most_recent = get_artist_tracks(artist_ids, 15)

    return tracks, most_recent


def get_artist_id(request, artist_urls, tries):
    artist_ids = {}
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.76 Safari/537.36', 
    "Upgrade-Insecure-Requests": "1","DNT": "1",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5","Accept-Encoding": "gzip, deflate"}
    for artist in artist_urls:
        url = f'https://api-widget.soundcloud.com/resolve?url={artist.soundcloud_link}&format=json&client_id={client_id}'
        get_data = requests.get(url=url, headers=headers)
        artist_data = get_data.json()
        if artist_data:
            artist_ids[artist.name] = artist_data["id"]
        else:
            if tries != 0:
                return get_artist_id(request, artist_urls, tries-1)
            else:
                artist_ids[artist.name] = 'Failed to get ID from SoundCloud.'
    
    return artist_ids


def get_artist_tracks(artist_ids, tries):
    tracks = {}
    most_recent = {}
    for artist in artist_ids:
        if 'Failed' in str(artist_ids[artist]):
            most_recent[artist] = "1776-08-05T00:00:00Z" # dummy date to avoid sorting errors
            tracks[artist] = [artist_ids[artist]]
            continue

        url = "https://api-v2.soundcloud.com/stream/users/%s?limit=5&client_id=%s&app_version=%s&app_locale=en" % (
                artist_ids[artist], client_id, app_version)
        data = requests.get(url=url).json()
        if data:
            if data['collection']:
                # loop to find most recent posted track by artist
                #for i in range(len(data['collection'])):
                #    if data['collection'][i]['type'] == 'track':
                #        most_recent[artist] = data['collection'][i]['created_at']
                #        break
                most_recent[artist] = data['collection'][0]['created_at']
                tracklist = []
                for track in data['collection']:
                    if track['type'] == 'playlist':# or track['type'] == 'track-repost':
                        pass
                    else:
                        tracklist.append(track['track']['id'])
            else:
                tracklist = ['Error getting Soundcloud tracks from %s' % artist]
        else:
            if tries != 0:
                return get_artist_tracks(artist_ids, tries-1)
            else:
                most_recent[artist] = "1776-08-05T00:00:00Z" # dummy date to avoid sorting errors
                tracklist = ['Failed getting %s data from Soundcloud.' % artist]
        
        tracks[artist] = tracklist

    return tracks, most_recent


""" SPOTIFY API SECTION """
def get_spotify_tracks(request):
    # credentials received from registering StreamCenter on Spotify for Developers
    CLIENT_ID = 'd98adb2704474021b4e517d585889de2'
    CLIENT_SECRET = 'c1e51475b3604a97a84072bcfafa10a8'

    # Authorization, returns a token from spotify
    url = 'https://accounts.spotify.com/api/token'
    headers = {}
    data = {}

    message = f'{CLIENT_ID}:{CLIENT_SECRET}'
    b64_bytes = base64.b64encode(message.encode('ascii'))
    b64_message = b64_bytes.decode('ascii')

    headers['Authorization'] = f'Basic {b64_message}'
    data['grant_type'] = 'client_credentials'

    r = requests.post(url, headers=headers, data=data)
    token = r.json()['access_token']

    artist_ids = get_spotify_ids(request)
    tracks, most_recent = get_spotify_albums(token, artist_ids)


    return tracks, most_recent


# parses the user input spotify link for the artist ids, returns a dict with 
# artist name: id
def get_spotify_ids(request):
    artist_urls = Artist.objects.filter(user=request.user).exclude(spotify_link__exact='')
    artist_ids = {}
    for artist in artist_urls:
        url = artist.spotify_link
        id = url.split('/')[-1][:22]

        artist_ids[artist.name] = id
    
    return artist_ids


# returns dictionary of artist names with lists of recent album ids,
# and a most_recent list with dates
def get_spotify_albums(token, artist_ids):
    tracks = {}
    most_recent = {}
    for artist in artist_ids:
        url = f'https://api.spotify.com/v1/artists/{artist_ids[artist]}/albums?limit=5'
        headers = {
            "Authorization": "Bearer " + token
        }
        try:
            data = requests.get(url=url, headers=headers).json()
            albums = []
            for album in data["items"]:
                albums.append(album['id'])

            tracks[artist] = albums
            most_recent[artist] = data["items"][0]["release_date"]
        except:
            tracks[artist] = ['Failed getting %s data from Spotify.' % artist]
            most_recent[artist] = "1776-03-18"

    return tracks, most_recent


""" YOUTUBE API SECTION """
# Youtube API has a quota limit, and calling the Search.list endpoint once costs
# 100 units out of the daily limit of 10,000. After hitting the limit in under an hour
# of writing the code, I've decided to resort to web-scraping for the sake of this project.
def get_youtube_tracks(request):
    artist_urls = Artist.objects.filter(user=request.user).exclude(youtube_link__exact='')
    tracks = {}
    most_recent = {}
    for artist in artist_urls:
        try:
            url = artist.youtube_link
            c = Channel(url)

            video_ids = []
            for video in c.video_urls[:5]:
                video_ids.append(video.split('=')[-1])

            tracks[artist.name] = video_ids

            v = YouTube(c.video_urls[:5][0])
            most_recent[artist.name] = str(v.publish_date)
        except:
            tracks[artist.name] = ['Failed getting %s data from YouTube.' % artist.name]
            most_recent[artist.name] = "1776-04-04 00:00:00"

    return tracks, most_recent
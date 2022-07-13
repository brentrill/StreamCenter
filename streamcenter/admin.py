from django.contrib import admin

from .models import User, Artist, Saved

# Register your models here.
admin.site.register(User)
admin.site.register(Artist)
admin.site.register(Saved)

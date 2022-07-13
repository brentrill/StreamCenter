from django.test import TestCase

# Designed the most recent site for each artist algorithm here.
test0 = 'spotify'
test1 = 'youtube'
test2 = 'soundcloud'

order = 0

for i in range(0,3):
    if order == 2:
        print(test0)
        order+=1
        
    if order == 1:
        print(test1)
        order+=1
        
    if order == 0:
        print(test2)
        order+=1
        
    if order == 3:
        order = 0
from datetime import datetime
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import User
from discussions.models import Discussion, Story
    
class Voting(models.Model):
    discussion = models.ForeignKey(Discussion, verbose_name=_('discussion'), related_name='voting', help_text=_('The discussion that is being voted.'))
    votes_per_participant = models.PositiveIntegerField(_('votes per participant'), default=1)
    status = models.CharField(max_length=50, choices = (('Started', 'Started'), ('Ended', 'Ended')))
    start_time = models.DateTimeField(_('start time'), auto_now_add=True) 
    end_time = models.DateTimeField(_('end time'), null=True, blank=True)
    percent_voted = models.PositiveIntegerField(_('percent voted'), default=0)
    decision_story = models.ForeignKey(Story, verbose_name=_('decision story'), related_name='voting', help_text=_('The story that has been chosen after voting.'), null=True, blank=True)
    created_by = models.ForeignKey(User, verbose_name=_('created by'), help_text=_('The user that started the voting.'))

class Ballot(models.Model):
    user = models.ForeignKey(User, verbose_name=_('created by'), help_text=_('The user that has the ballot.'))
    story = models.ForeignKey(Story, verbose_name=_('story'), null=True, blank=True, related_name='ballot', help_text=_('The story that have the ballot.'))
    voting = models.ForeignKey(Voting, verbose_name=_('voting'), related_name='ballot', help_text=_('The voting that ballot belongs to.'))
    status = models.CharField(max_length=50, choices = (('Used', 'Used'), ('Not used', 'Not used')))

def discussion_has_voting(discussion):
    if Voting.objects.filter(discussion=discussion):
        voting = Voting.objects.filter(discussion=discussion)[0]
        if voting.status == 'Started':
            return True
    return False
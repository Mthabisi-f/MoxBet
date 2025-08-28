from rest_framework import serializers
from .models import Matches, MatchOdds

class MatchOddsSerializer(serializers.ModelSerializer):
    odds = serializers.JSONField()

    class Meta:
        model = MatchOdds
        fields = ["odds", "market_type"]


class MatchSerializer(serializers.ModelSerializer):
    odds = MatchOddsSerializer(source="matchodds", many=True, read_only=True)

    class Meta:
        model = Matches
        fields = ["match_id", "sport", "league", "country", "venue", "extras",
                  "commence_datetime", "odds"]

   
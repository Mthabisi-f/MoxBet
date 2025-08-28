from django.shortcuts import render, redirect
from django.contrib import messages
from django.http import HttpRequest, JsonResponse, HttpResponseRedirect
from .models import User, Transactions, WinBoost, Tickets, Matches, MatchOdds, Leagues, Limits, MarketTypeMapping, Bookings
from .forms import UserRegistrationForm
from django.contrib.auth import authenticate, login, logout
import json
from django.db import connection
from django.contrib.auth.hashers import check_password
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.core.cache import cache
from django.utils.dateparse import parse_date
import re, random, traceback
from django.db.models import Count, Q
from django.utils.timezone import localtime, now
from decimal import Decimal
from rest_framework.response import Response
from rapidfuzz import process
from datetime import datetime, timezone
from dateutil import parser
import string
import redis
import asyncio
import os
import redis.asyncio as aioredis
from asgiref.sync import sync_to_async



def generate_barcode(ticket_id):
    timestap = datetime.now().strftime("%y%m%d%H%M%S")
    random_letters  = ''.join(random.choices(string.ascii_uppercase, k=4))
    id_suffix = f"{ticket_id %10000:04d}"
    return f"{timestap}{random_letters}{id_suffix}"

def generate_bookingcode(booking_id):
    timestap = datetime.now().strftime("%S")
    id_suffix = f"{booking_id %10000:04d}"
    return f"B{timestap}{id_suffix}"


def win_boost(request):
    number_of_selections = int(request.GET.get('number_of_selections'))
    boost = WinBoost.objects.filter(number_of_selections=number_of_selections).first()
    percentage = (boost.win_boost_percentage)/100 if  boost else 0
    return JsonResponse({'win_boost_percentage': percentage})

# @csrf_exempt
def place_bet(request):
    if request.method == "POST":
        try:
            user = request.user
            if not user.is_authenticated:
                return JsonResponse({"success": False, "message": "Authentication required"}, status=401)
                
            data = request.POST
            stake = Decimal(data.get("input_stake", 0))
            
            # Validate stake
            user_limits = Limits.objects.get(currency=user.currency)
            if stake < user_limits.min_stake:
                return JsonResponse({
                    "success": False,
                    "message": f"Minimum stake is {user_limits.min_stake}"
                }, status=400)
                
            if user.balance < stake:
                return JsonResponse({
                    "success": False,
                    "message": "Insufficient funds"
                }, status=400)
            
            user_currency = user.currency
            if user_currency == 'USD':
                currency_symbol = '$'
            elif user_currency == 'ZAR':
                currency_symbol = 'R'
            elif user_currency == 'ZIG':
                currency_symbol = 'Z'
	
            # Create ticket
            ticket = Tickets.objects.create(
                user=user,
                stake=stake,
                total_matches=len(json.loads(data.get("selections", "[]"))),
                selections=json.loads(data.get("selections")),
                win_boost=Decimal(data.get("win_boost", 0)),
                potential_win=Decimal(data.get("potential_win", 0)),
                type=data.get("bet_type", "other").lower(),
                total_odds=Decimal(data.get("total_odds", 1))
            )
            
            # Generate barcode
            ticket.barcode = generate_barcode(ticket.id)
            ticket.save()
            
            # Update balance
            user.balance -= stake
            user.save()
            
            return JsonResponse({
                "success": True,
                "ticket_id": ticket.id,
                "stake": ticket.stake,
                "potential_win": ticket.potential_win,
                "currency_symbol": currency_symbol,
                "user_balance": str(user.balance),  # Add this
                "message": "Bet placed successfully"
            })
            
        except Limits.DoesNotExist:
            return JsonResponse({"success": False, "message": "Invalid currency settings"}, status=500)
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)}, status=500)
    
    return JsonResponse({"success": False, "message": "Invalid request method"}, status=400)


def book_bet(request):
    if request.method == "POST":
        try:
            data = request.POST
            stake = Decimal(data.get("input_stake", 0))
            	
            # Create ticket
            booking = Bookings.objects.create(
                stake=stake,
                total_matches=len(json.loads(data.get("selections", "[]"))),
                selections=data.get("selections"),
                win_boost=Decimal(data.get("win_boost", 0)),
                potential_win=Decimal(data.get("potential_win", 0)),
                # type=data.get("bet_type", "other").lower(),
                total_odds=Decimal(data.get("total_odds", 1))
            )
            booking.booking_code = generate_bookingcode(booking.id)
            booking.save()
            
            return JsonResponse({
                "success": True,
                "booking_code": booking.booking_code,
                "message": "Ticket booked successfully"
            })
        
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)}, status=500)
    
    return JsonResponse({"success": False, "message": "Invalid request method"}, status=400)

def get_booking(request):
    if request.method == "POST":
        Bcode = request.POST.get('Bcode')
        code = f"B{Bcode}" 
        booking = Bookings.objects.get(booking_code=code)
        
        if booking:      
            data = booking.selections
            selections = json.loads(data)
            # selections = data.get("selections", [])

            # Mapping for 1/X/2 and 1X/12/X2 predictions to backend values
            prediction_mapping = {
                '1': 'home',
                'X': 'draw',
                '2': 'away',
                '1X': 'home_or_draw',
                '12': 'home_or_away',
                'X2': 'draw_or_away'
            }

            updated_selections = []
            for selection in selections:
                frontend_market_type = selection["market_type"]
                market_type_mapping = MarketTypeMapping.objects.filter(sport=selection["sport"],
                                                                    frontend_market=frontend_market_type).first()
                backend_market_type = market_type_mapping.backend_market

                match = Matches.objects.filter(match_id=selection["match_id"], sport=selection["sport"], commence_datetime=selection["date_time"]).first()

                if match:
                    match_row = MatchOdds.objects.filter(match=match, market_type= backend_market_type).first()
            
                    #find original backend prediction that matches the best one
                    if selection["prediction"] in prediction_mapping:
                        original_prediction = prediction_mapping[selection["prediction"]]
                    else:
                        #Normalize to lowercase for comparison
                        best_match, score, _ = process.extractOne(selection["prediction"].lower(), [opt.lower() for opt in match_row.odds])
                        original_prediction = next(opt for opt in match_row.odds if opt.lower() == best_match)

                    
                    selection["match_odds"] = match_row.odds.get(original_prediction) if match else selection["match_odds"] #match.odds.get(selection["prediction"])

                    updated_selections.append(selection)
                else:
                    for key in list(selection):
                        del selection[key]

            success = True
            return JsonResponse({
                    'success': success,
                    'message': 'Form submitted succesfully!',
                    "updated_selections": updated_selections})
                # return render(request, 'betslip.html', {'booking': booking_data})
        else:
            return JsonResponse({'error': 'Booking not found'}, status=400)


@csrf_exempt
def get_latest_odds(request):
    if request.method == "POST":
        data = json.loads(request.body)
        selections = data.get("selections", [])

        # Mapping for 1/X/2 and 1X/12/X2 predictions to backend values
        prediction_mapping = {
            '1': 'home',
            'X': 'draw',
            '2': 'away',
            '1X': 'home_or_draw',
            '12': 'home_or_away',
            'X2': 'draw_or_away'
        }

        updated_selections = []
        for selection in selections:
            frontend_market_type = selection["market_type"]
            market_type_mapping = MarketTypeMapping.objects.filter(sport=selection["sport"],
                                                                   frontend_market=frontend_market_type).first()
            backend_market_type = market_type_mapping.backend_market

            match = Matches.objects.filter(match_id=selection["match_id"], sport=selection["sport"]).first()

            if match:
                match_row = MatchOdds.objects.filter(match=match, market_type= backend_market_type).first()
          
           
            #find original backend prediction that matches the best one
            if selection["prediction"] in prediction_mapping:
                original_prediction = prediction_mapping[selection["prediction"]]
            else:
                #Normalize to lowercase for comparison
                best_match, score, _ = process.extractOne(selection["prediction"].lower(), [opt.lower() for opt in match_row.odds])
                original_prediction = next(opt for opt in match_row.odds if opt.lower() == best_match)

            updated_selections.append({
                "match_id": selection["match_id"],
                "prediction": selection["prediction"],
                "match_odds": match_row.odds.get(original_prediction) if match else selection["match_odds"] #match.odds.get(selection["prediction"])
            })

        return JsonResponse({"updated_selections": updated_selections})


async def fetch_games(request):
    sport = request.GET.get("sport", "football").lower()
    page = int(request.GET.get("page", 1))
    page_size = 100

    # connect to redis
    redis_client = aioredis.Redis(host="127.0.0.1", port=6379, db=1,  decode_responses=True)  # index DB


    # Fetch keys from async Redis client
    try:
        keys = await redis_client.smembers(f"sport:{sport}")
    except Exception as e:
        print(f"Redis error: {e}")
        keys = set()

    key_list = list(keys)

    # Async fetch all matches from Redis
    async def fetch_match(k):
        value = await redis_client.get(k)
        if value:
            return json.loads(value)
        return None

    tasks = [fetch_match(k) for k in key_list]
    all_matches = await asyncio.gather(*tasks) if tasks else []

    matches = [m for m in all_matches if m]
    print(f"matches {len(matches)}")

    # Filter by upcoming matches
    filtered_matches = []
    for match in matches:
        match_datetime_str = match.get("datetime")
        if not match_datetime_str:
            continue
        try:
            match_datetime = parser.parse(match_datetime_str)
            # match_datetime = datetime.strptime(match_datetime_str, "%Y-%m-%dT%H:%M:%SZ")
        except Exception as e:
            print(f"Skipping match due to invalid datetime: {e}")
            continue
        if match_datetime >= datetime.now(timezone.utc):
            match["datetime_obj"] = match_datetime
            filtered_matches.append(match)

    # Sort by datetime
    filtered_matches.sort(key=lambda m: m["datetime_obj"])

    total_matches = len(filtered_matches)

    # Pagination
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_matches = filtered_matches[start_idx:end_idx]

    if not filtered_matches:
        return JsonResponse({
            "highlight_games": [],
            "top_leagues": [],
            "games": [],
            "total_matches": 0,
            "leagues": {}
        }, safe=False)

    ############## TOP LEAGUES (from DB) #################
    @sync_to_async
    def get_top_leagues():
        leagues = Leagues.objects.filter(sport=sport.upper())
        priority_leagues = list(leagues.filter(is_priority=True)[:3])
        active_leagues = list(
            leagues.exclude(is_priority=True)
            .annotate(game_count=Count("matches"))
            .order_by("-game_count")[:5]
        )
        unique_leagues = {
            l.id: {"id": l.id, "league": l.league, "sport": l.sport}
            for l in (priority_leagues + active_leagues)
        }
        all_leagues = list(unique_leagues.values())[:7]

        if len(all_leagues) < 7:
            extra_league_ids = [l["id"] for l in all_leagues]
            extra_leagues = leagues.exclude(id__in=extra_league_ids).order_by("?")[:7 - len(all_leagues)]
            all_leagues += [{"id": l.id, "league": l.league, "sport": l.sport} for l in extra_leagues]

        top_leagues = list(
            leagues.filter(id__in=[l["id"] for l in all_leagues])
            .annotate(game_count=Count("matches"))
            .values("id", "league", "country", "sport")
        )
        return top_leagues

    @sync_to_async
    def get_leagues_summary():
        query = """
        SELECT 
            ml.sport, 
            ml.country, 
            ml.id AS league_id_id, 
            ml.league, 
            COUNT(mm.id) AS game_count
        FROM moxbet_leagues ml
        LEFT JOIN moxbet_matches mm ON mm.league_id_id = ml.id
        WHERE ml.sport = %s
        GROUP BY ml.sport, ml.country, ml.id, ml.league
        ORDER BY ml.country, ml.league;
        """
        with connection.cursor() as cursor:
            cursor.execute(query, [sport.upper()])
            rows = cursor.fetchall()

        data = {"sport": sport, "total_games": 0, "countries": {}}

        for row in rows:
            sport_val, country, league_id, league, game_count = row
            game_count = int(game_count) if game_count is not None else 0
            data["total_games"] += game_count
            if country not in data["countries"]:
                data["countries"][country] = {"total_games": 0, "leagues": []}
            data["countries"][country]["total_games"] += game_count
            data["countries"][country]["leagues"].append({
                "id": league_id, "league": league, "game_count": game_count
            })
        return data

    top_leagues = await get_top_leagues()
    leagues_summary = await get_leagues_summary()

    ############## HIGHLIGHTS #################
    highlight_games = filtered_matches[:10]

    return JsonResponse({
        "highlight_games": highlight_games,
        "top_leagues": top_leagues,
        "games": paginated_matches,
        "total_matches": total_matches,
        "leagues": leagues_summary
    }, safe=False)


async def fetch_live_games(request):
    sport = request.GET.get("sport", "football").lower()
    page = int(request.GET.get("page", 1))
    page_size = 100

    # Connect to Redis (live cache DB)
    redis_client = aioredis.Redis(host="127.0.0.1", port=6379, db=1, decode_responses=True)

    # Fetch all live fixture keys for this sport
    try:
        keys = await redis_client.smembers(f"live:{sport}")
        print(f"Found {len(keys)} live matches for {sport}")

    except Exception as e:
        print(f"Redis error: {e}")
        keys = set()

    key_list = list(keys)

    # Async fetch matches
    async def fetch_match(k):
        value = await redis_client.get(k)
        if value:
            return json.loads(value)
        return None

    tasks = [fetch_match(k) for k in key_list]
    all_matches = await asyncio.gather(*tasks) if tasks else []
    print(f"all Live matches fetched: {len(all_matches)}")

    matches = [m for m in all_matches if m]
    print(f"Live matches fetched: {len(matches)}")

    # Filter live matches (ensure they are still in-play)
    filtered_matches = []
    live_statuses = ["LIVE", "1H", "2H", "HT", "ET", "PEN"]  # ✅ only allow these

    for match in matches:
        status = match.get("status", {}).get("short")  # safely get status.short
        if not status or status not in live_statuses:
            continue  # ❌ skip matches that are not live

        match_datetime_str = match.get("datetime")
        if not match_datetime_str:
            continue

        try:
            match_datetime = parser.parse(match_datetime_str)
        except Exception as e:
            print(f"Skipping match due to invalid datetime: {e}")
            continue

        # ✅ keep live match
        match["datetime_obj"] = match_datetime
        filtered_matches.append(match)

    # Sort by datetime
    filtered_matches.sort(key=lambda m: m["datetime_obj"])

    total_matches = len(filtered_matches)

    # Pagination
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_matches = filtered_matches[start_idx:end_idx]

    if not filtered_matches:
        return JsonResponse({
            "games": [],
            "total_matches": 0
        }, safe=False)

    return JsonResponse({
        "games": paginated_matches,
        "total_matches": total_matches
    }, safe=False)


async def fetch_games_by_leagues(request):
    league_ids = request.GET.get("league_ids", "")
    league_ids = [id.strip() for id in league_ids.split(',') if id.strip().isdigit()]
    league_ids = league_ids[:10]  # limit to 10 leagues

    if not league_ids:
        return JsonResponse({"games": [], "total_matches": 0})

    sport = request.GET.get("sport", "football").lower()

    redis_client = aioredis.Redis(host="127.0.0.1", port=6379, db=1, decode_responses=True)

    # Collect all cache keys for selected leagues
    keys = set()
    for league_id in league_ids:
        try:
            league_keys = await redis_client.smembers(f"league:{sport}:{league_id}")
            keys.update(league_keys)
        except Exception as e:
            print(f"Redis error fetching league {league_id}: {e}")

    # Async fetch matches
    async def fetch_match(k):
        value = await redis_client.get(k)
        if value:
            return json.loads(value)
        return None

    tasks = [fetch_match(k) for k in keys]
    matches = await asyncio.gather(*tasks) if tasks else []
    matches = [m for m in matches if m]

    # Parse datetime for sorting
    for m in matches:
        try:
            m["datetime_obj"] = parser.parse(m["datetime"])
        except:
            m["datetime_obj"] = datetime.now(timezone.utc)

    matches.sort(key=lambda m: m["datetime_obj"])

    return JsonResponse({
        "data": matches,
        "total_matches": len(matches),
        "selected_leagues": league_ids
    }, safe=False)




@csrf_exempt 
def receive_sms(request):
    if request.method == "POST":
        try:
            # Get raw data
            data = request.POST.dict()
            if not data:
                data = json.loads(request.body.decode("utf-8"))

            print("Raw Data:", data)  # Debugging: Print full data received

            # Extract actual message
            if "msg" in data:
                message = data.get("msg", "").strip()
            elif "key" in data:
                message = data["key"].split("\n")[-1].strip()  # Extract message part
            else:
                message = ""

            if not message:
                return JsonResponse({"status": "error", "message": "No message received"}, status=400)

            # Extract Currency
            currency_match = re.search(r'([A-Z]{3})\s*\d+', message)
            currency = currency_match.group(1) if currency_match else "Unknown"

            # Extract Amount
            amount_match = re.search(r'[A-Z]{3}\s*(\d+)', message)
            amount = int(amount_match.group(1)) if amount_match else 0

            # Extract Reference Code
            reference_match = re.search(r'Reference:\s*([A-Z0-9]+)', message)
            confirmation_code = reference_match.group(1) if reference_match else "Unknown"

            # Save to database
            transaction = Transactions.objects.create(
                message=message,
                amount=amount,
                currency=currency,
                confirmation_code=confirmation_code
            )
            transaction.save()

            return JsonResponse({"status": "success", "message": "SMS received & stored"}, status=200)

        except Exception as e:
            print("Error:", str(e))
            return JsonResponse({"status": "error", "message": str(e)}, status=400)

    return JsonResponse({"status": "error", "messsge": "SMS not recieved"})


def sports(request):    
    return render(request, 'sports.html')


def fetch_more_odds(request):
    # Get sport and match_id from query parameters
    sport = request.GET.get("sport")
    match_id = request.GET.get("match_id")

    if not sport or not match_id:
        return JsonResponse({"error": "Missing sport or match_id"}, status=400)

    # Get the match
    try:
        match = Matches.objects.get(match_id=match_id, sport__iexact=sport)
    except Matches.DoesNotExist:
        return JsonResponse({"error": "Match not found"}, status=404)

    # Convert time to local format
    local_kickoff = localtime(match.commence_datetime)
    match_date = local_kickoff.strftime("%Y-%m-%d")
    match_time = local_kickoff.strftime("%H:%M")

    # Get odds for this match (FIX: Use `MatchOdds` model instead of `Odds`)
    odds_queryset = MatchOdds.objects.filter(match="1321575")  # match

    league_id = Leagues.objects.get(league=match.league["name"], sport=match.sport, country=match.country)

    # Prepare response data
    response_data = {
        "match_id": match.match_id,
        "sport": match.sport,
        "league": match.league,
        "league_id": league_id.id,
        "country": match.country,
        "venue": match.venue,
        "extras": match.extras,
        "date": match_date,
        "time": match_time,
        "odds": [],
        "commence_datetime": local_kickoff,
    }

    # Add market odds
    for odds in odds_queryset:
        response_data["odds"].append({
            "market_type": odds.market_type,
            "odds": odds.odds
        })


    return JsonResponse(response_data, safe=False)



def more_odds(request):
    context = {}
    return render(request, 'Moxbet/more-odds.html', context)


def registerPage(request):
    form =  UserRegistrationForm()
    if request.method == 'POST':
        form =  UserRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.username = user.username.lower()
            user.save()
            login(request, user)
            return redirect('sports')
        else:
            messages.error(request, 'An error occuerd during registration')
            return redirect('register')
        
    context = {'form':form}
    return render(request, 'register_login.html', context)

def loginPage(request):
    page = 'login'
    if request.user.is_authenticated:
        return redirect('sports')
    
    if request.method == 'POST':
        username = request.POST.get('username').lower()
        password = request.POST.get('password')
        #checking if the user exists
        try:
            user = User.objects.get(username = username)
        except:
            messages.error(request, 'User does not exist')

        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('sports')
        else:
            messages.error(request, 'Username or password does not exist')

    context = {'page':page}
    return render(request, 'register_login.html', context)

def logoutUser(request):
    logout(request)
    return render(request, 'sports.html')

def index(request): 
    return render(request, 'index.html')

@login_required
def deposit(request):
    if request.method == "POST":
        try:
            user = request.user  # Get logged-in user
            confirmation_code = request.POST.get("confirmation_code", "").strip().upper()

            if not confirmation_code:
                return JsonResponse({"status": "error", "message": "Reference code required"}, status=400)

            # Check if reference code exists in transactions
            transaction = Transactions.objects.filter(confirmation_code=confirmation_code).first()

            if not transaction:
                messages.error(request, f'Confirmation code not found, try again.')
            else:
                # Check if the transaction is already approved
                if transaction.status == "approved":
                    messages.error(request, "Confirmation code already used")

                else:
                    # Check if transaction is still pending
                    if transaction.transaction_type != "deposit":
                        messages.error(request, "Transaction not available for deposit.")
                    else:
                        if transaction.currency != user.currency:  # Check if currency matches the user's currency
                            messages.error(request, f"You cannot deposit {transaction.currency} into the {user.currency} account.")
                        
                        else:
                            # Add transaction amount to user balance
                            user.balance += transaction.amount
                            user.save()

                            # Update transaction status to approved
                            transaction.status = "approved"
                            transaction.user = user  # Assign transaction to user
                            transaction.save()

                            # TO FIX THIS TO BE A MODAL
                            messages.success(request, f'Your deposit of ${transaction.amount} was successful!, Your balance is now {user.balance:.2f}')

        except:
            messages.error("Error encountered")

    return render(request, 'deposit.html')


@login_required
def withdraw(request):
    if request.method == 'POST':
        try:
            letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
            random_number = random.randint(0, 25)
            user = request.user
            confirm_password = request.POST.get('confirm_password')
            transaction_type = 'withdrawal'
            currency = user.currency
            withdrawal_amount = request.POST.get('withdrawal_amount')
            receiving_number = request.POST.get('receiving_number')

            if user.balance is None:
                messages.error(request, 'Your balance is not set')
          
            if not withdrawal_amount:
                messages.error(request, 'Invalid withdrawal amount')
                return render(request, 'widthdrawal.html')

            withdrawal_amount = Decimal(withdrawal_amount)
            confirmation_code = f'WDL{letters[random_number]}{int(int(now().timestamp()))}'
            message = 'Withdrawal request'
            minimum_withdrawal = {'USD': Decimal('5'), 'ZAR': Decimal('100'), 'ZIG': Decimal('200')}.get(currency, Decimal('1'))

            if check_password(confirm_password, user.password):
                if withdrawal_amount > user.balance:
                    messages.error(request, 'You cannot widthdraw more than your balance')
                
                elif withdrawal_amount < minimum_withdrawal:
                    messages.error(request, f'Please note that minimum withdrawal is {minimum_withdrawal}')
                
                elif not receiving_number:
                    messages.error(request, f"Please enter the reciever's number")  
                else:
                    transaction = Transactions.objects.create(
                                    amount = withdrawal_amount, message = message, currency = currency,
                                    user = user, transaction_type = transaction_type,
                                    confirmation_code = confirmation_code)

                    user.balance -= withdrawal_amount
                    user.save()
                    transaction.save()
                    messages.success(request, 'Widthdrawal request submitted succesfully.')
                
            else:
                messages.error(request, 'Incorect password')
        except Exception as e:
            messages.error(request, f'An error occured: {str(e)}')
    context = {}
    return render(request, 'withdraw.html', context)

def h2hPage(request):
    context = {}
    return render(request, 'home-2-head.html', context)


def results(request):
    context = {}
    return render(request, 'results.html', context)


def luckyNumbers(request):
    context = {}
    return render(request, 'luckynumbers.html', context)


def live(request):
    return render(request, 'live.html')

def check_ticket(request):
    ticket = []
    if request.method == 'POST':
        try:
            ticket_id = request.POST.get('ticket_id') if request.POST.get('ticket_id') != None else ''
            print(f"Ticket id: {ticket_id}")
            ticket_query = Tickets.objects.get(id=ticket_id)
            ticket.append({'ticket': ticket_query})
            print(f"type : {ticket[0].status}")
        except:
            messages.error(request, 'Failed to check ticket')
    
    return render(request, 'Moxbet/check_ticket.html', {'ticket': ticket})
        

# def get_tickets_data(req) get-tickets-data
# def fetch_tickets(request):
#     tickets = Tickets.objects.filter(user_id=request.user.id).values().order_by('-created_at')
#     tickets_list = list(tickets)
#     return JsonResponse({"tickets": tickets_list}, safe=False)

@login_required
def fetch_tickets(request):
    status_fil = request.GET.get('status_fil').capitalize()
    ticket_tp_fil = request.GET.get('ticket_tp_fil').lower()
    ticket_sts_fil = request.GET.get('ticket_sts_fil').capitalize()
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')

    tickets = Tickets.objects.filter(user_id=request.user.id).order_by('-created_at')

    if status_fil:
        if status_fil == 'Settled':
            tickets = tickets.exclude(status='Pending') 
        else:
            tickets = tickets.filter(status__iexact=status_fil)

    if ticket_tp_fil:
        tickets = tickets.filter(type__iexact=ticket_tp_fil)  

    if ticket_sts_fil:
        if ticket_sts_fil == 'All':
            tickets = tickets
        else:
            tickets = tickets.filter(status__iexact=ticket_sts_fil) 

    if date_from and date_to:
        from_date = parse_date(date_from)
        to_date = parse_date(date_to)
        if from_date and to_date:
            tickets = tickets.filter(created_at__date__range=(from_date, to_date))  
    print(f"{tickets.count()}")
    return JsonResponse({"tickets": list(tickets.values())})


@login_required
def mybets(request):
    context = {}
    return render(request, 'mybets.html', context)


def betslip(request):
    context = {}
    return render(request, 'betslip.html', context)

# temporary view
def details(request):
    context = {}
    return render(request, 'details.html', context)


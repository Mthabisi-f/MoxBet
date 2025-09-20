from django.shortcuts import render, redirect
from django.contrib import messages
from django.http import HttpRequest, JsonResponse, HttpResponseRedirect
from .models import User, Transactions, WinBoost, Tickets, Limits, Bookings
from .forms import UserRegistrationForm
from .redis_client import redis_client
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
import asyncio
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
@login_required
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
                type=data.get("bet_type", "other").capitalize(),
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
                "user_balance": str(user.balance),  
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


# Get booking using booking code from db
@csrf_exempt
async def get_booking(request):
    if request.method == "POST":
        Bcode = request.POST.get("Bcode")
        if not Bcode:
            return JsonResponse({"success": False, "message": "Missing booking code"}, status=400)

        code = f"B{Bcode}"
        booking = await sync_to_async(Bookings.objects.filter(booking_code=code).first)()
        if not booking:
            return JsonResponse({"success": False, "message": "Booking not found"}, status=404)

        try:
            selections = json.loads(booking.selections)
        except Exception:
            return JsonResponse({"success": False, "message": "Invalid booking selections"}, status=400)

    
        updated_selections = []
        for selection in selections:
            try:
                value = await redis_client.get(f"match:{selection['match_id']}")
                match_data = json.loads(value) if value else None
            except Exception as e:
                print(f"Redis error: {e}")
                continue

            if not match_data:
                continue

            prediction = selection.get("prediction")
            market_type = selection.get("market_type")

            odd_info = (
                match_data.get("odds", {})
                .get(market_type, {})
                .get(prediction, {})
            )

            if not odd_info or odd_info.get("suspended"):
                continue

            selection["match_odds"] = odd_info.get("odd")
            updated_selections.append(selection)

        if not updated_selections:
            return JsonResponse({
                "success": False,
                "message": "No valid selections found (all odds suspended or matches missing)."
            }, status=400)

        return JsonResponse({
            "success": True,
            "message": "Booking retrieved successfully",
            "updated_selections": updated_selections
        })



# Get latest odds from redis
# @csrf_exempt
# async def get_latest_odds(request):
#     if request.method == "POST":
#         data = json.loads(request.body)
#         selections = data.get("selections", [])

#         updated_selections = []

#         for selection in selections:
#             try:
#                 # Fetch single match directly from Redis
#                 value = await redis_client.get(f"match:{selection['match_id']}")
#                 match_data = json.loads(value) if value else None
#             except Exception as e:
#                 print(f"Redis error: {e}")
#                 match_data = None

#             if match_data:
#                 market_type = selection["market_type"]
#                 prediction = selection["prediction"]

#                 odds = (
#                     match_data.get("odds", {})
#                     .get(market_type, {})
#                     .get(prediction, {})
#                     .get("odd", selection["match_odds"])
#                 )

#                 updated_selections.append({
#                     "match_id": selection["match_id"],
#                     "match_odds": odds
#                 })
        
#         if not updated_selections:
#             return JsonResponse({
#                 "success": False,
#                 "message": "No valid selections found (all odds suspended or matches missing)."
#             }, status=400)

#         return JsonResponse({"success": True,
#                             "updated_selections": updated_selections})


@csrf_exempt
async def get_latest_odds(request):
    if request.method == "POST":
        data = json.loads(request.body)
        selections = data.get("selections", [])

        updated_selections = []

        for selection in selections:
            try:
                # Fetch single match from Redis
                value = await redis_client.get(f"match:{selection['match_id']}")
                match_data = json.loads(value) if value else None
            except Exception as e:
                print(f"Redis error: {e}")
                match_data = None

            if not match_data:
                # Skip this selection completely if match not in Redis
                continue

            market_type = selection["market_type"]
            prediction = selection["prediction"]

            # Get current odd in Redis
            current_odd = (
                match_data.get("odds", {})
                .get(market_type, {})
                .get(prediction, {})
                .get("odd")
            )

            if current_odd and str(current_odd) != str(selection["match_odds"]):
                # Update only the odds field
                selection["match_odds"] = current_odd

            # Append (always with all its keys)
            updated_selections.append(selection)

        # If no valid selections → return empty list
        if not updated_selections:
            return JsonResponse({
                "success": False,
                "message": "No valid selections found."
            }, status=400)

        return JsonResponse({
            "success": True,
            "updated_selections": updated_selections
        })



# Fetches games by sport
async def fetch_games(request):
    sport = request.GET.get("sport", "football").lower()
    page = int(request.GET.get("page", 1))
    page_size = 100


    # Fetch keys from Redis
    try:
        keys = await redis_client.smembers(f"sport:{sport}")
    except Exception as e:
        print(f"Redis error: {e}")
        keys = set()

    key_list = list(keys)

    async def fetch_match(k):
        value = await redis_client.get(k)
        return json.loads(value) if value else None

    tasks = [fetch_match(k) for k in key_list]
    all_matches = await asyncio.gather(*tasks) if tasks else []
    matches = [m for m in all_matches if m]

    # Filter by upcoming matches
    filtered_matches = []
    for match in matches:
        dt_str = match.get("datetime")
        if not dt_str:
            continue
        try:
            dt = parser.parse(dt_str)
        except Exception as e:
            print(f"Skipping match due to invalid datetime: {e}")
            continue
        if dt >= datetime.now(timezone.utc):
            match["datetime_obj"] = dt
            filtered_matches.append(match)

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
            "countries": {}
        }, safe=False)

    ########### TOP LEAGUES ###########
    # Try to get manually-set priority leagues
    priority_leagues = await redis_client.lrange(f"priority_leagues:{sport.upper()}", 0, -1)

    # Build league counts + league info map
    league_counts = {}
    league_info_map = {}

    for m in filtered_matches:
        league = m.get("league", {})
        league_id = league.get("id")
        league_name = league.get("name")
        country = m.get("country")
        flag = league.get("flag")

        if not league_name:
            continue

        league_counts[league_name] = league_counts.get(league_name, 0) + 1

        # Store league info once
        if league_name not in league_info_map:
            league_info_map[league_name] = {
                "id": league_id,
                "name": league_name,
                "country": country,
                "flag": flag,
            }

    # Convert to sorted list (by count)
    sorted_leagues = sorted(league_counts.items(), key=lambda x: x[1], reverse=True)

    # Final top leagues: priority first, then fill with most active
    top_leagues = []
    added = set()

    for pl in priority_leagues:
        if pl in league_counts:
            info = league_info_map.get(pl, {"id": None, "name": pl, "country": None, "flag": None})
            top_leagues.append({
                **info,
                "game_count": league_counts[pl],
            })
            added.add(pl)

    for nm, ct in sorted_leagues:
        if nm not in added and len(top_leagues) < 10:
            info = league_info_map.get(nm, {"id": None, "name": nm, "country": None, "flag": None})
            top_leagues.append({
                **info,
                "game_count": ct,
            })


    ########### COUNTRIES ###########
    countries_data = {}
    for m in filtered_matches:
        country = m.get("country")
        league_name = m.get("league", {}).get("name")
        league_id = m.get("league", {}).get("id")
        flag = m.get("league", {}).get("flag")
        if not country or not league_name:
            continue

        if country not in countries_data:
            countries_data[country] = {"name": country, "total_games": 0, "leagues": [], "flag": flag}

        countries_data[country]["total_games"] += 1

        # Add league if not already added
        leagues_list = countries_data[country]["leagues"]
        if not any(l["name"] == league_name for l in leagues_list):
            leagues_list.append({
                "name": league_name,
                "id": league_id,
                "game_count": league_counts.get(league_name, 0)
            })

    ########### HIGHLIGHTS ###########
    highlight_games = filtered_matches[:10]

    return JsonResponse({
        "highlight_games": highlight_games,
        "top_leagues": top_leagues,
        "games": paginated_matches,
        "total_matches": total_matches,
        "countries": countries_data
    }, safe=False)



# Fetches all live games for chosen sport
async def fetch_live_games(request):
    sport = request.GET.get("sport", "football").lower()
    page = int(request.GET.get("page", 1))
    page_size = 100

   
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


# Fetch all odds for a certain fixture
async def fetch_more_odds(request):
    sport = request.GET.get("sport", "football").lower()
    match_id = request.GET.get("match_id")

    if not sport or not match_id:
        return JsonResponse({"error": "Missing sport or match_id"}, status=400)


    cache_key = f"match:{match_id}"
    try:
        value = await redis_client.get(cache_key)
        if not value:
            return JsonResponse({"error": "Match not found."}, status=404)

        match_data = json.loads(value)

        return JsonResponse(match_data, safe=False)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# Fetch games by selected leagues
async def fetch_games_by_leagues(request):
    league_ids = request.GET.get("league_ids", "")
    league_ids = [id.strip() for id in league_ids.split(",") if id.strip().isdigit()]
    league_ids = league_ids[:10]  # limit to 10 leagues

    if not league_ids:
        return JsonResponse({"games": [], "total_matches": 0, "selected_leagues": []}, safe=False)

    sport = request.GET.get("sport", "football").lower()

    # Collect all cache keys for selected leagues
    keys = set()
    for league_id in league_ids:
        try:
            league_keys = await redis_client.smembers(f"league:{sport}:{league_id}")
            keys.update(league_keys)
        except Exception as e:
            print(f"Redis error fetching league {league_id}: {e}")

    key_list = list(keys)

    # Async fetch all matches from Redis
    async def fetch_match(k):
        value = await redis_client.get(k)
        if value:
            return json.loads(value)
        else:
            # Remove dangling keys if they have no value
            for league_id in league_ids:
                await redis_client.srem(f"league:{sport}:{league_id}", k)
            return None

    tasks = [fetch_match(k) for k in key_list]
    all_matches = await asyncio.gather(*tasks) if tasks else []

    matches = [m for m in all_matches if m]
    print(f"[DEBUG] Keys fetched: {len(key_list)}, Matches found: {len(matches)} for leagues {league_ids}")

    # Filter upcoming matches (optional)
    filtered_matches = []
    for match in matches:
        match_datetime_str = match.get("datetime")
        if not match_datetime_str:
            continue
        try:
            match_datetime = parser.parse(match_datetime_str)
        except Exception as e:
            print(f"Skipping match due to invalid datetime: {e}")
            continue
        match["datetime_obj"] = match_datetime
        filtered_matches.append(match)

    # Sort by datetime
    filtered_matches.sort(key=lambda m: m["datetime_obj"])
    total_matches = len(filtered_matches)

    return JsonResponse({
        "games": filtered_matches,
        "total_matches": total_matches,
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



def more_odds(request):
    context = {}
    return render(request, 'more-odds.html', context)


def registerPage(request):
    form =  UserRegistrationForm()
    if request.method == 'POST':
        form =  UserRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.username = user.username.strip().capitalize()
            user.first_name = user.first_name.strip().capitalize()
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
        username = request.POST.get('username', '').strip().capitalize()
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
    
    return render(request, 'check_ticket.html', {'ticket': ticket})
        


@login_required
def fetch_tickets(request):
    status_fil = request.GET.get('status_fil').capitalize()
    ticket_tp_fil = request.GET.get('ticket_tp_fil').capitalize()
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


def betslip_page(request):
    context = {}
    return render(request, 'betslip_page.html', context)


def search_page(request):
    context = {}
    return render(request, 'search_page.html', context)


def profile(request):
    context = {}
    return render(request, 'profile.html', context)


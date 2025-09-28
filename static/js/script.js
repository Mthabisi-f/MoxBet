document.addEventListener('DOMContentLoaded', function() {
    const stakeInput = document.getElementById('input-stake');
    const betslipContainer = document.querySelector('.betslip-container');
    const noGamesSelected = document.getElementById('betslip-no-games-selected');
    const someGamesSelected = document.getElementById('betslip-some-games-selected');
    const gamesInATicket = document.querySelector('.games-in-a-ticket-list');
    const gamesDisplay = document.querySelectorAll('.games-display');
    const gamesDisplayMoreOdds = document.getElementById('games-display-all-odds'); 
    const gamesDisplaySports = document.getElementById('games-display-sports');
    const gamesDisplayLive = document.getElementById('games-display-live');
    const oddsDescription = document.getElementById('odds-description');
    const allEventsContainer = document.getElementById('all-events-container');
    const mainNavbar = document.getElementById('main-navbar');
    const sportNavbar = document.getElementById('sport-navbar');
    const filterGamesBy = document.getElementById('filter-games-by');
    const livePage = document.getElementById('live-page');
    const limits = document.getElementById('limits');
    const copyrightYear =  document.querySelectorAll('.copyright-year');
    const minStakeDisplay = document.getElementById("min-stake-display");
    const betslipForm = document.getElementById("betslip-form");
    const numberOfSelectedGames = document.querySelectorAll(".numberOfSelectedGames");
    const oddsChangeAlert = document.getElementById("odds-change-alert");
    const acceptOddsBtn = document.getElementById("accept-odds-btn");
    const placeBetBtn = document.getElementById("place-bet-btn");
    const bookBetBtn = document.getElementById("book-bet-btn");
    const spinner = document.createElement('div');
    const path = window.location.pathname;
    let successModal, bookingModal, currencySymbol, data, Countries, api_key 
    let minStake, maxWin, minWithdrawal, maxWithdrawal, minDeposit
    let betslipSelections = JSON.parse(localStorage.getItem("betslipSelections") || "[]");

    let currentSport = 'football';      
    const now = new Date();


    mainNavbar.querySelectorAll('.nav-item').forEach(navItem =>{
        navItem.addEventListener('click', function(){
            if(navItem.classList.contains('top-nav-item-active')){
                return;
            }
            else{
                const activeBtns = mainNavbar.querySelectorAll('.top-nav-btn-active')
                activeBtns.forEach(activeBtn => {
                    activeBtn.classList.remove('top-nav-btn-active');
                });
                navItem.classList.add('top-nav-item-active');
            }
        });
    })


    document.querySelectorAll('.sport-button').forEach(btn => {
        btn.addEventListener('click', function (event) {
            const selectedSport = this.dataset.sport;
            if(selectedSport !== currentSport){
                currentSport = this.dataset.sport;
                fetchGamesBySport(currentSport);
            }
            const navItem = this.closest('.nav-item');
            const previouslyActive = btn.closest('.sport-btn-active')
            if(previouslyActive){
                return;
            }
            else{
                sportNavbar.querySelectorAll('.sport-btn-active').forEach(activeBtn => {
                    activeBtn.classList.remove('sport-btn-active');
                })
                navItem.classList.add('sport-btn-active');
            }
        })
    })


    if(limits){
        api_key = limits.apiKey;
        currencySymbol = limits.dataset.currencySymbol;
        maxWin = limits.dataset.maxWin;
        minWithdrawal = limits.dataset.minWithdrawal;
        maxWithdrawal = limits.dataset.maxWithdrawal;
        minDeposit = limits.dataset.minDeposit;
    }


    spinner.className = 'text-center my-5 p-5';
    spinner.innerHTML = `
        <div class="spinner-border text-aqua" " role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `;



    if(copyrightYear){
        copyrightYear.forEach(cprty => {
            cprty.className = 'text-white text-center';
            cprty.innerHTML = `&copy; Moxbet ${now.getFullYear()} all rights reserverd.`;
        })
    }



    if(gamesInATicket && gamesInATicket.innerHTML == ''){
        if(!someGamesSelected.classList.contains('d-none')){
            someGamesSelected.classList.add('d-none');
            noGamesSelected.classList.remove('d-none');
        }
    }


    if(document.getElementById("successModal")){
        successModal = new bootstrap.Modal(document.getElementById("successModal"));
    }


    if(document.getElementById("bookingModal")){
        bookingModal = new bootstrap.Modal(document.getElementById("bookingModal"));
    }


    if (limits && stakeInput && minStakeDisplay) {
        const minStake = limits.dataset.minStake ? parseFloat(limits.dataset.minStake) : 0.50;
        if (currencySymbol) {
            minStakeDisplay.textContent = `${currencySymbol} ${minStake.toFixed(2)}`;
        } else {
            minStakeDisplay.textContent = `$${minStake.toFixed(2)}`;
        }
    }



    async function fetchUpdatedOdds(selections) {
        try {
            const response = await fetch("/get-latest-odds/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value,
                },
                body: JSON.stringify({ selections }), 
            });
            return await response.json();
        } catch (error) {
            console.error("Error fetching updated odds:", error);
            return { updated_selections: selections };
        }
    }


    // Function to Create Bet Item per match on betslip
    // it requires 11 arguments
    function createGameElement(oddsValue, marketType, homeTeam, awayTeam, prediction, matchId, sport, datetime, leagueId, country, league) {
        // convert to local date and time
        let dateObj = new Date(datetime);

        let date = dateObj.toLocaleDateString("en-GB");
        let time = dateObj.toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit"});

        const li = document.createElement("li");
        li.className = `row g-0 bb-aqua p-2 selected-game ${matchId}`;
        li.innerHTML = `
            <div id="li-element" data-sport="${sport}" data-country="${country}" data-league="${league}" data-league-id="${leagueId}" data-datetime="${datetime}" data-prediction="${prediction}" data-odds-value="${oddsValue}" data-market-type="${marketType}" data-match-id="${matchId}" class="col-10 mb-5px fw-bold text-truncate">${marketType} - ${prediction}</div>
            <div id="odds-value" class="col-2 fw-bold text-center">${oddsValue}</div>
            <div class="col-10 text-truncate">
                <div class="row g-0 mb-5px">
                    <div data-home-team="${homeTeam}" class="col-auto pe-1 text-truncate">${homeTeam}</div>
                    <div data-away-team="${awayTeam}" class="col-6 text-truncate"><span class="me-1">v</span>${awayTeam}</div>
                </div>
                <div class="text-small text-yellow"><span class="text-white">${date}</span> ${time}</div>
            </div>
            <div class="col-2 text-center">
                <button class="btn-close" type="button" aria-label="Close"></button>
            </div>
        `;

        // A button for removing that match element on beslip
        const removeBtn = li.querySelector(".btn-close");
        removeBtn.addEventListener("click", function(){
            li.remove();
            removeSelection(matchId);
            numberOfSelectedGames.forEach(el => {
                el.textContent = gamesInATicket.querySelectorAll(".selected-game").length || betslipSelections.length;
            });

            betslipSummaryCalculator();
            const match = gamesDisplaySports.querySelector(`[data-match-id="${matchId}"]`);
            if(match){
                const oddsBtn = match.querySelector('.odds-btn-active');
                oddsBtn.classList.remove('odds-btn-active');
            }
            if(gamesInATicket.innerHTML == ''){
                if(!someGamesSelected.classList.contains('d-none')){
                    someGamesSelected.classList.add('d-none');
                    noGamesSelected.classList.remove('d-none');
                }
            }
        });

        return li;   
    }


    // For removing all selections in a betslip
    const removeAllSelections = document.getElementById('remove-all-selections');
    if(removeAllSelections){
        removeAllSelections.addEventListener('click', function(){
            removeAllSelections.style.cursor = 'pointer';
            const activeBtns = document.querySelectorAll('.odds-btn-active');
            activeBtns.forEach(btn=>{
                btn.classList.remove('odds-btn-active');
            })
            gamesInATicket.innerHTML = '';
            
            if(!someGamesSelected.classList.contains('d-none')){
                someGamesSelected.classList.add('d-none');
                if(noGamesSelected.classList.contains('d-none')){
                    noGamesSelected.classList.remove('d-none');
                }
            }
            numberOfSelectedGames.textContent = gamesInATicket.querySelectorAll(".selected-game").length;
            removeAllSelectionsInLocalStorage();
            betslipSummaryCalculator();
        });
    }


    // If betslip is empty (for booking codes and more)
    if(noGamesSelected){
        document.getElementById('get-booking').addEventListener('submit', function(e){
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);

            fetch(form.action, {
                method : 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if(data.success && data.updated_selections){
                    const selections = data.updated_selections;

                    if(someGamesSelected.classList.contains('d-none')){
                        someGamesSelected.classList.remove('d-none');
                        noGamesSelected.classList.add('d-none');
                    }
                
                    // const oddsValue = button.textContent;
                    selections.forEach(selection =>{
                        const oddsValue = selection["match_odds"];
                        const marketType = selection["market_type"];
                        const selectedGames = gamesInATicket.querySelectorAll(".selected-game");
                        const homeTeam = selection["home_team"];
                        const awayTeam = selection["away_team"];
                        const datetime = selection["date_time"];
                        const leagueId = selection["league_id"];
                        const matchId = selection["match_id"];
                        const country = selection["country"];
                        const league = selection["league"];
                        const sport = selection["sport"];
                        const prediction = selection["prediction"];
        
                        const newGame = createGameElement(oddsValue, marketType, homeTeam, awayTeam, prediction, matchId, sport, datetime, leagueId, country, league);

                        let matchFound = false;
                        selectedGames.forEach((game) => {
                            if (game.classList.contains(matchId)) {
                                game.remove();
                                gamesInATicket.appendChild(newGame);
                                matchFound = true;
                            }
                        });

                        if (!matchFound) {
                            gamesInATicket.appendChild(newGame);                       
                        }

                        numberOfSelectedGames.textContent = gamesInATicket.querySelectorAll(".selected-game").length;
                        betslipSummaryCalculator();
                    
                    })
                    
                } else {
                    // Show backend error
                    const errorContainer = noGamesSelected.querySelector(".errors");
                    let message = data.message || data.error || "Something went wrong.";
                    errorContainer.innerHTML = `
                        <div class="alert alert-danger alert-dismissible fade show" role="alert">
                            ${message}
                            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                        </div>
                    `;

                    // Auto-hide after 10 seconds
                    setTimeout(() => {
                        const alert = errorContainer.querySelector(".alert");
                        if (alert) {
                            alert.classList.remove("show");
                            alert.classList.add("fade");
                            setTimeout(() => alert.remove(), 500);
                        }
                        },5000);
                    }

            })
            .catch(error =>{
                console.log(error)
            })
        })
    } 


    if(livePage && window.location.pathname.includes('/live/')){
        let chosenSport = 'football';
        fetchLiveGamesBySport(chosenSport);
        
        livePage.addEventListener('click', function(event){
            if(event.target.classList.contains('sport-button')){
                const selectedbtn = event.target;
                chosenSport = selectedbtn.dataset.sport;
                if(!selectedbtn.classList.contains('br-and-b-aqua')){
                    selectedbtn.classList.add('br-and-b-aqua');
                    fetchLiveGamesBySport(chosenSport)
                }
                Array.from(livePage.querySelectorAll('.sport-button')).forEach(btn =>{
                    if(btn != selectedbtn){
                        if(btn.classList.contains('br-and-b-aqua')){
                            btn.classList.remove('br-and-b-aqua');
                        }
                    }
                })
            }
        })
    }



    // activate all odds button whose selections are in local storage
    // betslipContainer
    betslipSelections.forEach(sel => {
        const containerz = document.querySelectorAll(`[data-match-id="${sel.match_id}"]`);
        containerz.forEach(container =>{                                               
            const buttons = container.querySelectorAll(`[data-prediction="${sel.prediction}"]`);
            if(buttons){
                buttons.forEach(btn => {
                    const mk_type = btn.closest('[data-market-type]');
                    if(mk_type && mk_type.getAttribute('data-market-type') === sel.market_type){
                        const activeBtns = mk_type.querySelectorAll('.odds-btn-active');
                        activeBtns.forEach(btn => {
                            btn.classList.remove('odds-btn-active');
                        });
                        btn.classList.add('odds-btn-active');
                    }
                })

            }
            
        });
    })



    async function  WinBoost(number_of_games, totalOdds, stakeAmount){
        if(number_of_games <= 21){
            const res = await fetch(`/win-boost/?number_of_selections=${number_of_games}`);
            const data = await res.json();
            return  Number((data.win_boost_percentage) * (totalOdds * stakeAmount)).toFixed(2);
        }else if(number_of_games >= 22){
            return  Number( 0.5 * (totalOdds * stakeAmount)).toFixed(2);
        }
    }


    // Handle Clicking on Odds Button
    if(gamesDisplay){
        gamesDisplay.forEach(gd => {

            gd.addEventListener("click", function (event) {

                if(event.target.classList.contains('filter-odds-by')){
                    const selectedFilter = event.target;
                    if(!selectedFilter.classList.contains('br-and-b-aqua')){
                        selectedFilter.classList.add('br-and-b-aqua');
                    }
                    Array.from(gamesDisplayMoreOdds.querySelectorAll('.filter-odds-by')).forEach(filter =>{
                        if(filter != selectedFilter){
                            if(filter.classList.contains('br-and-b-aqua')){
                                filter.classList.remove('br-and-b-aqua');
                            }
                        }
                    })
                }

                if (event.target.classList.contains("prediction") || event.target.classList.contains("odds-value") || event.target.classList.contains("odds-btn")) {
                    event.preventDefault();
                    event.stopPropagation();

                    // ✅ Always resolve the parent button
                    const button = event.target.closest(".odds-btn");
                    if (!button) return; // safety

                    // Get odds value correctly
                    const oddsValue = button.querySelector(".odds-value")?.textContent || button.textContent.trim();

                    const prediction = button.getAttribute("data-prediction");

                    if (oddsValue && prediction) {
                        const matchContainer = button.closest(".match-link");
                        const marketType = button.closest("[data-market-type]").getAttribute("data-market-type");
                        const selectedGames = gamesInATicket.querySelectorAll(".selected-game");
                        const homeTeam = matchContainer.querySelector("[data-home-team]").getAttribute("data-home-team");
                        const awayTeam = matchContainer.querySelector("[data-away-team]").getAttribute("data-away-team");
                        const datetime = matchContainer.querySelector("[data-datetime]").getAttribute("data-datetime");
                        const leagueId = matchContainer.querySelector("[data-league-id]").getAttribute("data-league-id");
                        const matchId = matchContainer.querySelector("[data-match-id]").getAttribute("data-match-id");
                        const country = matchContainer.querySelector("[data-country]").getAttribute("data-country");
                        const league = matchContainer.querySelector("[data-league]").getAttribute("data-league");
                        const sport = matchContainer.querySelector("[data-sport]").getAttribute("data-sport");

                        const newGame = createGameElement(
                            oddsValue,
                            marketType,
                            homeTeam,
                            awayTeam,
                            prediction,
                            matchId,
                            sport,
                            datetime,
                            leagueId,
                            country,
                            league
                        );

                        const selection = {
                            sport: sport,
                            country: country,
                            league: league,
                            league_id: leagueId,
                            date_time: datetime,
                            prediction: prediction,
                            odds_value: oddsValue,
                            market_type: marketType,
                            match_id: matchId,
                            home_team: homeTeam,
                            away_team: awayTeam,
                        };

                        addSelection(selection);

                        // Toggle active class
                        matchContainer.querySelectorAll(".odds-btn-active").forEach((btn) =>
                            btn.classList.remove("odds-btn-active")
                        );
                        button.classList.add("odds-btn-active");

                        // Replace or append game in betslip
                        let matchFound = false;
                        selectedGames.forEach((game) => {
                            if (game.classList.contains(matchId)) {
                                game.remove();
                                gamesInATicket.appendChild(newGame);
                                matchFound = true;
                            }
                        });

                        if (!matchFound) {
                            gamesInATicket.appendChild(newGame);
                        }

                        // Update summary UI
                        if (gamesInATicket.querySelectorAll(".selected-game").length > 0) {
                            someGamesSelected.classList.remove("d-none");
                            noGamesSelected.classList.add("d-none");
                        } else {
                            someGamesSelected.classList.add("d-none");
                            noGamesSelected.classList.remove("d-none");
                        }

                        numberOfSelectedGames.forEach((el) => {
                            el.textContent =
                                gamesInATicket.querySelectorAll(".selected-game").length ||
                                betslipSelections.length;
                        });
                        betslipSummaryCalculator();
                    }
                }
            });

        });
    }


    // Calculate Betslip Summary
    function betslipSummaryCalculator() {
        let totalOdds = 1.0,
            win_boost = 0.00,
            stakeAmount = parseFloat(stakeInput.value || 0) || 0,
            selections = [];

        document.querySelectorAll(".selected-game").forEach(selection => {
            const matchId = selection.querySelector('[data-match-id]').getAttribute('data-match-id');
            const homeTeam = selection.querySelector('[data-home-team]').getAttribute('data-home-team');
            const awayTeam = selection.querySelector('[data-away-team]').getAttribute('data-away-team');
            const prediction = selection.querySelector('[data-prediction]').getAttribute('data-prediction');
            const datetime = selection.querySelector('[data-datetime]').getAttribute('data-datetime');
            const leagueId = selection.querySelector('[data-league-id]').getAttribute('data-league-id');
            const sport = selection.querySelector('[data-sport]').getAttribute('data-sport');
            const country = selection.querySelector('[data-country]').getAttribute('data-country');
            const league = selection.querySelector('[data-league]').getAttribute('data-league');
            const oddsValue = parseFloat(selection.querySelector('[data-odds-value]').getAttribute('data-odds-value')) || 1;

            selections.push({
                match_id: matchId,
                home_team: homeTeam,
                away_team: awayTeam,
                market_type: selection.querySelector('[data-market-type]').getAttribute('data-market-type'),
                prediction: prediction,
                match_odds: oddsValue.toFixed(2),
                sport: sport,
                status: 'Pending',
                date_time: datetime,
                league_id: leagueId,
                country: country,
                league: league
            });

            totalOdds *= oddsValue; // ✅ multiply number by number
        });

        // ✅ Always recalc when selections change
        WinBoost(selections.length, totalOdds, stakeAmount).then(boost => {
            win_boost = boost;

            let potential_win = (Number(win_boost) + (Number(totalOdds) * Number(stakeAmount))).toFixed(2);
            if (potential_win > Number(maxWin)) {
                potential_win = Number(maxWin);
            }

            // Update DOM
            document.getElementById("total_odds").textContent = totalOdds.toFixed(2);
            document.getElementById("win_boost").textContent = win_boost;
            document.getElementById("potential_win").textContent = potential_win;

            // Update hidden fields
            document.getElementById("selections").value = JSON.stringify(selections);
            document.getElementById("total-odds").value = totalOdds.toFixed(2) || 1;
            document.getElementById("bet-type").value = 'Sports';
            document.getElementById("win-boost").value = win_boost || 0;
            document.getElementById("potential-win").value = potential_win || 1;
        });
    }


    if(stakeInput){
        stakeInput.addEventListener("input", function () {
            const newStakeAmount = parseFloat(this.value || 0).toFixed(2);
            const toggleDisplay = betslipContainer.querySelector('.betslip-summary .toggle-display');
            if(newStakeAmount > 0){
                toggleDisplay.classList.remove('d-none');
            }else{
                toggleDisplay.classList.add('d-none');
            }
            betslipSummaryCalculator();
        });
    }


    if(betslipContainer){
        const offersWrapper = document.getElementById('offers-wrapper');
        const offersWrapperContent = document.getElementById('offers-wrapper-content');
        let activeDivId = offersWrapper.querySelector('.offer-wrapper-div-active').id
        let offersContentDivs = offersWrapperContent.querySelectorAll('.offers-content');


        offersWrapper.addEventListener('click', function(event){
            const childElements = offersWrapper.querySelectorAll('.offers');
            
            childElements.forEach(el => {
                if(el != event.target){
                    if(el.classList.contains('offer-wrapper-div-active')){
                        el.classList.remove('offer-wrapper-div-active');
                    }
                }
                else{
                    if(!el.classList.contains('offer-wrapper-div-active')){
                        el.classList.add('offer-wrapper-div-active');
                        activeDivId = el.id;
                        offersContentDivs.forEach(div => {
                            if(div.id != activeDivId){
                                if(!div.classList.contains('d-none')){
                                    div.classList.add('d-none')
                                }
                            }
                            else{
                                if(div.classList.contains('d-none')){
                                    div.classList.remove('d-none');
                                }
                            }
                        })  
                    }
                }
            })        
        })


        offersContentDivs.forEach(div => {
            if(div.id != activeDivId){
                if(!div.classList.contains('d-none')){
                    div.classList.add('d-none')
                }
            }
            else{
                if(div.classList.contains('d-none')){
                    div.classList.remove('d-none');
                }
            }
        }) 
        
        
        
        betslipForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const clickedButton = event.submitter;
           
            if (clickedButton.value === "place") {
                this.action = placeBetUrl;
                placeBetBtn.disabled = true;
                placeBetBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Placing Bet...';

                try {
                    let selections = JSON.parse(document.getElementById("selections").value);

                    if (selections.length > 25) {
                        showErrorAlert("Betslip must have 25 or less selections");
                        return;
                    }

                    // 🔄 Fetch updated odds from backend
                    let response = await fetchUpdatedOdds(selections);
                    let updatedSelections = response.updated_selections || [];
                    let hasChanges = false;

                    // Track valid match IDs
                    let updatedMatchIds = new Set(updatedSelections.map(s => s.match_id));

                    // Loop over DOM selections
                    document.querySelectorAll(".selected-game").forEach(selectionEl => {
                        let matchId = selectionEl.querySelector("[data-match-id]").getAttribute("data-match-id");
                        let updated = updatedSelections.find(s => s.match_id == matchId);
                        let updateLocalStorage = betslipSelections.find(s => s.match_id == matchId);

                        if (updated) {
                            let oddsValueEl = selectionEl.querySelector("#odds-value");
                            let oldOdds = parseFloat(oddsValueEl.textContent);
                            let newOdds = parseFloat(updated.match_odds);

                            if (oldOdds !== newOdds) {
                                // update DOM and localStorage
                                oddsValueEl.textContent = newOdds;
                                selectionEl.querySelector('[data-odds-value]').setAttribute('data-odds-value', newOdds);
                                updateLocalStorage.match_odds = newOdds;
                                hasChanges = true;
                            }
                        } else {
                            // ❌ Remove selection if backend no longer has it
                            selectionEl.remove();
                            hasChanges = true;
                        }
                    });

                    // Keep only valid selections
                    let cleanedSelections = updatedSelections.filter(sel => updatedMatchIds.has(sel.match_id));

                    // 🔄 Sync hidden input + localStorage
                    document.getElementById("selections").value = JSON.stringify(cleanedSelections);
                    localStorage.setItem("betslipSelections", JSON.stringify(cleanedSelections));

                    // 🔄 Always recalc totals after syncing selections
                    betslipSummaryCalculator();

                    if (hasChanges) {
                        oddsChangeAlert.classList.remove("d-none");
                        return; // Wait for user to confirm odds change
                    }

                    // ✅ Proceed with bet placement
                    const formData = new FormData(betslipForm);
                    const betResponse = await fetch(betslipForm.action, {
                        method: "POST",
                        body: formData,
                        headers: {
                            "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value,
                            "X-Requested-With": "XMLHttpRequest"
                        }
                    });

                    const data = await betResponse.json();

                    if (data.success) {
                        if (data.user_balance) updateBalanceDisplay(data.user_balance);

                        document.getElementById("user_balance").textContent = `${data.user_balance}`;
                        document.getElementById("ticket-id").textContent = data.ticket_id;
                        document.getElementById("ticket-stake").textContent = `${data.currency_symbol}${data.stake}`;
                        document.getElementById("ticket-potential-win").textContent = `${data.currency_symbol}${data.potential_win}`;
                        successModal.show();

                        gamesInATicket.innerHTML = '';
                        removeAllSelectionsInLocalStorage();

                        document.querySelectorAll('.odds-btn-active').forEach(btn => {
                            btn.classList.remove('odds-btn-active');
                        });

                    } else {
                        showErrorAlert(data.message || "Failed to place bet");
                    }

                    if (!(cleanedSelections.length >= 1)) {
                        noGamesSelected.classList.remove('d-none');
                        someGamesSelected.classList.add('d-none');
                        numberOfSelectedGames.forEach(el => el.textContent = '0');
                        stakeInput.value = '';
                    }else{
                        noGamesSelected.classList.add('d-none');
                        someGamesSelected.classList.remove('d-none');
                    }

                } catch (error) {
                    console.error("Error:", error);
                    showErrorAlert("An error occurred while placing your bet");
                } finally {
                    placeBetBtn.disabled = false;
                    placeBetBtn.textContent = "Place Bet";
                }

            } else if (clickedButton.value === "book") {
                this.action = bookBetUrl;
                bookBetBtn.disabled = true;
                bookBetBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Booking Bet...';

                try {
                    let selections = JSON.parse(document.getElementById("selections").value);

                    if (selections.length > 25) {
                        showErrorAlert("Betslip must have 25 or less selections");
                        return;
                    }

                    // 🔄 Fetch updated odds from backend
                    let response = await fetchUpdatedOdds(selections);
                    let updatedSelections = response.updated_selections || [];
                    let hasChanges = false;

                    // Track valid match IDs
                    let updatedMatchIds = new Set(updatedSelections.map(s => s.match_id));

                    // Loop over DOM selections
                    document.querySelectorAll(".selected-game").forEach(selectionEl => {
                        let matchId = selectionEl.querySelector("[data-match-id]").getAttribute("data-match-id");
                        let updated = updatedSelections.find(s => s.match_id == matchId);
                        let updateLocalStorage = betslipSelections.find(s => s.match_id == matchId);

                        if (updated) {
                            let oddsValueEl = selectionEl.querySelector("#odds-value");
                            let oldOdds = parseFloat(oddsValueEl.textContent);
                            let newOdds = parseFloat(updated.match_odds);

                            if (oldOdds !== newOdds) {
                                // update DOM and localStorage
                                oddsValueEl.textContent = newOdds;
                                selectionEl.querySelector('[data-odds-value]').setAttribute('data-odds-value', newOdds);
                                updateLocalStorage.match_odds = newOdds;
                                hasChanges = true;
                            }
                        } else {
                            selectionEl.remove();
                            hasChanges = true;
                        }
                    });

                    // Keep only valid selections
                    let cleanedSelections = updatedSelections.filter(sel => updatedMatchIds.has(sel.match_id));

                    // 🔄 Sync hidden input + localStorage
                    document.getElementById("selections").value = JSON.stringify(cleanedSelections);
                    localStorage.setItem("betslipSelections", JSON.stringify(cleanedSelections));

                    // 🔄 Always recalc totals
                    betslipSummaryCalculator();

                    if (hasChanges) {
                        oddsChangeAlert.classList.remove("d-none");
                        return; // Stop until user accepts changes
                    }

                    // ✅ Proceed with booking
                    const formData = new FormData(betslipForm);
                    const betResponse = await fetch(betslipForm.action, {
                        method: "POST",
                        body: formData,
                        headers: {
                            "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value,
                            "X-Requested-With": "XMLHttpRequest"
                        }
                    });

                    const data = await betResponse.json();

                    if (data.success) {
                        document.getElementById("booking-code").textContent = data.booking_code;
                        bookingModal.show();

                        gamesInATicket.innerHTML = '';
                        removeAllSelectionsInLocalStorage();

                        document.querySelectorAll('.odds-btn-active').forEach(btn => {
                            btn.classList.remove('odds-btn-active');
                        });

                        if (noGamesSelected.classList.contains('d-none')) {
                            noGamesSelected.classList.remove('d-none');
                            someGamesSelected.classList.add('d-none');
                            numberOfSelectedGames.forEach(el => el.textContent = '0');
                            stakeInput.value = '';
                        }
                    } else {
                        showErrorAlert(data.message || "Failed to book bet");
                    }

                } catch (error) {
                    console.error("Error:", error);
                    showErrorAlert("An error occurred while booking your bet");
                } finally {
                    bookBetBtn.disabled = false;
                    bookBetBtn.textContent = "Book Bet";
                }
            }

        });



        function updateBalanceDisplay(newBalance) {
            const balanceElement = document.getElementById("user-balance");
            if (balanceElement) {
                // Update user balance
                balanceElement.textContent = newBalance;
            }
        }
        


        function showErrorAlert(message){
            const alertDiv = document.createElement("div");
            alertDiv.className = "alert alert-danger alert-dismissible fade show";
            alertDiv.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            const container = document.getElementById("alerts-container") || betslipForm;
            container.prepend(alertDiv);
            
            setTimeout(() => {
                alertDiv.remove();
            }, 3000);
        }

        // Add this handler for accepting odds changes
        acceptOddsBtn.addEventListener("click", function() {
            oddsChangeAlert.classList.add("d-none");

            // User must manually click Place Bet / Book Bet again
            showInfoAlert("Odds updated. Please click place/book bet again to continue.");
        });

    }



    const headers = document.querySelectorAll('.my-header');
    headers.forEach(header => {
        header.addEventListener('click', function() {
            // Get the parent item of the clicked header
            const item = this.parentElement;

            // Toggle the 'open' class for the clicked item
            item.classList.toggle('open');

            // Close all other open items
            document.querySelectorAll('.my-item').forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('open');
                }
            });
        });
    });



    function initLiveOddsWebSocket(currentSport) {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const socketUrl = `${wsProtocol}://${window.location.host}/ws/live/${currentSport}/`;
        const socket = new WebSocket(socketUrl);

        socket.onopen = () => {
            console.log(`Connected to live odds WebSocket for ${currentSport}`);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            // data will be the payload from Redis task
            const liveStatuses = ["LIVE", "1H", "2H", "HT", "ET", "BT", "PEN"];

            if (liveStatuses.includes(data.status.short)) {
                updateLiveOddsOnPage(data);
            }
        };

        socket.onclose = () => {
            console.log(`Disconnected from live odds WebSocket for ${currentSport}`);
            // Optional: try to reconnect
            setTimeout(() => initLiveOddsWebSocket(currentSport), 5000);
        };

        socket.onerror = (error) => {
            console.error(`WebSocket error:`, error);
        };
    }



    initLiveOddsWebSocket(`${currentSport}`);



    function updateLiveOddsOnPage(matchPayload) {
        const matchId = matchPayload.match_id;
        const matchEl = document.querySelector(`[data-match-id="${matchId}"]`);
        const FINISHED_STATUSES = ["FT","AET", "PEN", "CANC", "PST"]

        if (!matchEl) return;

        // If match is finished remove it in DOM
        if (FINISHED_STATUSES.includes(matchPayload.status["short"])){
            matchEl.remove();
            return;
        }

        // --- Update scores ---
        const homeScoreEl = matchEl.querySelector("[data-home-score]");
        const awayScoreEl = matchEl.querySelector("[data-away-score]");
        if (homeScoreEl) homeScoreEl.textContent = matchPayload.extras?.goals?.home ?? "";
        if (awayScoreEl) awayScoreEl.textContent = matchPayload.extras?.goals?.away ?? "";

        // --- Update time/status ---
        const timeEl = matchEl.querySelector("[data-match-time]");
        const dateEl = matchEl.querySelector("[data-match-date]");
    
        if (timeEl && dateEl) {
            if (matchPayload.status?.elapsed) {
                dateEl.textContent = `Live ${matchPayload.status.short}`;
                timeEl.textContent = matchPayload.status.elapsed;
            } 
        }

        // --- Update odds ---
        const newOdds = matchPayload.odds;
        if (!newOdds) return;

        Object.keys(newOdds).forEach(marketType => {
            const containers = matchEl.querySelectorAll(`[data-market-type="${marketType}"]`);
            containers.forEach(container => {
                container.querySelectorAll(".odds-btn").forEach(btn => {
                    const prediction = btn.dataset.prediction;
                    const oddsInfo = newOdds[marketType]?.[prediction];
                    if (!oddsInfo) return;

                    // Support both formats (nested .odds-value or plain text)
                    const oddsValueEl = btn.querySelector(".odds-value");
                    const displayTarget = oddsValueEl || btn;

                    if (oddsInfo.suspended) {
                        displayTarget.textContent = "-";
                        btn.disabled = true;
                        btn.classList.add("text-muted");
                    } else {
                        displayTarget.textContent = oddsInfo.odd;
                        btn.disabled = false;
                        btn.classList.remove("text-muted");
                    }
                });
            });
        });
    }


      async function fetchLiveGamesBySport(sport, page = 1) {
            const oddsDescription = livePage.querySelector('#odds-description');
            const sportsRaw = livePage.querySelector('#sports-row');
    
            gamesDisplayLive.appendChild(spinner);
    
            let cacheBuster = Date.now();  // or use Math.random()
            let url = `/fetch-live-games/?sport=${sport}&page=${page}&_=${cacheBuster}`;

            let functionName = `${sport}MatchElementInnerHTML`;
            let dropDownName = `${sport}OddsDropdowns`;  
            let oddsDescName = `${sport}OddsDescription`;  
            
            try {
                let response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                let Data = await response.json();
    
                data = Data.games;
                
                // Update games display live
                if(gamesDisplayLive){
                    if (data && data.length > 0) {
                        Array.from(gamesDisplayLive.children).forEach(child=>{
                            if(child != oddsDescription && child != sportsRaw){
                                child.remove();
                            }
                        })
    
                        // display OddsDiscription for the current sport
                        if(typeof window[oddsDescName] === "function"){
                            window[oddsDescName](oddsDescription);
                        }
                        else{
                            oddsDescription.innerHTML = '';
                        }
    
                        filterGames();
    
                        data.forEach(game => { 
                            if(typeof window[functionName] === "function"){
                                window[functionName](game, `${sport}`, gamesDisplayLive);
                            }
                            else{
                                console.log(`${functionName} does not exist`);
                            }
                        });
                        
                        if(typeof window[dropDownName] === "function"){
                            window[dropDownName](data, [gamesDisplayLive]);
                        }
    
                    }
                    else {
                        Array.from(gamesDisplayLive.children).forEach(child =>{
                            if(child != oddsDescription && child != sportsRaw){
                                child.remove();
                            }
                        });
                        oddsDescription.innerHTML = '';
                        const message = document.createElement('div');
                        message.innerHTML = `<p class="text-center text-aqua py-5">No live ${sport} games found.</p>`;
                        gamesDisplayLive.appendChild(message);
                    }  
                }   
            }
            catch (error) {
                console.error("Error fetching games:", error);
            }
        }


    function filterGames(data){
        const filterGamesBy = document.getElementById('filter-games-by');

        if(filterGamesBy){
            functionName = `${currentSport}MatchElementInnerHTML`;
            dropDownName = `${currentSport}OddsDropdowns`;  
            oddsDescName = `${currentSport}OddsDescription`;  
        
            filterGamesBy.addEventListener('change', function(event){
                const selectedValue = event.target.value;

                switch(selectedValue){
                    case 'Upcoming':
                        function isUpcoming(element){
                            return element.status.short === 'NS';
                        }

                        const UpcomingMatches = data.filter(isUpcoming);
                        
                        if(UpcomingMatches.length > 0 ){
                            Array.from(gamesDisplaySports.children).forEach(child=>{
                                if(child != oddsDescription){
                                    child.remove();
                                }
                            })

                            UpcomingMatches.forEach(match => {
                                if(typeof window[functionName] === "function"){
                                    window[functionName](match, currentSport, gamesDisplaySports);
                                }
                                else{
                                    console.log(`${functionName} does not exist`);
                                }
                            }); 

                            if(typeof window[dropDownName] === "function"){
                                window[dropDownName](data);
                            }
                            else{
                                console.log(`${dropDownName} does not exist`);
                            }
                        } 
                        else{
                            
                            Array.from(gamesDisplaySports.children).forEach(child=>{
                                if(child != oddsDescription){
                                    child.remove();
                                }
                            })

                            const message = document.createElement('div')
                            message.innerHTML =  `<div class="text-center py-5 text-aqua"><p>No upcoming games found.</p></div>`;
                            gamesDisplaySports.appendChild(message);
                        }

                        break;

                    case 'Leagues':
                        showLeaguesResponsive();
                        break;

                    case 'Next-hour':
                        function NextHour(element) {
                            const gameTime = new Date(element.datetime); // properly parse ISO string
                            const diffMinutes = (gameTime - now) / (1000 * 60); // convert ms → minutes
                            return diffMinutes > 0 && diffMinutes <= 60;
                        }

                        const nextHour = data.filter(NextHour);
                        
                        if(nextHour.length > 0 ){
                            Array.from(gamesDisplaySports.children).forEach(child=>{
                                if(child != oddsDescription){
                                    child.remove();
                                }
                            })

                            nextHour.forEach(match => {
                                if(typeof window[functionName] === "function"){
                                    window[functionName](match, currentSport, gamesDisplaySports);
                                }
                                else{
                                    console.log(`${functionName} does not exist`);
                                }
                            }); 

                            if(typeof window[dropDownName] === "function"){
                                window[dropDownName](data, allEventsContainer);
                            }
                            else{
                                console.log(`${dropDownName} does not exist`);
                            }
                        } 
                        else{
                            
                            Array.from(gamesDisplaySports.children).forEach(child=>{
                                if(child != oddsDescription){
                                    child.remove();
                                }
                            })

                            const message = document.createElement('div')
                            message.innerHTML =  `<div class="text-center py-5 text-aqua"><p>No ${currentSport} games in the next hour.</p></div>`;
                            gamesDisplaySports.appendChild(message);
                        }
                        break;

                    case 'Next-3-hours':
                        function Next3Hours(element) {
                            const gameTime = new Date(element.datetime);
                            const diffMinutes = (gameTime - now) / (1000 * 60);
                            return diffMinutes > 0 && diffMinutes <= 180; // 180 minutes = 3 hours
                        }

                        const next3Hours = data.filter(Next3Hours);
                        
                        if(next3Hours.length > 0 ){
                            Array.from(gamesDisplaySports.children).forEach(child=>{
                                if(child != oddsDescription){
                                    child.remove();
                                }
                            })

                            next3Hours.forEach(match => {
                                if(typeof window[functionName] === "function"){
                                    window[functionName](match, currentSport, gamesDisplaySports);
                                }
                                else{
                                    console.log(`${functionName} does not exist`);
                                }
                            }); 

                            if(typeof window[dropDownName] === "function"){
                                window[dropDownName](data, allEventsContainer);
                            }
                            else{
                                console.log(`${dropDownName} does not exist`);
                            }

                        } 
                        else{
                            
                            Array.from(gamesDisplaySports.children).forEach(child=>{
                                if(child != oddsDescription){
                                    child.remove();
                                }
                            })

                            const message = document.createElement('div')
                            message.innerHTML =  `<div class="text-center py-5 text-aqua"><p>No ${currentSport} games in the next 3 hours.</p></div>`;
                            gamesDisplaySports.appendChild(message);
                        }
                        break;

                    case 'Next-5-hours':
                        function Next5Hours(element) {
                            const now = new Date();
                            const gameTime = new Date(element.datetime);

                            const diffMinutes = (gameTime - now) / (1000 * 60);
                            return diffMinutes > 0 && diffMinutes <= 300; // 300 minutes = 5 hours
                        }

                        const next5Hours = data.filter(Next5Hours);
                        
                        if(next5Hours.length > 0 ){
                            Array.from(gamesDisplaySports.children).forEach(child=>{
                                if(child != oddsDescription){
                                    child.remove();
                                }
                            })

                            next5Hours.forEach(match => {
                                if(typeof window[functionName] === "function"){
                                    window[functionName](match, currentSport, gamesDisplaySports);
                                }
                                else{
                                    console.log(`${functionName} does not exist`);
                                }
                            }); 

                            if(typeof window[dropDownName] === "function"){
                                window[dropDownName](data);
                            }
                            else{
                                console.log(`${dropDownName} does not exist`);
                            }

                        } 
                        else{
                            
                            Array.from(gamesDisplaySports.children).forEach(child=>{
                                if(child != oddsDescription){
                                    child.remove();
                                }
                            })

                            const message = document.createElement('div')
                            message.innerHTML =  `<div class="text-center py-5 text-aqua"><p>No ${currentSport} games in the next 5 hours.</p></div>`;
                            gamesDisplaySports.appendChild(message);
                        }
                        break;

                    case 'Today':
                        function Today(element) {
                            const now = new Date();
                            const gameTime = new Date(element.datetime);

                            return gameTime.toDateString() === now.toDateString();
                        }

                        const today = data.filter(Today);
                        
                        if(today.length > 0 ){
                            Array.from(gamesDisplaySports.children).forEach(child=>{
                                if(child != oddsDescription){
                                    child.remove();
                                }
                            })
                            
                            today.forEach(match => {
                                if(typeof window[functionName] === "function"){
                                    window[functionName](match, currentSport, gamesDisplaySports);
                                }
                                else{
                                    console.log(`${functionName} does not exist`);
                                }
                            }); 

                            if(typeof window[dropDownName] === "function"){
                                window[dropDownName](data, allEventsContainer);
                            }
                            else{
                                console.log(`${dropDownName} does not exist`);
                            }

                        } 
                        else{
                            
                            Array.from(gamesDisplaySports.children).forEach(child=>{
                                if(child != oddsDescription){
                                    child.remove();
                                }
                            })

                            const message = document.createElement('div')
                            message.innerHTML =  `<div class="text-center py-5 text-aqua"><p>No ${currentSport} games for today.</p></div>`;
                            gamesDisplaySports.appendChild(message);
                        }
                        break;

                    case 'Tomorrow':
                        function Tomorrow(element) {
                            const now = new Date();
                            const tomorrow = new Date();
                            tomorrow.setDate(now.getDate() + 1);

                            const gameTime = new Date(element.datetime);

                            return gameTime.toDateString() === tomorrow.toDateString();
                        }

                        const tomorrow = data.filter(Tomorrow);
                        
                        if(tomorrow.length > 0 ){
                            Array.from(gamesDisplaySports.children).forEach(child=>{
                                if(child != oddsDescription){
                                    child.remove();
                                }
                            })

                            tomorrow.forEach(match => {                                                           
                                if(typeof window[functionName] === "function"){
                                    window[functionName](match, currentSport, gamesDisplaySports);
                                }
                                else{
                                    console.log(`${functionName} does not exist`);
                                }
                            }); 

                            if(typeof window[dropDownName] === "function"){
                                window[dropDownName](data, gamesDisplaySports);
                            }
                            else{
                                console.log(`${dropDownName} does not exist`);
                            }
                        } 
                        else{
                            Array.from(gamesDisplaySports.children).forEach(child=>{
                                if(child != oddsDescription){
                                    child.remove();
                                }
                            })

                            const message = document.createElement('div')
                            message.innerHTML =  `<div class="text-center py-5 text-aqua"><p>No ${currentSport} games found for tomorrow.</p></div>`;
                            gamesDisplaySports.appendChild(message);
                        }
                        break;
                }
            });
        }
    }


    async function fetchGamesByLeagues(leagueIds) {
        try {
            // Fetch games data
            const url = `/api/fetch-leagues/?league_ids=${leagueIds}&sport=${currentSport.toLowerCase()}`;
            const response = await fetch(url);
            
            if (!response.ok) throw new Error('Network response was not ok');
            
            // const { data: games = [] } = await response.json();
            const { games = [] } = await response.json();

            // Handle empty results
            if (!games.length) {
                window.alert('No games found for selected leagues');
                return;

            }else{
                Array.from(gamesDisplaySports.children).forEach(child =>{
                    if(child != oddsDescription){
                        child.remove();
                    }
                })

                // Group games by league and create accordions
                const leaguesMap = new Map();

                games.forEach(game => {

                    if (!leaguesMap.has(game.league_id)) {
                        leaguesMap.set(game.league_id, {
                            country: game.country,
                            league: game.league,
                            matches: []
                        });
                    }

                    leaguesMap.get(game.league_id).matches.push(game);
                });

                // Process each league
                let containers = [];
                
                leaguesMap.forEach((leagueData, leagueId) => {
                    const { country, league, matches } = leagueData;
                    
                    // Create accordion container
                    const accordionId = `league-${leagueId}-accordion`;
                    const accordionItem = document.createElement('div');
                    accordionItem.style.border = 'none';
                    accordionItem.className = 'accordion-item league-accordion mt-2';
                    accordionItem.innerHTML = `
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" 
                                    data-bs-toggle="collapse" 
                                    data-bs-target="#${accordionId}" 
                                    aria-expanded="false" 
                                    aria-controls="${accordionId}">
                                <span class="country-flag me-2">${country}</span>
                                <span class="league-name">${league.name}</span>
                                <span class="badge bg-primary ms-2">${matches.length}</span>
                            </button>
                        </h2>
                        <div id="${accordionId}" class="accordion-collapse collapse" 
                            data-bs-parent="#leagues-accordion">
                            <div class="all-events-container accordion-body bg-navy-blue p-2">
                                <div class="odds-description d-flex"></div>
                                <div class="games-dipslay row g-0"></div>
                            </div>
                        </div>`;
                    
                    // Create full accordion wrapper if first item
                    if (!document.querySelector('#leagues-accordion')) {
                        const accordionWrapper = document.createElement('div');
                        accordionWrapper.className = 'accordion';
                        accordionWrapper.id = 'leagues-accordion';
                        accordionWrapper.appendChild(accordionItem);
                        gamesDisplaySports.appendChild(accordionWrapper);
                    } else {
                        document.querySelector('#leagues-accordion').appendChild(accordionItem);
                    }

                    // Add odds description
                    oddsDescription.innerHTML = '';
                    const leagueOddsDescription = accordionItem.querySelector('.odds-description');
                    let oddsDescName = `${currentSport}OddsDescription`;       


                    if(typeof window[oddsDescName] === "function"){
                        leagueOddsDescription.classList.add('pt-1')
                        window[oddsDescName](leagueOddsDescription);
                        document.querySelectorAll('.filter-games-by-parent').forEach(parentEl => {
                            parentEl.style.visibility = 'hidden';
                        })
                    }            

                    // Add matches
                    const matchesContainer = accordionItem.querySelector('.games-dipslay');
                    containers.push(accordionItem.querySelector('.accordion-body'));

                    matches.forEach(match => {
                        const functionName = `${currentSport}MatchElementInnerHTML`;
                        if(typeof window[functionName] === 'function'){
                            window[functionName](match, currentSport, matchesContainer);
                        }

                    });
                });

                let dropDownName = `${currentSport}OddsDropdowns`;  
                if(typeof window[dropDownName] === "function"){
                    window[dropDownName](data, containers);
                }
                else{
                    window.alert(`Error : ${dropDownName} is not a function, contact support team.`);
                }
            }
        }
        catch (error) {
            console.error('Error fetching games:', error);
            gamesDisplaySports.innerHTML = `
                <div class="alert alert-danger">
                    Failed to load games. Please try again later.
                </div>`;
        }
    }


    async function fetchMoreOdds() {
        const urlParams = new URLSearchParams(window.location.search);
        const sport = urlParams.get("sport");
        const matchId = urlParams.get("match_id");

        if(gamesDisplayMoreOdds){
            if (!sport || !matchId) {
                gamesDisplayMoreOdds.innerHTML = "<p>Error: Missing match details.</p>";
                return;
            }

            try {
                let response = await fetch(`/api/fetch-more-odds/?sport=${sport}&match_id=${matchId}`);
                let data = await response.json();


                if(data){
                    let pageFunctionHtml = `${sport}MoreOddsInnerHTML`;
                    if(typeof window[pageFunctionHtml] === "function"){
                        window[pageFunctionHtml](data);
                    }
                    else{
                        console.log(`${pageFunctionHtml} does not exist`);
                    }
                }
            } catch (error) {
                console.error("Error fetching more odds:", error);
            }
        }
    }



    function showLeaguesResponsive() {
        const isSmallScreen = window.innerWidth < 992; // Bootstrap lg breakpoint
        const containerId = 'countries-leagues-cont';

        // Remove existing container if exists
        const existing = document.getElementById(containerId);
        if (existing) existing.remove();

        const container = document.createElement('div');
        container.id = containerId;
        container.style.maxHeight = '80vh';
        container.style.overflowY = 'auto';
        container.classList.add('py-1', 'border-aqua', 'text-center');

        if (Countries) {
            const CountriesGamesList = document.createElement('ul');
            CountriesGamesList.className = 'list-unstyled my-accordion';

            for (const countryKey in Countries) {
                const country = Countries[countryKey]; 
                const {leagues, name, total_games, flag} = country

                const countryElement = document.createElement('li');
                countryElement.className = 'sport-league mb-1 text-truncate';
                countryElement.innerHTML = `
                    <div class="accordion accordion-flush" id="accordionExample">
                        <div class="accordion-item custom-accordion">
                            <h2 class="accordion-header">
                                <button class="accordion-button text-small" type="button" 
                                        data-bs-toggle="collapse" 
                                        data-bs-target="#${name}-leagues-list" 
                                        aria-expanded="true" 
                                        aria-controls="${name}-leagues-list">
                                    <div class="col-9 text-truncate">
                                        <span class="me-1">
                                            <img src="${flag}" class="logo" alt="${name} flag" />
                                        </span>${name}
                                    </div>
                                    <div class="col-2 text-end">${total_games}</div>
                                </button>
                            </h2>
                            <ul id="${name}-leagues-list" 
                                class="accordion-collapse collapse list-unstyled" 
                                data-bs-parent="#accordionExample">
                            </ul>
                        </div>
                        <hr class="my-0">
                    </div>`; 

                const countryLeaguesList = countryElement.querySelector('ul');

                leagues.forEach(league => {       
                    const { id, name: league_name, game_count } = league;
                    const leagueElement = document.createElement('li');
                    leagueElement.className = 'sub-league row gx-0 align-items-center mb-1';
                    leagueElement.innerHTML = `
                        <div class="col-10">
                            <div class="form-check">
                                <input data-league="${league_name}" data-country="${league_name}" 
                                        class="form-check-input ms-1" 
                                        type="checkbox" id="league-${id}">
                                <label class="form-check-label" for="league-${id}">${league_name}</label>
                            </div>
                        </div>
                        <div class="col-2 text-end text-small">${game_count}</div>
                    `;
                    countryLeaguesList.appendChild(leagueElement);
                });

                CountriesGamesList.appendChild(countryElement);
            }
            const heading = document.createElement('div');
            heading.HTML = ` <div class="text-yellow text-center">Select leagues</div>`;
            container.appendChild(heading);
            const cont = document.createElement('div');
            cont.className = ('boarder-aqua px-0');
            cont.appendChild(CountriesGamesList);
            container.appendChild(cont);
        }


        if (isSmallScreen) {
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.tabIndex = -1;
            modal.id = containerId + "-modal"; // unique ID

            const modalDialog = document.createElement('div');
            modalDialog.className = 'modal-dialog modal-dialog-scrollable'; // scrollable for leagues

            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';

            // header
            const modalHeader = document.createElement('div');
            modalHeader.className = 'modal-header';
            modalHeader.innerHTML = `
                <h5 class="modal-title">Select Leagues</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            `;
            modalContent.appendChild(modalHeader);

            // body
            const modalBody = document.createElement('div');
            modalBody.className = 'modal-body';
            modalBody.appendChild(container); // put your leagues list in body
            modalContent.appendChild(modalBody);

            // footer
            const modalFooter = document.createElement('div');
            modalFooter.className = 'modal-footer';
            const applyBtn = document.createElement('button');
            applyBtn.className = 'btn btn-yellow text-black py-1';
            applyBtn.textContent = 'Apply';
            applyBtn.addEventListener('click', () => {
                const leagueIds = [];
                modalBody.querySelectorAll('.form-check-input:checked').forEach(checkbox => {
                    leagueIds.push(Number(checkbox.id.split('-')[1]));
                });
                fetchGamesByLeagues(leagueIds);
                bsModal.hide(); // close modal
            });
            modalFooter.appendChild(applyBtn);
            modalContent.appendChild(modalFooter);

            // assemble
            modalDialog.appendChild(modalContent);
            modal.appendChild(modalDialog);
            document.body.appendChild(modal);

            const bsModal = new bootstrap.Modal(modal, { backdrop: true, keyboard: true });

            // 🔑 Fix: prevent focus staying inside hidden modal
            modal.addEventListener("hidden.bs.modal", () => {
                if (modal.contains(document.activeElement)) {
                    document.activeElement.blur(); 
                    // Or move focus to a safe element:
                    // document.querySelector("#someSafeElement")?.focus();
                }
            });

            // show modal
            bsModal.show();
        }
         else {
            // For large screens, append to a sidebar div
            const sidebar = document.getElementById('countries-listed-per-sport');
            if (sidebar) {
                sidebar.innerHTML = ''; // clear previous
                // Apply button
                const applyBtn = document.createElement('button');
                applyBtn.className = 'btn btn-yellow my-1 mx-auto text-black py-1';
                applyBtn.textContent = 'Apply';
                applyBtn.addEventListener('click', () => {
                    const leagueIds = [];
                    container.querySelectorAll('.form-check-input:checked').forEach(checkbox => {
                        leagueIds.push(Number(checkbox.id.split('-')[1]));
                    });
                    fetchGamesByLeagues(leagueIds);
                });
                container.appendChild(applyBtn);
                sidebar.appendChild(container);
            }
            
        }
    }


    // Functions that must be globally defined 
    async function fetchGamesBySport(sport, page = 1) {
        // using gamesdisplay from sports page
        gamesDisplaySports.appendChild(spinner);

        let url = `/api/fetch-games/?sport=${sport}&page=${page}`;

        let functionName = `${sport}MatchElementInnerHTML`;
        let dropDownName = `${sport}OddsDropdowns`;  
        let oddsDescName = `${sport}OddsDescription`;  
        
        try {
            let response = await fetch(url); // url
            let combinedData = await response.json();

            // Extract games, topLeagues, highlights
            data = combinedData.games || [];
            let topLeagues = combinedData.top_leagues || [];
            Countries = combinedData.countries || {}; 
            // let highlightGames = combinedData.highlight_games || [];
            let totalMatches = combinedData.total_matches || 0;

            // --- Highlight Games ---
            // const highlightGamesContainer = document.getElementById('highlist-games-container');
            // if (highlightGamesContainer) {
            //     if (highlightGames.length === 0) {
            //         highlightGamesContainer.innerHTML = '';
            //     } else {
            //         highlightGamesContainer.innerHTML = `
            //             <hr class="text-yellow mb-0">
            //             <ul id="highlist-games-list"></ul>`;
            //         const highlightGamesList = document.getElementById('highlist-games-list');

            //         highlightGames.forEach(game => {
            //             const {match_id, country, league, extras} = game;

            //             const highlightGame = document.createElement('li');
            //             highlightGame.className = 'highlist-game col-12 text-truncate';

            //             const matchlink = document.createElement('a');
            //             matchlink.href = `/more-odds/?sport=${sport}&match_id=${match_id}`;
            //             matchlink.className = `match-link text-decoration-none text-white`;
            //             matchlink.innerHTML = `
            //                 <div class="text-small text-truncate" style="margin-bottom: -5px;">
            //                     ${country}&nbsp;${league.name}
            //                 </div>
            //                 <div class="text-truncate">
            //                     ${extras.teams?.home?.name} <span class="text-yellow">vs</span> ${extras.teams?.away?.name}
            //                 </div>
            //                 <hr class="my-1 text-yellow">`;

            //             highlightGame.appendChild(matchlink);
            //             highlightGamesList.appendChild(highlightGame);
            //         });
            //     }
            // }

            // --- Top Leagues (accordion) ---
            
            if(!(window.innerWidth < 992)){
                showLeaguesResponsive();
            }

            const topLeaguesContainer = document.getElementById('top-leagues-accordion-container');
            if(topLeaguesContainer){
                topLeaguesContainer.innerHTML = `
                    <div class="accordion accordion-flush border-black bg-dark mb-1" id="accordionExample">
                        <div class="accordion-item">
                            <h2 class="accordion-header">
                                <button class="accordion-button fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#leaguesContent" aria-expanded="true" aria-controls="leaguesContent">
                                    Top ${sport} leagues
                                </button>
                            </h2>
                            <div id="leaguesContent" class="accordion-collapse collapse show" data-bs-parent="#accordionExample">
                                <div class="accordion-body p-1">
                                    <div id="top-leagues-accordion-body" class="row flex-nowrap gx-0 overflow-auto hide-scrollbar mb-lg-0 top-leagues-accordion-body"></div>
                                </div>
                            </div>
                        </div>
                    </div>`;
            }

            const topLeaguesAccordionBody = document.getElementById('top-leagues-accordion-body');
            if (topLeagues.length === 0 && topLeaguesAccordionBody) {
                topLeaguesAccordionBody.innerHTML = `<div class="text-center my-1">No top leagues for ${sport}.</div>`;
            } else if (topLeagues.length > 0 && topLeaguesAccordionBody) {
                topLeagues.forEach(topLig => {
                    const {id, name, country, flag} = topLig
                    const topLigItem = document.createElement('a');
                    topLigItem.className = 'col-4 col-sm-3 text-decoration-none top-league-item m-1';
                    topLigItem.innerHTML = `
                        <div class="card" data-league-id="${id}" data-country="${country}" data-league="${name}">
                            <div class="card-body row g-0 d-flex justify-content-between align-items-center px-2 py-0">
                                <div class="col-11">
                                    <div class="card-titte text-truncate text-small fw-bold" style="margin-bottom: -5px;">${name}</div>
                                    <div class="card-text text-truncate text-small"><img src="${flag}" class="logo" alt="flag" /> ${country}</div>
                                </div>
                                <div class="col-1 h3 text-center"><strong><code>&gt;</code></strong></div>
                            </div>
                        </div>`;
                    topLeaguesAccordionBody.appendChild(topLigItem);
                });

                const topLeagueItems = document.querySelectorAll('.top-leagues-accordion-body .top-league-item');
                topLeagueItems.forEach(item =>{
                    item.addEventListener('click', function(){
                        let leagueId = Number(item.querySelector('[data-league-id]').getAttribute('data-league-id'));
                        fetchGamesByLeagues([leagueId]);
                    })
                });
            }

            // --- Display Games ---
            if(gamesDisplaySports){
                if (data.length > 0) {
                    if(page === 1){
                        Array.from(gamesDisplaySports.children).forEach(child=>{
                            if(child != oddsDescription){
                                child.remove();
                            }
                        })
                    }

                    if(typeof window[oddsDescName] === "function"){
                        window[oddsDescName](oddsDescription);
                    } else {
                        oddsDescription.innerHTML = '';
                    }

                    filterGames(data)

                    data.forEach(game => { 
                        if(typeof window[functionName] === "function"){
                            window[functionName](game, `${sport}`, gamesDisplaySports);
                        }
                    });

                    if(typeof window[dropDownName] === "function"){
                        window[dropDownName](data, [gamesDisplaySports]);
                    }

                    // --- Add Load More button if there are more matches ---
                    const loadedGamesCount = page * 100;
                    if(totalMatches > loadedGamesCount){
                        let loadMoreBtn = document.getElementById(`${sport}-load-more`);
                        if(!loadMoreBtn){
                            loadMoreBtn = document.createElement('button');
                            loadMoreBtn.id = `${sport}-load-more`;
                            loadMoreBtn.className = 'btn btn-yellow my-2';
                            loadMoreBtn.innerText = 'Load More';
                            gamesDisplaySports.appendChild(loadMoreBtn);
                        }

                        loadMoreBtn.onclick = function(){
                            loadMoreBtn.remove();
                            fetchGamesBySport(sport, page + 1);
                        }
                    }

                } else {
                    Array.from(gamesDisplaySports.children).forEach(child =>{
                        if(child != oddsDescription){
                            child.remove();
                        }
                    });
                    oddsDescription.innerHTML = '';
                    const message = document.createElement('div');
                    message.innerHTML = `<p class="text-center text-aqua py-5">No matches found for ${sport}.</p>`;
                    gamesDisplaySports.appendChild(message);

                    // remove after 10 seconds
                    setTimeout(() => {
                    if (message.parentNode) {
                        message.remove();
                    }
                    }, 10000);
                }  
            }   
            

        } catch (error) {
            console.error("Error fetching games:", error);
        } finally {
            if(spinner.parentNode) spinner.parentNode.removeChild(spinner);
        }
    }


    if(window.location.pathname.includes('/sports/')){
        fetchGamesBySport(currentSport);
    }


    if(window.location.pathname.includes('/more-odds/')){
        // Run the function when the page loads
        fetchMoreOdds();
    }


    if(window.location.pathname.includes('/mybets/')){              

        const statusFilter = document.getElementById('status-filter');
        const ticketTypeFilter = document.getElementById('tickets-type-filter');
        const ticketStatusFilter = document.getElementById('ticket-status-filter');
        const datePicker = document.getElementById('date-picker');
        const ticketsDisplay = document.getElementById('tickets-display');
        let status_fil = 'Pending';
        const dateRangeLabel = document.getElementById('dateRangeLabel');

        statusFilter.addEventListener('click', function(event){
            activeBtn = event.target;
            if(activeBtn.id == 'Pending'){
                status_fil = 'Pending';
                ticketStatusFilter.innerHTML = '';
                ticketStatusFilter.innerHTML = `<option value="Pending" selected>Pending</option>`;
            }else if(activeBtn.id == 'Settled'){
                status_fil = 'Settled';
                ticketStatusFilter.innerHTML = '';
                ticketStatusFilter.innerHTML = `
                            <option value="All" selected>All</option>
                            <option value="Won">Won</option>
                            <option value="Lost">Lost</option>
                            <option value="Refund">Refund</option>
                            <option value="Canceled">Canceled</option>
                    `;
            }
            statusFilter.querySelector('.status-filter-active').classList.remove('status-filter-active');
            statusFilter.querySelector(`#${status_fil}`).classList.add('status-filter-active');
            fetchAndDisplayTickets();
        })

        
        // spinner.style.display = 'none';
        ticketsDisplay.appendChild(spinner);

        let dateFrom = '';
        let dateTo = '';

        // Listen for changes
        const filters = [ticketTypeFilter, ticketStatusFilter, datePicker];
        filters.forEach(filter => {
            if (filter) {
                filter.addEventListener('change', () => {
                    fetchAndDisplayTickets();
                });
            }
        });

        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);

        flatpickr(datePicker, {
            mode: 'range',
            dateFormat: "Y-m-d",
            minDate: sixMonthsAgo,
            maxDate: today,
            onClose: function(selectedDates){
                if(selectedDates.length === 2){
                    dateFrom = selectedDates[0].toISOString().slice(0, 10);
                    dateTo = selectedDates[1].toISOString().slice(0, 10);
                    // document.getElementById('dateRangeLabel').textContent = `${dateFrom}  to ${dateTo}`;
                    fetchAndDisplayTickets();
                }
            }
        });

        fetchAndDisplayTickets();

        async function fetchAndDisplayTickets(){ 
            ticketsDisplay.innerHTML = '';
            ticketsDisplay.appendChild(spinner);
            const ticket_tp_fil = ticketTypeFilter.value;
            const ticket_sts_fil = ticketStatusFilter.value; 
            
            const url = `/fetch-tickets/?${status_fil ? 'status_fil=' + encodeURIComponent(status_fil): ''}&ticket_tp_fil=${encodeURIComponent(ticket_tp_fil)}&ticket_sts_fil=${encodeURIComponent(ticket_sts_fil)}&date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`;
            try {
                let response = await fetch(url);
                const ticketsData = await response.json();
                const tickets = ticketsData.tickets;


                if(tickets.length > 0 && document.getElementById('tickets-display')){
                    ticketsDisplay.innerHTML = '';
                    tickets.forEach(ticket =>{
                        const {id, status, win_boost, created_at, total_odds, stake, potential_win} = ticket;

                        const selections = ticket.selections;
                    
                        let dateObj = new Date(created_at);
                        let date = dateObj.toLocaleDateString("en-GB");
                        let time = dateObj.toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit"});

                        const tktElement = document.createElement('div');
                        tktElement.innerHTML = `<div class="row g-0 border-aqua  mt-2 rounded-4">
                                                    <div class="col-9 p-2">
                                                        <div class="row g-0 text-small text-yellow">
                                                            <div class="col-4 text-center text-truncate">Id : ${id}</div>
                                                            <div class="col-4 text-center text-truncate">${time} | ${date}</div>
                                                            <div class="col-4 text-center text-truncate">${selections.length} Selections</div>
                                                        </div>
                                                        <div class="TicketId-${id} d-none ticket-selections-container">
                                                            ${selections.map(selection => `
                                                            <hr class="m-1">
                                                            <div class="selection-content bg-aqua text-black p-2" style="border-top-left-radius: 0.7rem; border-bottom-left-radius: 0.7rem;">
                                                                <div class="row g-0">
                                                                    <div class="text-truncate mb-5px">${selection.country} - ${selection.league}</div>
                                                                    <div class="text-truncate mb-5px">${selection.home_team} - ${selection.away_team}</div>
                                                                    <div class="col-9 fw-bold text-truncate mb-5px">${selection.market_type} - ${selection.prediction}</div><div class="col-3 text-truncate text-end mb-5px">${selection.results ? `<span>${selection.results["home_score"]}-${selection.results["away_score"]} </span>` : ''}</div> 
                                                                    <div class="text-small">${new Date(selection.date_time).toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit"})}&nbsp;&nbsp;${new Date(selection.date_time).toLocaleDateString("en-GB")}</div>
                                                                </div>
                                                            </div>`).join("")}
                                                        </div>
                                                        <hr class="m-1">
                                                        <div class="row g-0">
                                                            <div class="col-4 text-center">
                                                                <div style="margin-bottom: -5px; font-style: italic;">Stake</div>
                                                                <div class="text-small">${currencySymbol}&nbsp;${stake}</div>
                                                            </div>
                                                            <div class="col-4 text-center">
                                                                <div style="margin-bottom: -5px; font-style: italic;">Total Odds</div>
                                                                <div class="text-small">${total_odds}</div>
                                                            </div>
                                                            <div class="col-4 text-center">
                                                                <div style="margin-bottom: -5px; font-style: italic;">Win boost</div>
                                                                <div class="text-small">${currencySymbol}&nbsp;${win_boost}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-3 p-2 text-center" style="border-left: 1px solid aqua;">
                                                        <div class="row g-0 text-small text-yellow" onclick="toggleDisplayNone('TicketId-${id}')">
                                                            <div class="text-center text-truncate">${selections.filter(s => s.status !== 'Pending').length}/${selections.length} settled</div>
                                                        </div>
                                                        <div class="TicketId-${id} d-none">
                                                            ${selections.map(selection => `
                                                            <hr class="m-1">
                                                            <div class="selection-content bg-aqua text-black p-2" style="border-top-right-radius: 0.7rem; border-bottom-right-radius: 0.7rem;">
                                                                <div class="row g-0">
                                                                    <div style="margin-bottom: -5px; visibility: hidden;">Status:</div>
                                                                    <div class="${selection.status}" style="margin-bottom: -5px; font-style: italic;">${selection.status}</div>
                                                                    <div class="fw-bold" style="margin-bottom: -5px;">${selection.match_odds}</div>
                                                                    <div class="text-small" style="visibility: hidden;">&nbsp;&nbsp;</div>
                                                                </div>
                                                            </div>`).join("")}
                                                        </div>
                                                        <hr class="m-1">
                                                        <div class="row g-0" onclick="toggleDisplayNone('TicketId-${id}')">
                                                            <div style="margin-bottom: -5px; font-style: italic;" class="${status}">${status}</div>
                                                            <div class="text-small">${currencySymbol}&nbsp;${potential_win}</div>
                                                        </div>
                                                    </div>
                                                    </div>`;
                                                
                        ticketsDisplay.appendChild(tktElement);
                        
                    })
                }else if(tickets.length == 0 && ticketsDisplay){
                    ticketsDisplay.innerHTML = `<p class="text-center my-5 p-5 text-aqua">No ${status_fil} ${ticket_tp_fil} tickets found</p>`;
                }
            
            }catch(error){
                console.log('Error fetching tickets data :', error);
            }
        }

    }


    window.toggleDisplayNone = function(container_id){
        selections_container = document.querySelectorAll(`.${container_id}`);
        // const id = `${container_id.split("-")[1]}`;
        // const icon = document.querySelector(`#chevron-${id}`);
        selections_container.forEach(cont =>{
            cont.classList.toggle('d-none');
            // flip chevron icon
            // if(icon){
            //     if(icon.classList.contains('fa-chevron-up')){
            //         icon.classList.remove('fa-chevron-up');
            //         icon.classList.add('fa-chevron-down');
            //     }else if(icon.classList.contains('fa-chevron-down')){
            //         icon.classList.remove('fa-chevron-down');
            //         icon.classList.add('fa-chevron-up');
            //     }
            // }
        })
    }
    


    window.footballOddsDescription = function(container){
        container.innerHTML = `   
                                        <div class="col-6 col-md-4 col-lg-3">
                                            <div class="text-center filter-games-by-parent">
                                                <select id="filter-games-by" class="filter-games-by form-select bg-sky-blue rounded-0 text-small">
                                                    <option class="prediction" value="Upcoming">Upcoming</option>
                                                    ${window.innerWidth < 992 ? '<option class="prediction" value="Leagues">Leagues</option>' : ''}
                                                    <option class="prediction" value="Next-hour">Next hour</option>
                                                    <option class="prediction" value="Next-3-hours">Next 3 hours</option>
                                                    <option class="prediction" value="Next-5-hours">Next 5 hours</option>
                                                    <option class="prediction" value="Today">Today</option>
                                                    <option class="prediction" value="Tomorrow">Tomorrow</option>
                                                </select>
                                            </div>
                                            <div class="text-center text-small text-yellow odds-desc-shortcuts">EVENT</div>
                                        </div>
                                        <div class="col-6 col-md-4 col-lg-3 parent">
                                            <div class="text-center">
                                                <select id="odds-desc-options-1" class="odds-desc-options-1 form-select bg-sky-blue rounded-0 text-small">
                                                    <option value="full-time-1X2">Full Time 1X2</option>
                                                    <option value="over/under-2.5">Over/Under 2.5</option>
                                                    <option value="btts">Both Teams To Score</option>
                                                    <option value="double-chance">Double chance</option>
                                                    <option value="highest-scoring-half">Highest Scoring Half</option>
                                                    <option value="first-half-1X2">First Half 1X2</option>
                                                </select>
                                            </div>
                                            <div id="odds-desc-shortcut1" class="text-small text-yellow d-flex justify-content-between px-3 odds-desc-shortcuts">
                                                <span>1</span>
                                                <span>X</span>
                                                <span class="me-3">2</span>
                                            </div>
                                        </div>
                                        <div class="d-none d-md-block col-4 col-lg-3 parent">
                                            <div class="text-small text-center">
                                                <select id="odds-desc-options-2" class="odds-desc-options-2 form-select bg-sky-blue rounded-0 text-small">
                                                    <option value="over/under-2.5">Over/Under 2.5</option>
                                                    <option value="over/under-1.5">Over/Under 1.5</option>
                                                    <option value="double-chance">Double chance</option>
                                                    <option value="highest-scoring-half">Highest Scoring Half</option>
                                                    <option value="btts">Both Teams To Score</option>
                                                    <option value="second-half-1X2">Second Half 1X2</option>
                                                </select>
                                            </div>
                                            <div id="odds-desc-shortcut2" class="text-small text-yellow d-flex justify-content-between px-3 odds-desc-shortcuts">
                                                <span class="ms-1 text-navy-blue">GOALS</span>
                                                <span>OVER</span>
                                                <span class="me-1">UNDER</span>
                                            </div>
                                        </div>
                                        <div class="d-none d-lg-block col-lg-3 parent">
                                            <div class="text-small text-center">
                                                <select id="odds-desc-options-3"" class="odds-desc-options-3 form-select bg-sky-blue rounded-0 text-small">
                                                    <option value="double-chance" selected>Double chance</option>    
                                                    <option value="full-time-1X2">Full Time 1X2</option>
                                                    <option value="HT-over/under-1.5">HT Over/Under 1.5</option>
                                                    <option value="btts">Both Teams To Score</option>
                                                    <option value="first-half-1X2">First half 1X2</option>
                                                </select>
                                            </div>
                                            <div id="odds-desc-shortcut3" class="text-small text-yellow d-flex justify-content-between px-3 odds-desc-shortcuts">
                                                <span class="ms-3">1X</span>
                                                <span>12</span>
                                                <span class="me-3">X2</span>
                                            </div>
                                        </div> `;
    }



    window.footballMatchElementInnerHTML = function(game, sport, container){
        const { match_id, country , league, league_id, datetime, extras , odds, status} = game;

        // convert to local date and time
        let dateObj = new Date(datetime);

        let date = dateObj.toLocaleDateString("en-GB");
        let time = dateObj.toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit"});

        let marketsCount = Object.keys(odds).length;  // number of markets
        // --- Core Helpers ---
        // Safely get full info object for a market + selection
        function getOddInfo(market, selection) {
            if (
                odds[market] &&
                odds[market][selection]
            ) {
                return odds[market][selection]; // { odd, suspended, handicap }
            }
            return null;
        }

        // Display odd or fallback if suspended/missing
        function displayOdd(market, selection) {
            if (!odds || Object.keys(odds).length === 0) return "-"; // no odds at all
            const info = getOddInfo(market, selection);
            return info && !info.suspended ? info.odd : "-";
        }

        function isSuspended(market, selection) {
            if (!odds || Object.keys(odds).length === 0) return true; // treat no odds as suspended
            const info = getOddInfo(market, selection);
            return info ? info.suspended : true;
        }


        // Example calls:
        // console.log(displayOdd("1X2", "home"));   // 2.56
        // console.log(displayOdd("1X2", "draw"));   // "-" (suspended)
      
        const matchElement = document.createElement('a');
        matchElement.href = `/more-odds/?sport=${sport}&match_id=${match_id}`;
        matchElement.classList.add('text-decoration-none', 'match-link', 'text-whitesmoke', 'mb-2');
        matchElement.dataset.matchId = `${match_id}`;
        matchElement.innerHTML = `
            <div data-sport="${sport}" data-league-id="${league_id}" data-datetime="${datetime}" class="match-container bb-white pt-1 pb-1">
                <div class="row g-0">
                    <div class="col-12">
                        <div class="row g-0 d-flex">
                            <div class="col-6">
                                <div class="text-small">
                                    <span class="text-truncate"><img src="${league.flag}" class="logo" alt="logo"/></span>&nbsp;
                                    <span class="text-truncate" data-country="${country}">${country}</span>&nbsp; 
                                    <span class="text-truncate" data-league="${league.name}" data-league-id="${league.id}">${league.name}</span>
                                </div>
                                </div>
                                <div class="col-6 text-small">
                                    <div class="row g-0 text-end">
                                        <div class="col-12">
                                            <span class="text-yellow">+${marketsCount} markets</span>
                                        </div>
                                    </div> 
                                </div>
                            </div>
                            <div class="row g-0">
                                <div class="col-4 col-md-3 col-lg-2">
                                    <div data-home-team="${extras.teams?.home?.name}" class="text-truncate">${extras.teams?.home?.name}</div>
                                    <div data-away-team="${extras.teams?.away?.name}" class="text-truncate">${extras.teams?.away?.name}</div>
                                </div>
                                <div class="col-2 col-md-1 text-center text-aqua"> 
                                    <div data-home-score="${extras.goals?.home ?? ''}">${extras.goals?.home ?? ''}</div>
                                    <div data-away-score="${extras.goals?.away ?? ''}">${extras.goals?.away ?? ''}</div>
                                </div> 

                                <!-- Odds Container 1 -->
                                <div id="odds-desc-container1" data-market-type="Match Winner" class="col-6 col-md-4 col-lg-3 pe-1 py-2 odds-desc-container1 grid-odds">
                                    <button class="odds-btn" data-prediction="1" ${isSuspended('Match Winner','1') ? 'disabled' : ''}>${displayOdd('Match Winner', '1')}</button>
                                    <button class="odds-btn" data-prediction="X" ${isSuspended('Match Winner','X') ? 'disabled' : ''}>${displayOdd('Match Winner', 'X')}</button>
                                    <button class="odds-btn" data-prediction="2" ${isSuspended('Match Winner','2') ? 'disabled' : ''}>${displayOdd('Match Winner', '2')}</button>
                                </div>

                                <!-- Odds Container 2 -->
                                <div id="odds-desc-container2" data-market-type="Goals Over/Under" class="d-none d-md-flex col-md-4 col-lg-3 pe-1 py-2 odds-desc-container2 grid-odds">
                                    <button class="odds-btn line border-0" disabled>2.5</button>
                                    <button class="odds-btn" data-prediction="over 2.5" ${isSuspended('Goals Over/Under','over 2.5') ? 'disabled' : ''}>${displayOdd('Goals Over/Under', 'over 2.5')}</button>
                                    <button class="odds-btn" data-prediction="under 2.5" ${isSuspended('Goals Over/Under','under 2.5') ? 'disabled' : ''}>${displayOdd('Goals Over/Under', 'under 2.5')}</button>
                                </div>

                                <!-- Odds Container 3 -->
                                <div id="odds-desc-container3" data-market-type="Double Chance" class="d-none d-lg-flex col-lg-3 pe-1 py-2 odds-desc-container3 grid-odds">
                                    <button class="odds-btn" data-prediction="1X" ${isSuspended('Double Chance','1X') ? 'disabled' : ''}>${displayOdd('Double Chance', '1X')}</button>
                                    <button class="odds-btn" data-prediction="12" ${isSuspended('Double Chance','12') ? 'disabled' : ''}>${displayOdd('Double Chance', '12')}</button>
                                    <button class="odds-btn" data-prediction="X2" ${isSuspended('Double Chance','X2') ? 'disabled' : ''}>${displayOdd('Double Chance', 'X2')}</button>
                                </div>
                            </div>

                            <div style="margin-top: -5px;" class="row g-0 col-6 text-truncate">
                                <div data-match-id="${match_id}" class="text-small italic">
                                    <span data-match-date="${date}">${status.elapsed ?  `Live ${status.short}` : `${date}`}</span> 
                                    <span data-match-time="${time}" class="text-yellow">${status.elapsed ?? `${time}`}</span> 
                                    ${status.elapsed ? '' : `id : ${match_id}`}
                                </div>
                            </div>
                        </div>                        
                    </div>
                </div>`;


        if(container.classList.contains('text-center')){
            container.classList.remove('text-center')
        }
        container.appendChild(matchElement);
    };



    window.basketballMatchElementInnerHTML = function(game, sport){

    };



    window.footballMoreOddsInnerHTML = function(data){
        //Get match data    
        const { match_id, league_id, league, datetime, country, sport, extras , odds} = data;
        let container = gamesDisplayMoreOdds;
        const allMarkets = document.getElementById('all-markets');
        // Set data-mach-id dynamically so that websocet finds the match and update its info, should there be any changes
        container.classList.add('match-link');
        allMarkets.dataset.sport = `${sport}`;
        allMarkets.dataset.matchId = `${match_id}`;
        allMarkets.dataset.country = `${country}`;
        allMarkets.dataset.datetime = `${datetime}`;
        allMarkets.dataset.leagueId = `${league_id}`;
        allMarkets.dataset.league = `${league.name}`;
        allMarkets.dataset.homeTeam = `${extras.teams?.home?.name}`;
        allMarkets.dataset.awayTeam = `${extras.teams?.away?.name}`;
        

        /**
            * Check if a market (and optional prediction) exists in fixture_odds
            * 
            * @param {Object} odds - the fixture_odds object
            * @param {string} market - market type name (e.g., "1X2", "Asian Handicap")
            * @param {string|null} prediction - optional prediction key (e.g., "home", "draw", "home -2")
            * @returns {boolean}
            */

        // --- Core Helpers ---
        function hasMarket(odds, market, prediction = null) {
            if (!odds || !odds[market]) return false;

            if (prediction === null) {
                return true; // Market exists
            }

            return odds[market][prediction] !== undefined;
        }

        
        // Safely get full info object for a market + selection
        function getOddInfo(market, selection) {
            if (
                odds[market] &&
                odds[market][selection]
            ) {
                return odds[market][selection]; // { odd, suspended, handicap }
            }
            return null;
        }


        function displayOdd(market, selection) {
            if (!odds || Object.keys(odds).length === 0) return "-"; // no odds at all
            const info = getOddInfo(market, selection);
            return info && !info.suspended ? info.odd : "-";
        }


        function isSuspended(market, selection) {
            if (!odds || Object.keys(odds).length === 0) return true; // treat no odds as suspended
            const info = getOddInfo(market, selection);
            return info ? info.suspended : true;
        }
        
        // Example calls:
        // console.log(displayOdd("1X2", "home"));   // 2.56
        // console.log(displayOdd("1X2", "draw"));   // "-" (suspended)
        // console.log(isSuspended("1X2", "draw"));  // true


        const matchsum = document.createElement('div');
        matchsum.innerHTML = `<div id="wg-api-football-game"
                                data-host="v3.football.api-sports.io"
                                data-key="${api_key}"
                                data-id="${match_id}"
                                data-theme=""
                                data-refresh="15"
                                data-show-errors="false"
                                data-show-logos="true">
                            </div>`;

        container.prepend(matchsum);
        
        const filterodds = document.createElement('div');
        filterodds.innerHTML = `
            <div class="row overflow-auto gx-4 mx-1 flex-nowrap hide-scrollbar my-2 text-whitesmoke">
                <div class="col-auto filter-odds-by br-and-b-aqua">All</div>
                <div class="col-auto filter-odds-by">Popular</div>
                <div class="col-auto filter-odds-by">Goals</div>
                <div class="col-auto filter-odds-by">Correct Score</div>
                <div class="col-auto filter-odds-by">Combined</div>
                <div class="col-auto filter-odds-by">1st half</div>
                <div class="col-auto filter-odds-by">2nd half</div>
                <div class="col-auto filter-odds-by">Asian Hadicap</div>
                <div class="col-auto filter-odds-by">Conners</div>
                <div class="col-auto filter-odds-by">Player</div>
            </div>
        `;

        allMarkets.prepend(filterodds);

        if(hasMarket(odds, 'Match Winner')){
            const match_winner = document.createElement('div');
            match_winner.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#match_winner" aria-expanded="true" aria-controls="match_winner">
                            <span>Match Winner</span>
                        </button>
                    </h2>
                    <div id="match_winner" class="accordion-collapse collapse show" data-bs-parent="#accordionExample">
                        <div data-market-type="Match Winner" class="accordion-body bg-navy-blue row g-1">
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1" ${isSuspended('Match Winner','1') ? 'disabled' : ''}>
                                    <div class="text-yellow prediction">1</div>
                                    <div class="odds-value">${displayOdd('Match Winner', '1')}</div>
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="X" ${isSuspended('Match Winner','X') ? 'disabled' : ''}>
                                    <div class="text-yellow prediction">X</div>
                                    <div class="odds-value">${displayOdd('Match Winner', 'X')}</div>
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2" ${isSuspended('Match Winner','2') ? 'disabled' : ''}>
                                    <div class="text-yellow prediction">2</div>
                                    <div class="odds-value">${displayOdd('Match Winner', '2')}</div>
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(match_winner)
        }


        if(hasMarket(odds, 'Double Chance')){
            const doubleChance = document.createElement('div');
            doubleChance.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#doubleChance" aria-expanded="true" aria-controls="doubleChance">
                            <span>Double chance</span>
                        </button>
                    </h2>
                    <div id="doubleChance" class="accordion-collapse collapse show" data-bs-parent="#accordionExample">
                        <div data-market-type="Double Chance" class="accordion-body bg-navy-blue row g-1 p-1">
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1X" ${isSuspended('Double Chance','1X') ? 'disabled' : ''}>
                                    <div class="text-yellow prediction">1X</div>
                                    <div class="odds-value">${displayOdd('Double Chance', '1X')}</div>
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="12" ${isSuspended('Double Chance','12') ? 'disabled' : ''}>
                                    <div class="text-yellow prediction">12</div>
                                    <div class="odds-value">${displayOdd('Double Chance', '12')}</div>
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="X2" ${isSuspended('Double Chance','X2') ? 'disabled' : ''}>
                                    <div class="text-yellow prediction">X2</div>
                                    <div class="odds-value">${displayOdd('Double Chance', 'X2')}</div>
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(doubleChance);
        }


        if(hasMarket(odds, 'Both Teams To Score')){
        const btts = document.createElement('div');
            btts.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#btts" aria-expanded="true" aria-controls="btts">
                            <span>Both Teams To Score</span>
                        </button>
                    </h2>
                    <div id="btts" class="accordion-collapse collapse show" data-bs-parent="#accordionExample">
                        <div data-market-type="Both Teams To Score" class="accordion-body bg-navy-blue row g-1 p-1">
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="yes" ${isSuspended('Both Teams To Score','yes') ? 'disabled' : ''}>
                                    <div class="text-yellow prediction">Yes</div>
                                    <div class="odds-value">${displayOdd('Both Teams To Score', 'yes')}</div> 
                                </button>
                            </div>
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="no" ${isSuspended('Both Teams To Score','no') ? 'disabled' : ''}>
                                    <div class="text-yellow prediction">No</div>
                                    <div class="odds-value">${displayOdd('Both Teams To Score', 'no')}</div> 
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(btts);
        }


        if(hasMarket(odds, 'Goals Over/Under')){
            const goals = document.createElement('div');
            goals.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#goals" aria-expanded="true" aria-controls="goals">
                                <span>Goals Over/Under</span>
                            </button>
                        </h2>
                    <div id="goals" class="accordion-collapse collapse show" data-bs-parent="#accordionExample">
                        <div data-market-type="Goals Over/Under" class="accordion-body bg-navy-blue p-1">
                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 0.5" ${isSuspended('Goals Over/Under','over 0.5') ? 'disabled' : ''}>
                                        <div class="text-yellow prediction">Over 0.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under', 'over 0.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 0.5" ${isSuspended('Goals Over/Under','under 0.5') ? 'disabled' : ''}>
                                        <div class="text-yellow prediction">Under 0.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under', 'under 0.5')}</div> 
                                    </button>
                                </div>
                            </div>

                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 1.5" ${isSuspended('Goals Over/Under','over 1.5') ? 'disabled' : ''}>
                                        <div class="text-yellow prediction">Over 1.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under', 'over 1.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 1.5" ${isSuspended('Goals Over/Under','under 1.5') ? 'disabled' : ''}>
                                        <div class="text-yellow prediction">Under 1.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under', 'under 1.5')}</div> 
                                    </button>
                                </div>
                            </div>

                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 2.5" ${isSuspended('Goals Over/Under','over 2.5') ? 'disabled' : ''}>
                                        <div class="text-yellow prediction">Over 2.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under', 'over 2.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 2.5" ${isSuspended('Goals Over/Under','over 2.5') ? 'disabled' : ''}>
                                        <div class="text-yellow prediction">Under 2.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under', 'under 2.5')}</div> 
                                    </button>
                                </div>
                            </div>

                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 3.5"  ${isSuspended('Goals Over/Under','over 3.5') ? 'disabled' : ''}>
                                        <div class="text-yellow prediction">Over 3.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under', 'over 3.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 3.5"  ${isSuspended('Goals Over/Under','over 3.5') ? 'disabled' : ''}>
                                        <div class="text-yellow prediction">Under 3.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under', 'under 3.5')}</div> 
                                    </button>
                                </div>
                            </div>

                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 4.5"  ${isSuspended('Goals Over/Under','over 4.5') ? 'disabled' : ''}>
                                        <div class="text-yellow prediction">Over 4.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under', 'over 4.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 4.5"  ${isSuspended('Goals Over/Under','over 4.5') ? 'disabled' : ''}>
                                        <div class="text-yellow prediction">Under 4.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under', 'under 4.5')}</div> 
                                    </button>
                                </div>
                            </div>

                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 5.5"  ${isSuspended('Goals Over/Under','over 5.5') ? 'disabled' : ''}>
                                        <div class="text-yellow prediction">Over 5.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under', 'over 5.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 5.5"  ${isSuspended('Goals Over/Under','over 5.5') ? 'disabled' : ''}>
                                        <div class="text-yellow prediction">Under 5.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under', 'under 5.5')}</div> 
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(goals);
        }


        if(hasMarket(odds, "First Half Winner")){
            const firstHalf1X2 = document.createElement('div');
            firstHalf1X2.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#First-half-1X2" aria-expanded="true" aria-controls="First-half-1X2">
                                <span>First Half Winner</span>
                            </button>
                        </h2>
                        <div id="First-half-1X2" class="accordion-collapse collapse show" data-bs-parent="#accordionExample">
                            <div data-market-type="First Half Winner" class="accordion-body bg-navy-blue row g-1 p-1">
                                <div class="col-4 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1">
                                        <div class="text-yellow prediction">1</div>
                                        <div class="odds-value">${displayOdd('First Half Winner', '1')}</div>
                                    </button>
                                </div>
                                <div class="col-4 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="X">
                                        <div class="text-yellow prediction">X</div>
                                        <div class="odds-value">${displayOdd('First Half Winner', 'X')}</div>
                                    </button>
                                </div>
                                <div class="col-4 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2">
                                        <div class="text-yellow prediction">2</div>
                                        <div class="odds-value">${displayOdd('First Half Winner', '2')}</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(firstHalf1X2);
        }

        if(hasMarket(odds, "Highest Scoring Half")){
            const highestScoringHalf = document.createElement('div');
            highestScoringHalf.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#highest-scoring-half" aria-expanded="true" aria-controls="highest-scoring-half">
                            <span>Highest Scoring Half</span>
                        </button>
                    </h2>
                    <div id="highest-scoring-half" class="accordion-collapse collapse show" data-bs-parent="#accordionExample">
                        <div data-market-type="Highest Scoring Half" class="accordion-body bg-navy-blue row g-1 p-1">
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1st half">
                                    <div class="text-yellow prediction">First</div>
                                    <div class="odds-value">${displayOdd('Highest Scoring Half', '1st half')}</div>
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="X">
                                    <div class="text-yellow prediction">Equal</div>
                                    <div class="odds-value">${displayOdd('Highest Scoring Half', 'X')}</div>
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2nd half">
                                    <div class="text-yellow prediction">Second</div>
                                    <div class="odds-value">${displayOdd('Highest Scoring Half', '2nd half')}</div>
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(highestScoringHalf);
        }

        // const firstHalfGoals = document.createElement('div');
        // firstHalfGoals.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //             <h2 class="accordion-header">
        //                 <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#First-half-goals" aria-expanded="true" aria-controls="First-half-goals">
        //                     <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                     <span>Halftime Over/Under</span>
        //                 </button>
        //             </h2>
        //             <div id="First-half-goals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //                 <div class="accordion-body bg-navy-blue p-1">
        //                     <div data-market-type="Halftime Over/Under" class="row g-2 mb-2">
        //                         <div class="col-6 d-grid">
        //                             <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Half time over - 0.5">
        //                                 <div class="text-yellow prediction">Over 0.5</div>
        //                                 <div class="odds-value">1.10</div>
        //                             </button>
        //                         </div>
        //                         <div class="col-6 d-grid">
        //                             <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Half time under - 0.5">
        //                                 <div class="text-yellow prediction">Under 0.5</div>
        //                                 <div class="odds-value">9.56</div> 
        //                             </button>
        //                         </div>
        //                     </div>

        //                     <div data-market-type="Halftime Over/Under" class="row g-2 mb-2">
        //                         <div class="col-6 d-grid">
        //                             <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Half time over - 1.5">
        //                                 <div class="text-yellow prediction">Over 1.5</div>
        //                                 <div class="odds-value">${getOdds('first_half_goals', 'over_1.5')}</div>
        //                             </button>
        //                         </div>
        //                         <div class="col-6 d-grid">
        //                             <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Half time under - 1.5">
        //                                 <div class="text-yellow prediction">Under 1.5</div>
        //                                 <div class="odds-value">${getOdds('first_half_goals', 'under_1.5')}</div> 
        //                             </button>
        //                         </div>
        //                     </div>

        //                     <div data-market-type="Halftime Over/Under" class="row g-2 mb-2">
        //                         <div class="col-6 d-grid">
        //                             <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Half time over - 2.5">
        //                                 <div class="text-yellow prediction">Over 2.5</div>
        //                                 <div class="odds-value">1.10</div>
        //                             </button>
        //                         </div>
        //                         <div class="col-6 d-grid">
        //                             <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Half time under - 2.5">
        //                                 <div class="text-yellow prediction">Under 2.5</div>
        //                                 <div class="odds-value">9.56</div> 
        //                             </button>
        //                         </div>
        //                     </div>

        //                 </div>
        //             </div>
        //         </div>
        //     </div>
        // `;

        if(hasMarket(odds, "Second Half Winner")){
            const secondHalf1X2 = document.createElement('div');
            secondHalf1X2.innerHTML = `
            <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#second-half-1X2" aria-expanded="true" aria-controls="second-half-1X2">
                            <span>Second Half Winner</span>
                        </button>
                    </h2>
                    <div id="second-half-1X2" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                        <div data-market-type="Second Half Winner" class="accordion-body bg-navy-blue row g-1 p-1">
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1">
                                    <div class="text-yellow prediction">1</div>
                                    <div class="odds-value">${displayOdd('Second Half Winner', '1')}</div>
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="X">
                                    <div class="text-yellow prediction">X</div>
                                    <div class="odds-value">${displayOdd('Second Half Winner', 'X')}</div>
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2">
                                    <div class="text-yellow prediction">2</div>
                                    <div class="odds-value">${displayOdd('Second Half Winner', '2')}</div>
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `; 
            allMarkets.appendChild(secondHalf1X2);
        }

        if(hasMarket(odds, "Correct Score 1st Half")){
            const correctScore1sthalf = document.createElement('div');
            correctScore1sthalf.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#correct-score-1st-half" aria-expanded="true" aria-controls="correct-score-1st-half">
                            <span>Correct Score 1st Half</span>
                        </button>
                    </h2>
                    <div id="correct-score-1st-half" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                        <div data-market-type="Correct Score 1st Half" class="accordion-body bg-navy-blue row g-1 p-1">
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="0:0">
                                    <div class="text-yellow prediction">0:0</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '0:0')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="0:1">
                                    <div class="text-yellow prediction">0:1</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '0:1')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="0:2">
                                    <div class="text-yellow prediction">0:2</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '0:2')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="0:3">
                                    <div class="text-yellow prediction">0:3</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '0:3')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1:0">
                                    <div class="text-yellow prediction">1:0</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '1:0')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1:1">
                                    <div class="text-yellow prediction">1:1</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '1:1')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1:2">
                                    <div class="text-yellow prediction">1:2</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '1:2')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1:3">
                                    <div class="text-yellow prediction">1:3</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '1:3')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2:0">
                                    <div class="text-yellow prediction">2:0</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '2:0')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2:1">
                                    <div class="text-yellow prediction">2:1</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '2:1')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2:2">
                                    <div class="text-yellow prediction">2:2</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '2:2')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2:3">
                                    <div class="text-yellow prediction">2:3</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '2:3')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="3:0">
                                    <div class="text-yellow prediction">3:0</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '3:0')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="3:1">
                                    <div class="text-yellow prediction">3:1</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '3:1')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="3:2">
                                    <div class="text-yellow prediction">3:2</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '3:2')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="4:0">
                                    <div class="text-yellow prediction">4:0</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '4:0')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="4:1">
                                    <div class="text-yellow prediction">4:1</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '4:1')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="4:2">
                                    <div class="text-yellow prediction">4:2</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '4:2')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="4:3">
                                    <div class="text-yellow prediction">4:3</div>
                                    <div class="odds-value">${displayOdd('Correct Score 1st Half', '4:3')}</div> 
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `; 
            allMarkets.appendChild(correctScore1sthalf);
        }

        if(hasMarket(odds, "Correct Score")){
            const correctScore = document.createElement('div');
            correctScore.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#correct-score" aria-expanded="true" aria-controls="correct-score">
                            <span>Correct Score</span>
                        </button>
                    </h2>
                    <div id="correct-score" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                        <div data-market-type="Correct Score" class="accordion-body bg-navy-blue row g-1 p-1">
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="0:0">
                                    <div class="text-yellow prediction">0:0</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '0:0')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="0:1">
                                    <div class="text-yellow prediction">0:1</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '0:1')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="0:2">
                                    <div class="text-yellow prediction">0:2</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '0:2')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="0:3">
                                    <div class="text-yellow prediction">0:3</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '0:3')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="0:4">
                                    <div class="text-yellow prediction">0:4</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '0:4')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1:0">
                                    <div class="text-yellow prediction">1:0</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '1:0')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1:1">
                                    <div class="text-yellow prediction">1:1</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '1:1')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1:2">
                                    <div class="text-yellow prediction">1:2</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '1:2')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1:3">
                                    <div class="text-yellow prediction">1:3</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '1:3')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1:4">
                                    <div class="text-yellow prediction">1:4</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '1:4')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2:0">
                                    <div class="text-yellow prediction">2:0</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '2:0')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2:1">
                                    <div class="text-yellow prediction">2:1</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '2:1')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2:2">
                                    <div class="text-yellow prediction">2:2</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '2:2')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2:3">
                                    <div class="text-yellow prediction">2:3</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '2:3')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2:4">
                                    <div class="text-yellow prediction">2:4</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '2:4')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="3:0">
                                    <div class="text-yellow prediction">3:0</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '3:0')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="3:1">
                                    <div class="text-yellow prediction">3:1</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '3:1')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="3:2">
                                    <div class="text-yellow prediction">3:2</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '3:2')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="3:3">
                                    <div class="text-yellow prediction">3:3</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '3:3')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="3:4">
                                    <div class="text-yellow prediction">3:4</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '3:4')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="4:0">
                                    <div class="text-yellow prediction">4:0</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '4:0')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="4:1">
                                    <div class="text-yellow prediction">4:1</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '4:1')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="4:2">
                                    <div class="text-yellow prediction">4:2</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '4:2')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="4:3">
                                    <div class="text-yellow prediction">4:3</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '4:3')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="4:4">
                                    <div class="text-yellow prediction">4:4</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '4:4')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="4:5">
                                    <div class="text-yellow prediction">4:5</div>
                                    <div class="odds-value">${displayOdd('Correct Score', '4:5')}</div> 
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `; 
            allMarkets.appendChild(correctScore);
        }

        // const totalGoalRange = document.createElement('div');
        // totalGoalRange.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#total-goal-range" aria-expanded="true" aria-controls="total-goal-range">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>Total Goal Range</span>
        //             </button>
        //         </h2>
        //         <div id="total-goal-range" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="Total Goal Range" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction">0</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction">1-2</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction">1-3</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction">1-4</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction">1-5</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction">1-6</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction">2-3</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction">2-4</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction">2-5</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction">2-6</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction">3-4</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction">3-5</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction">3-6</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction">4-5</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction">4-6</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-6 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 7+">
        //                         <div class="text-yellow prediction">5-6</div>
        //                         <div class="odds-value">1.65</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-6 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - No goals">
        //                         <div class="text-yellow prediction">7+</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>                    
        //             </div>
        //         </div>
        //         </div>
        //     </div>
            
        // `; 

        if(hasMarket(odds, "Who Will Win")){
            const whoWillWin = document.createElement('div');
            whoWillWin.innerHTML = `
                <div class="accordion accordion-flush border-0 br-toark mb-2" id="accordionExample">
                    <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#who-will-win" aria-expanded="true" aria-controls="who-will-win">
                            <span>Who Will Win? (If Draw, Money backAway)</span>
                        </button>
                    </h2>
                    <div id="who-will-win" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                        <div data-market-type="Who Will Win" class="accordion-body bg-navy-blue row g-1 p-1">
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1">
                                    <div class="text-yellow prediction">1</div>
                                    <div class="odds-value">${displayOdd('Who Will Win', '1')}</div> 
                                </button>
                            </div>
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2">
                                    <div class="text-yellow prediction">2</div>
                                    <div class="odds-value">${displayOdd('Who Will Win', '2')}</div> 
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(whoWillWin);
        }

        if(hasMarket(odds, "Team To Score First")){ 
            const teamToScoreFirst = document.createElement('div');
            teamToScoreFirst.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#Team-to-score-first" aria-expanded="true" aria-controls="Team-to-score-first">
                                <span>Team To Score First</span>
                            </button>
                        </h2>
                        <div id="Team-to-score-first" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                            <div data-market-type="Team To Score First" class="accordion-body bg-navy-blue row g-1 p-1">
                                <div class="col-4 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1">
                                        <div class="text-yellow prediction">1</div>
                                        <div class="odds-value">${displayOdd('Team To Score First', '1')}</div> 
                                    </button>
                                </div>
                                <div class="col-4 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="X">
                                        <div class="text-yellow prediction">X</div>
                                        <div class="odds-value">${displayOdd('Team To Score First', 'X')}</div> 
                                    </button>
                                </div>
                                <div class="col-4 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2">
                                        <div class="text-yellow prediction">2</div>
                                        <div class="odds-value">${displayOdd('Team To Score First', '2')}</div> 
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(teamToScoreFirst);
        }

        if(hasMarket(odds, "First Half Winner")){
            const first10mins1X2 = document.createElement('div');
            first10mins1X2.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#first-10min-1X2" aria-expanded="true" aria-controls="first-10min-1X2">
                            <span>First Half Winner</span>
                        </button>
                    </h2>
                    <div id="first-10min-1X2" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                        <div data-market-tyep="First Half Winner" class="accordion-body bg-navy-blue row g-1 p-1">
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1">
                                    <div class="text-yellow prediction">1</div>
                                    <div class="odds-value">${displayOdd('First Half Winner', '1')}</div>
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="X">
                                    <div class="text-yellow prediction">X</div>
                                    <div class="odds-value">${displayOdd('First Half Winner', 'X')}</div>
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2">
                                    <div class="text-yellow prediction">2</div>
                                    <div class="odds-value">${displayOdd('First Half Winner', '2')}</div>
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(first10mins1X2);
        }

        // const multiGoals = document.createElement('div');
        // multiGoals.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#Multigoals" aria-expanded="true" aria-controls="Multigoals">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>Multigoals</span>
        //             </button>
        //         </h2>
        //         <div id="Multigoals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="Multigoals" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 1-2">
        //                         <div class="text-yellow prediction">1-2</div>
        //                         <div class="odds-value">2.68</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 1-3">
        //                         <div class="text-yellow prediction">1-3</div>
        //                         <div class="odds-value">1.65</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 1-4">
        //                         <div class="text-yellow prediction">1-4</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 1-5">
        //                         <div class="text-yellow prediction">1-5</div>
        //                         <div class="odds-value">2.68</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 1-6">
        //                         <div class="text-yellow prediction">1-6</div>
        //                         <div class="odds-value">1.65</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 2-3">
        //                         <div class="text-yellow prediction">2-3</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 2-4">
        //                         <div class="text-yellow prediction">2-4</div>
        //                         <div class="odds-value">2.68</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 2-5">
        //                         <div class="text-yellow prediction">2-5</div>
        //                         <div class="odds-value">1.65</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 2-6">
        //                         <div class="text-yellow prediction">2-6</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 3-4">
        //                         <div class="text-yellow prediction">3-4</div>
        //                         <div class="odds-value">2.68</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 3-5">
        //                         <div class="text-yellow prediction">3-5</div>
        //                         <div class="odds-value">1.65</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 3-6">
        //                         <div class="text-yellow prediction">3-6</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 4-5">
        //                         <div class="text-yellow prediction">4-5</div>
        //                         <div class="odds-value">2.68</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 4-6">
        //                         <div class="text-yellow prediction">4-6</div>
        //                         <div class="odds-value">1.65</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 5-6">
        //                         <div class="text-yellow prediction">5-6</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-6 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 7+">
        //                         <div class="text-yellow prediction">7+</div>
        //                         <div class="odds-value">1.65</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-6 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - No goals">
        //                         <div class="text-yellow prediction">No goals</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        
        if(hasMarket(odds, "Home Team Over/Under")){
            const homeTeamGoals = document.createElement('div'); 
            homeTeamGoals.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#HometeamGoals" aria-expanded="true" aria-controls="HometeamGoals">
                                <span>${extras.teams?.home?.name} Over/Under</span>
                            </button>
                        </h2>
                    <div id="HometeamGoals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                        <div data-market-type="Home Team Over/Under" class="accordion-body bg-navy-blue p-1">
                            
                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 0.5">
                                        <div class="text-yellow prediction">Over 0.5</div>
                                        <div class="odds-value">${displayOdd('Home Team Over/Under', 'over 0.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 0.5">
                                        <div class="text-yellow prediction">Under 0.5</div>
                                        <div class="odds-value">${displayOdd('Home Team Over/Under', 'under 0.5')}</div> 
                                    </button>
                                </div>
                            </div>

                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 1.5">
                                        <div class="text-yellow prediction">Over 1.5</div>
                                        <div class="odds-value">${displayOdd('Home Team Over/Under', 'over 1.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 1.5">
                                        <div class="text-yellow prediction">Under 1.5</div>
                                        <div class="odds-value">${displayOdd('Home Team Over/Under', 'under 1.5')}</div> 
                                    </button>
                                </div>
                            </div>

                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 2.5">
                                        <div class="text-yellow prediction">Over 2.5</div>
                                        <div class="odds-value">${displayOdd('Home Team Over/Under', 'over 2.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 2.5">
                                        <div class="text-yellow prediction">Under 2.5</div>
                                        <div class="odds-value">${displayOdd('Home Team Over/Under', 'under 2.5')}</div> 
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(homeTeamGoals);
        }

        if(hasMarket(odds, "Away Team Over/Under")){
            const awayTeamGoals = document.createElement('div'); 
            awayTeamGoals.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#awayteamGoals" aria-expanded="true" aria-controls="awayteamGoals">
                                <span>${extras.teams?.away?.name} Over/Under</span>
                            </button>
                        </h2>
                    <div id="awayteamGoals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                        <div data-market-type="Away Team Over/Under" class="accordion-body bg-navy-blue p-1">
                            
                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 0.5">
                                        <div class="text-yellow prediction">Over 0.5</div>
                                        <div class="odds-value">${displayOdd('Away Team Over/Under', 'over 0.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 0.5">
                                        <div class="text-yellow prediction">Under 0.5</div>
                                        <div class="odds-value">${displayOdd('Away Team Over/Under', 'under 0.5')}</div> 
                                    </button>
                                </div>
                            </div>

                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 1.5">
                                        <div class="text-yellow prediction">Over 1.5</div>
                                        <div class="odds-value">${displayOdd('Away Team Over/Under', 'over 1.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 1.5">
                                        <div class="text-yellow prediction">Under 1.5</div>
                                        <div class="odds-value">${displayOdd('Away Team Over/Under', 'under 1.5')}</div> 
                                    </button>
                                </div>
                            </div>

                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 2.5">
                                        <div class="text-yellow prediction">Over 2.5</div>
                                        <div class="odds-value">${displayOdd('Away Team Over/Under', 'over 2.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 2.5">
                                        <div class="text-yellow prediction">Under 2.5</div>
                                        <div class="odds-value">${displayOdd('Away Team Over/Under', 'under 2.5')}</div> 
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(awayTeamGoals);
        }


        // const homeTeamMultigoals = document.createElement('div');
        // homeTeamMultigoals.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#HomeTeamMultigoals" aria-expanded="true" aria-controls="HomeTeamMultigoals">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>${extras.home_team} multigoals</span>
        //             </button>
        //         </h2>
        //         <div id="HomeTeamMultigoals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="Home Team Multigoals" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team multigoals - 1-2">
        //                         <div class="text-yellow prediction">1-2</div>
        //                         <div class="odds-value">2.68</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team multigoals - 1-3">
        //                         <div class="text-yellow prediction">1-3</div>
        //                         <div class="odds-value">1.65</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team multigoals - 2-3">
        //                         <div class="text-yellow prediction">2-3</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-6 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team multigoals - 4+">
        //                         <div class="text-yellow prediction">4+</div>
        //                         <div class="odds-value">1.65</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-6 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - No goals">
        //                         <div class="text-yellow prediction">No goals</div>
        //                         <div class="odds-value">27.05</div>
        //                     </button>
        //                 </div>                                          
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        // const awayTeamMultiGoals = document.createElement('div');
        // awayTeamMultiGoals.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#AwayTeamMultigoals" aria-expanded="true" aria-controls="AwayTeamMultigoals">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>${extras.away_team} multigoals</span>
        //             </button>
        //         </h2>
        //         <div id="AwayTeamMultigoals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="Away Team Multigoals" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Away team multigoals - 1-2">
        //                         <div class="text-yellow prediction">1-2</div>
        //                         <div class="odds-value">2.68</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Away team multigoals - 1-3">
        //                         <div class="text-yellow prediction">1-3</div>
        //                         <div class="odds-value">1.65</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Away team multigoals - 2-3">
        //                         <div class="text-yellow prediction">2-3</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-6 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Away team multigoals - 4+">
        //                         <div class="text-yellow prediction">4+</div>
        //                         <div class="odds-value">1.65</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-6 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - No goals">
        //                         <div class="text-yellow prediction">No goals</div>
        //                         <div class="odds-value">27.05</div>
        //                     </button>
        //                 </div>                                          
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        // const firstHalfFirstGoal = document.createElement('div');
        // firstHalfFirstGoal.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#first-half-first-goal" aria-expanded="true" aria-controls="first-half-first-goal">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>First half first goal</span>
        //             </button>
        //         </h2>
        //         <div id="first-half-first-goal" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="First Half First Goal" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half first goal - Home Team">
        //                         <div class="text-yellow prediction">1</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half DC - Home/Away">
        //                         <div class="text-yellow prediction">No goal</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half first goal - Away Team">
        //                         <div class="text-yellow prediction">2</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        if(hasMarket(odds, "Double Chance 1st Half")){
            const firstHalfDoubleChance = document.createElement('div'); 
            firstHalfDoubleChance.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#first-half-double-chance" aria-expanded="true" aria-controls="first-half-double-chance">
                            <span>Double Chance 1st Half</span>
                        </button>
                    </h2>
                    <div id="first-half-double-chance" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                        <div data-market-type="Double Chance 1st Half" class="accordion-body bg-navy-blue row g-1 p-1">
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1X">
                                    <div class="text-yellow prediction">1X</div>
                                    <div class="odds-value">${displayOdd('Double Chance 1st Half', '1X')}</div>
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="12">
                                    <div class="text-yellow prediction">12</div>
                                    <div class="odds-value">${displayOdd('Double Chance 1st Half', '12')}</div>
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="X2">
                                    <div class="text-yellow prediction">X2</div>
                                    <div class="odds-value">${displayOdd('Double Chance 1st Half', 'X2')}</div>
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(firstHalfDoubleChance);
        }

        // const firstHalfHandicap = document.createElement('div');
        // firstHalfHandicap.innerHTML = `
        // <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#first-half-handicap" aria-expanded="true" aria-controls="first-half-handicap">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>First half handicap</span>
        //             </button>
        //         </h2>
        //         <div id="first-half-handicap" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="First Half Handicap" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - 1 (0:1)">
        //                         <div class="text-yellow prediction">1 (0:1)</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - X (0:1)">
        //                         <div class="text-yellow prediction">X (0:1)</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - 2 (0:1)">
        //                         <div class="text-yellow prediction">2 (0:1)</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - 1 (0:2)">
        //                         <div class="text-yellow prediction">1 (0:2)</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - X (0:2)">
        //                         <div class="text-yellow prediction">X (0:2)</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - 2 (0:2)">
        //                         <div class="text-yellow prediction">2 (0:2)</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - 1 (1:0)">
        //                         <div class="text-yellow prediction">1 (1:0)</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - X (1:0)">
        //                         <div class="text-yellow prediction">X (1:0)</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - 2 (1:0)">
        //                         <div class="text-yellow prediction">2 (1:0)</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        // const firstHalfHomeTeamGoals = document.createElement('div');
        // firstHalfHomeTeamGoals.innerHTML = `
        //      <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //             <h2 class="accordion-header">
        //                 <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#FirstHalfHometeamGoals" aria-expanded="true" aria-controls="FirstHalfHometeamGoals">
        //                     <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                     <span>First half ${extras.home_team} goals</span>
        //                 </button>
        //             </h2>
        //         <div id="FirstHalfHometeamGoals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="First Half Hometeam Goals" class="accordion-body bg-navy-blue p-1">
                        
        //                 <div class="row g-2 mb-2">
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half Home team over - 0.5">
        //                             <div class="text-yellow prediction">Over 0.5</div>
        //                             <div class="odds-value">1.10</div>
        //                         </button>
        //                     </div>
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half Home team under - 0.5">
        //                             <div class="text-yellow prediction">Under 0.5</div>
        //                             <div class="odds-value">9.56</div> 
        //                         </button>
        //                     </div>
        //                 </div>

        //                 <div class="row g-2 mb-2">
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half Home team over - 1.5">
        //                             <div class="text-yellow prediction">Over 1.5</div>
        //                             <div class="odds-value">1.10</div>
        //                         </button>
        //                     </div>
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half Home team under - 1.5">
        //                             <div class="text-yellow prediction">Under 1.5</div>
        //                             <div class="odds-value">9.56</div> 
        //                         </button>
        //                     </div>
        //                 </div>

        //                 <div class="row g-2 mb-2">
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half Home team over - 2.5">
        //                             <div class="text-yellow prediction">Over 2.5</div>
        //                             <div class="odds-value">1.10</div>
        //                         </button>
        //                     </div>
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half Home team under - 2.5">
        //                             <div class="text-yellow prediction">Under 2.5</div>
        //                             <div class="odds-value">9.56</div> 
        //                         </button>
        //                     </div>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        // const firstHalfAwayTeamGoals = document.createElement('div');
        // firstHalfAwayTeamGoals.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //             <h2 class="accordion-header">
        //                 <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#FirstHalfAwayteamGoals" aria-expanded="true" aria-controls="FirstHalfAwayteamGoals">
        //                     <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                     <span>First half ${extras.away_team} goals</span>
        //                 </button>
        //             </h2>
        //         <div id="FirstHalfAwayteamGoals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="First Half Awayteam Goals" class="accordion-body bg-navy-blue p-1">
                        
        //                 <div class="row g-2 mb-2">
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half away team over - 0.5">
        //                             <div class="text-yellow prediction">Over 0.5</div>
        //                             <div class="odds-value">1.10</div>
        //                         </button>
        //                     </div>
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half away team under - 0.5">
        //                             <div class="text-yellow prediction">Under 0.5</div>
        //                             <div class="odds-value">9.56</div> 
        //                         </button>
        //                     </div>
        //                 </div>

        //                 <div class="row g-2 mb-2">
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half away team over - 1.5">
        //                             <div class="text-yellow prediction">Over 1.5</div>
        //                             <div class="odds-value">1.10</div>
        //                         </button>
        //                     </div>
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half away team under - 1.5">
        //                             <div class="text-yellow prediction">Under 1.5</div>
        //                             <div class="odds-value">9.56</div> 
        //                         </button>
        //                     </div>
        //                 </div>

        //                 <div class="row g-2 mb-2">
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half away team over - 2.5">
        //                             <div class="text-yellow prediction">Over 2.5</div>
        //                             <div class="odds-value">1.10</div>
        //                         </button>
        //                     </div>
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half away team under - 2.5">
        //                             <div class="text-yellow prediction">Under 2.5</div>
        //                             <div class="odds-value">9.56</div> 
        //                         </button>
        //                     </div>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        // const whichTeamToScore = document.createElement('div');
        // whichTeamToScore.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#which-team-to-score" aria-expanded="true" aria-controls="which-team-to-score">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>Which team to score</span>
        //             </button>
        //         </h2>
        //         <div id="which-team-to-score" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="Which Team To Score" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half DC - Home/Draw">
        //                         <div class="text-yellow text-small prediction">Home only</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half DC - Home/Away">
        //                         <div class="text-yellow text-small prediction">None</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half DC - Draw/Away">
        //                         <div class="text-yellow text-small prediction">Away only</div>
        //                         <div class="odds-value">2.98</div>
        //                     </button>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `; 

        // const ftDoubleChanceAndOorU = document.createElement('div');
        // ftDoubleChanceAndOorU.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#fulltime-dc-and-o/u" aria-expanded="true" aria-controls="fulltime-dc-and-o/u">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>Full time double chance & O/U</span>
        //             </button>
        //         </h2>
        //         <div id="fulltime-dc-and-o/u" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="FT DC & O/U" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & O 1.5</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction text-small align-bottom" style="padding-top: 1px;">12 & O 1.5</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & O 1.5</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & U 1.5</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & U 1.5</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & U 1.5</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & O 2.5</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & O 2.5</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & O 2.5</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & U 2.5</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & U 2.5</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & U 2.5</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & O 3.5</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & O 3.5</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & O 3.5</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & U 3.5</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & U 3.5</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & U 3.5</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & O 4.5</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & O 4.5</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & O 4.5</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & U 4.5</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & U 4.5</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & U 4.5</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `; 

        // const ftDoubleChanceAndBts = document.createElement('div');
        // ftDoubleChanceAndBts.innerHTML = `
        // <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //     <div class="accordion-item">
        //     <h2 class="accordion-header">
        //         <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#fulltime-dc-&-bts" aria-expanded="true" aria-controls="fulltime-dc-&-bts">
        //             <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //             <span>Full time double chance & bts</span>
        //         </button>
        //     </h2>
        //     <div id="fulltime-dc-&-bts" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //         <div data-market-type="FT DC & BTS" class="accordion-body bg-navy-blue row g-1 p-1">
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & Y</div>
        //                     <div class="odds-value">2.01</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & Y</div>
        //                     <div class="odds-value">6.80</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & Y</div>
        //                     <div class="odds-value">2.29</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & N</div>
        //                     <div class="odds-value">2.01</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & N</div>
        //                     <div class="odds-value">6.80</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & N</div>
        //                     <div class="odds-value">2.29</div> 
        //                 </button>
        //             </div>
        //         </div>
        //     </div>
        //     </div>
        // </div>
        // `;

        if(hasMarket(odds, "1X2 & Over/Under")){
            const ft1X2and0orU = document.createElement('div'); 
            ft1X2and0orU.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#fulltime-1X2-and-o/u" aria-expanded="true" aria-controls="fulltime-1X2-and-o/u">
                            <span>1X2 & Over/Under</span>
                        </button>
                    </h2>
                    <div id="fulltime-1X2-and-o/u" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                        <div data-market-type="1X2 & Over/Under" class="accordion-body bg-navy-blue row g-1 p-1">
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="1 & O 2.5">
                                    <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & O 2.5</div>
                                    <div class="odds-value">${displayOdd('1X2 & Over/Under', '1 & O 2.5')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="X & O 2.5">
                                    <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & O 2.5</div>
                                    <div class="odds-value">${displayOdd('1X2 & Over/Under', 'X & O 2.5')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="2 & O 2.5">
                                    <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & O 2.5</div>
                                    <div class="odds-value">${displayOdd('1X2 & Over/Under', '2 & O 2.5')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="1 & U 2.5">
                                    <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & U 2.5</div>
                                    <div class="odds-value">${displayOdd('1X2 & Over/Under', '1 & U 2.5')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="X & U 2.5">
                                    <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & U 2.5</div>
                                    <div class="odds-value">${displayOdd('1X2 & Over/Under', 'X & U 2.5')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="2 & U 2.5">
                                    <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & U 2.5</div>
                                    <div class="odds-value">${displayOdd('1X2 & Over/Under', '2 & U 2.5')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="1 & O 3.5">
                                    <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & O 3.5</div>
                                    <div class="odds-value">${displayOdd('1X2 & Over/Under', '1 & O 3.5')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="X & O 3.5">
                                    <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & O 3.5</div>
                                    <div class="odds-value">${displayOdd('1X2 & Over/Under', 'X & O 3.5')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="2 & O 3.5">
                                    <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & O 3.5</div>
                                    <div class="odds-value">${displayOdd('1X2 & Over/Under', '2 & O 3.5')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="1 & U 3.5">
                                    <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & U 3.5</div>
                                    <div class="odds-value">${displayOdd('1X2 & Over/Under', '1 & U 3.5')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="X & U 3.5">
                                    <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & U 3.5</div>
                                    <div class="odds-value">${displayOdd('1X2 & Over/Under', 'X & U 3.5')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="2 & U 3.5">
                                    <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & U 3.5</div>
                                    <div class="odds-value">${displayOdd('1X2 & Over/Under', '2 & U 3.5')}</div> 
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(ft1X2and0orU);
        }


        if(hasMarket(odds, "Goals Over/Under 1st Half")){
            const goalsOorU1sthf = document.createElement('div'); 
            goalsOorU1sthf.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#goalsOorU1sthf" aria-expanded="true" aria-controls="goalsOorU1sthf">
                                <span>Goals Over/Under 1st Half</span>
                            </button>
                        </h2>
                    <div id="goalsOorU1sthf" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                        <div data-market-type="Goals Over/Under 1st Half" class="accordion-body bg-navy-blue p-1">
                            
                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 0.5">
                                        <div class="text-yellow prediction">Over 0.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under 1st Half', 'over 0.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 0.5">
                                        <div class="text-yellow prediction">Under 0.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under 1st Half', 'under 0.5')}</div> 
                                    </button>
                                </div>
                            </div>

                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 1.5">
                                        <div class="text-yellow prediction">Over 1.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under 1st Half', 'over 1.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 1.5">
                                        <div class="text-yellow prediction">Under 1.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under 1st Half', 'under 1.5')}</div> 
                                    </button>
                                </div>
                            </div>

                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 2.5">
                                        <div class="text-yellow prediction">Over 2.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under 1st Half', 'over 2.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 2.5">
                                        <div class="text-yellow prediction">Under 2.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under 1st Half', 'under 2.5')}</div> 
                                    </button>
                                </div>
                            </div>1
                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 3.5">
                                        <div class="text-yellow prediction">Over 3.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under 1st Half', 'over 3.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 3.5">
                                        <div class="text-yellow prediction">Under 3.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under 1st Half', 'under 3.5')}</div> 
                                    </button>
                                </div>
                            </div>1
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(goalsOorU1sthf);
        }


        if(hasMarket(odds, "Goals Over/Under 2nd Half")){
            const goalsOorU2ndhf = document.createElement('div'); 
            goalsOorU2ndhf.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#goalsOorU2ndhf" aria-expanded="true" aria-controls="goalsOorU2ndhf">
                                <span>Goals Over/Under 2nd Half</span>
                            </button>
                        </h2>
                    <div id="goalsOorU2ndhf" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                        <div data-market-type="Goals Over/Under 2nd Half" class="accordion-body bg-navy-blue p-1">
                            
                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 0.5">
                                        <div class="text-yellow prediction">Over 0.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under 2nd Half', 'over 0.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 0.5">
                                        <div class="text-yellow prediction">Under 0.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under 2nd Half', 'under 0.5')}</div> 
                                    </button>
                                </div>
                            </div>

                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 1.5">
                                        <div class="text-yellow prediction">Over 1.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under 2nd Half', 'over 1.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 1.5">
                                        <div class="text-yellow prediction">Under 1.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under 2nd Half', 'under 1.5')}</div> 
                                    </button>
                                </div>
                            </div>

                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 2.5">
                                        <div class="text-yellow prediction">Over 2.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under 2nd Half', 'over 2.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 2.5">
                                        <div class="text-yellow prediction">Under 2.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under 2nd Half', 'under 2.5')}</div> 
                                    </button>
                                </div>
                            </div>1
                            <div class="row g-2 mb-2">
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="over 3.5">
                                        <div class="text-yellow prediction">Over 3.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under 2nd Half', 'over 3.5')}</div>
                                    </button>
                                </div>
                                <div class="col-6 d-grid">
                                    <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="under 3.5">
                                        <div class="text-yellow prediction">Under 3.5</div>
                                        <div class="odds-value">${displayOdd('Goals Over/Under 2nd Half', 'under 3.5')}</div> 
                                    </button>
                                </div>
                            </div>1
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(goalsOorU2ndhf);
        }


        if(hasMarket(odds, "1X2 & BTTS")){
            const  ft1X2andBts = document.createElement('div');
            ft1X2andBts.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#fulltime-1X2-&-bts" aria-expanded="true" aria-controls="fulltime-1X2-&-bts">
                        <span>1X2 & BTTS</span>
                    </button>
                </h2>
                <div id="fulltime-1X2-&-bts" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                    <div data-market-type="1X2 & BTTS" class="accordion-body bg-navy-blue row g-1 p-1">
                        <div class="col-4 d-grid">
                            <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="1 & Y">
                                <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & Y</div>
                                <div class="odds-value">${displayOdd('1X2 & BTTS', '1 & Y')}</div> 
                            </button>
                        </div>
                        <div class="col-4 d-grid">
                            <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="X & Y">
                                <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & Y</div>
                                <div class="odds-value">${displayOdd('1X2 & BTTS', 'X & Y')}</div> 
                            </button>
                        </div>
                        <div class="col-4 d-grid">
                            <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="2 & Y">
                                <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & Y</div>
                                <div class="odds-value">${displayOdd('1X2 & BTTS', '2 & Y')}</div> 
                            </button>
                        </div>
                        <div class="col-4 d-grid">
                            <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="1 & N">
                                <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & N</div>
                                <div class="odds-value">${displayOdd('1X2 & BTTS', '1 & N')}</div> 
                            </button>
                        </div>
                        <div class="col-4 d-grid">
                            <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="X & N">
                                <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & N</div>
                                <div class="odds-value">${displayOdd('1X2 & BTTS', 'X & N')}</div> 
                            </button>
                        </div>
                        <div class="col-4 d-grid">
                            <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="2 & N">
                                <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & N</div>
                                <div class="odds-value">${displayOdd('1X2 & BTTS', '2 & N')}</div> 
                            </button>
                        </div>
                    </div>
                </div>
                </div>
            </div>
            `;
            allMarkets.appendChild(ft1X2andBts);
        }


        if(hasMarket(odds, "BTTS & Over/Under")){
            const btsAndOorU2point5 = document.createElement('div');
            btsAndOorU2point5.innerHTML = `
            <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#bts-and-o-or-u-2.5" aria-expanded="true" aria-controls="bts-and-o-or-u-2.5">
                        <span>BTTS & Over/Under</span>
                    </button>
                </h2>
                <div id="bts-and-o-or-u-2.5" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                    <div data-market-type="BTTS & Over/Under" class="accordion-body bg-navy-blue row g-1 p-1">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Y & O 2.5">
                                <div class="text-yellow prediction text-small" style="padding-top: 1px;">Y & O 2.5</div>
                                <div class="odds-value">${displayOdd('BTTS & Over/Under', 'Y & O 2.5')}</div> 
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Y & U 2.5">
                                <div class="text-yellow prediction text-small" style="padding-top: 1px;">Y & U 2.5</div>
                                <div class="odds-value">${displayOdd('BTTS & Over/Under', 'Y & U 2.5')}</div> 
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="N & O 2.5">
                                <div class="text-yellow prediction text-small" style="padding-top: 1px;">N & O 2.5</div>
                                <div class="odds-value">${displayOdd('BTTS & Over/Under', 'N & O 2.5')}</div> 
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="N & U 2.5">
                                <div class="text-yellow prediction text-small" style="padding-top: 1px;">N & U 2.5</div>
                                <div class="odds-value">${displayOdd('BTTS & Over/Under', 'N & U 2.5')}</div> 
                            </button>
                        </div>
                    </div>
                </div>
                </div>
            </div>
            `;
        allMarkets.appendChild(btsAndOorU2point5);
        }

        // const htDoubleChanceAndBts = document.createElement('div');
        // htDoubleChanceAndBts.innerHTML = `
        // <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //     <div class="accordion-item">
        //     <h2 class="accordion-header">
        //         <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#halftime-dc-&-bts" aria-expanded="true" aria-controls="halftime-dc-&-bts">
        //             <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //             <span>Half time double chance & bts</span>
        //         </button>
        //     </h2>
        //     <div id="halftime-dc-&-bts" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //         <div data-market-type="HT DC & BTS" class="accordion-body bg-navy-blue row g-1 p-1">
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & Y</div>
        //                     <div class="odds-value">2.01</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & Y</div>
        //                     <div class="odds-value">6.80</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & Y</div>
        //                     <div class="odds-value">2.29</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & N</div>
        //                     <div class="odds-value">2.01</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & N</div>
        //                     <div class="odds-value">6.80</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & N</div>
        //                     <div class="odds-value">2.29</div> 
        //                 </button>
        //             </div>
        //         </div>
        //     </div>
        //     </div>
        // </div>
        // `;

        // const ht1X2and0orU = document.createElement('div');
        // ht1X2and0orU.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#halftime-1X2-and-o/u" aria-expanded="true" aria-controls="halftime-1X2-and-o/u">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>Half time 1X2 & O/U</span>
        //             </button>
        //         </h2>
        //         <div id="halftime-1X2-and-o/u" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="HT 1X2 & O/U" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & O 1.5</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction text-small align-bottom" style="padding-top: 1px;">X & O 1.5</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & O 1.5</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & U 1.5</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & U 1.5</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & U 1.5</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        // const  ht1X2andBts = document.createElement('div');
        // ht1X2andBts.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //     <div class="accordion-item">
        //     <h2 class="accordion-header">
        //         <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#halftime-1X2-&-bts" aria-expanded="true" aria-controls="halftime-1X2-&-bts">
        //             <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //             <span>Half time 1X2 & bts</span>
        //         </button>
        //     </h2>
        //     <div id="halftime-1X2-&-bts" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //         <div data-market-type="HT 1X2 & BTS" class="accordion-body bg-navy-blue row g-1 p-1">
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & Y</div>
        //                     <div class="odds-value">2.01</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & Y</div>
        //                     <div class="odds-value">6.80</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & Y</div>
        //                     <div class="odds-value">2.29</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & N</div>
        //                     <div class="odds-value">2.01</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & N</div>
        //                     <div class="odds-value">6.80</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & N</div>
        //                     <div class="odds-value">2.29</div> 
        //                 </button>
        //             </div>
        //         </div>
        //     </div>
        //     </div>
        // </div>
        // `;

        // const secondHalhDoubleChanceAndBts = document.createElement('div');
        // secondHalhDoubleChanceAndBts.innerHTML = `
        // <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //     <div class="accordion-item">
        //     <h2 class="accordion-header">
        //         <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#2ndhalftime-dc-&-bts" aria-expanded="true" aria-controls="2ndhalftime-dc-&-bts">
        //             <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //             <span>2nd half double chance & bts</span>
        //         </button>
        //     </h2>
        //     <div id="2ndhalftime-dc-&-bts" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //         <div data-market-type="2nd Half DC & BTS" class="accordion-body bg-navy-blue row g-1 p-1">
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & Y</div>
        //                     <div class="odds-value">2.01</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & Y</div>
        //                     <div class="odds-value">6.80</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & Y</div>
        //                     <div class="odds-value">2.29</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & N</div>
        //                     <div class="odds-value">2.01</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & N</div>
        //                     <div class="odds-value">6.80</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & N</div>
        //                     <div class="odds-value">2.29</div> 
        //                 </button>
        //             </div>
        //         </div>
        //     </div>
        //     </div>
        // </div>
        // `;

        // const secondHalf1X2and0orU = document.createElement('div');
        // secondHalf1X2and0orU.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#2ndhalf-1X2-and-o/u" aria-expanded="true" aria-controls="2ndhalf-1X2-and-o/u">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>2nd half 1X2 & O/U</span>
        //             </button>
        //         </h2>
        //         <div id="2ndhalf-1X2-and-o/u" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="2nd Half 1X2 & O/U" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & O 1.5</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction text-small align-bottom" style="padding-top: 1px;">X & O 1.5</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & O 1.5</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & U 1.5</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & U 1.5</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & U 1.5</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        // const highestScoringHalfHomeTeam = document.createElement('div');
        // highestScoringHalfHomeTeam.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#highest-scoring-half-home-team" aria-expanded="true" aria-controls="highest-scoring-half-home-team">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>Highest scoring half : ${extras.home_team}</span>
        //             </button>
        //         </h2>
        //         <div id="highest-scoring-half-home-team" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="Highest Scoring Half Home Team" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Home Win">
        //                         <div class="text-yellow prediction">First</div>
        //                         <div class="odds-value">${getOdds('highest_scoring_half', 'first')}</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Draw">
        //                         <div class="text-yellow prediction">Equal</div>
        //                         <div class="odds-value">${getOdds('highest_scoring_half', 'equal')}</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Away Win">
        //                         <div class="text-yellow prediction">Second</div>
        //                         <div class="odds-value">${getOdds('highest_scoring_half', 'second')}</div>
        //                     </button>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        // const highestScoringHalfAwayTeam = document.createElement('div');
        // highestScoringHalfAwayTeam.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#highest-scoring-half-away-team" aria-expanded="true" aria-controls="highest-scoring-half-away-team">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>Highest scoring half : ${extras.away_team}</span>
        //             </button>
        //         </h2>
        //         <div id="highest-scoring-half-away-team" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="Highest Scoring Half Away Team" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Home Win">
        //                         <div class="text-yellow prediction">First</div>
        //                         <div class="odds-value">${getOdds('highest_scoring_half', 'first')}</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Draw">
        //                         <div class="text-yellow prediction">Equal</div>
        //                         <div class="odds-value">${getOdds('highest_scoring_half', 'equal')}</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Away Win">
        //                         <div class="text-yellow prediction">Second</div>
        //                         <div class="odds-value">${getOdds('highest_scoring_half', 'second')}</div>
        //                     </button>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        // const firstHalfTotalGoals = document.createElement('div');
        // firstHalfTotalGoals.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#first-half-total-goals" aria-expanded="true" aria-controls="first-half-total-goals">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>First half total goals</span>
        //             </button>
        //         </h2>
        //         <div id="first-half-total-goals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="First Half Total Goals" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Home Win">
        //                         <div class="text-yellow prediction">0</div>
        //                         <div class="odds-value">${getOdds('1X2', 'home')}</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Draw">
        //                         <div class="text-yellow prediction">1</div>
        //                         <div class="odds-value">${getOdds('1X2', 'draw')}</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Away Win">
        //                         <div class="text-yellow prediction">2+</div>
        //                         <div class="odds-value">${getOdds('1X2', 'away')}</div>
        //                     </button>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        // const secondHalfTotalGoals = document.createElement('div');
        // secondHalfTotalGoals.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#second-half-total-goals" aria-expanded="true" aria-controls="second-half-total-goals">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>Second half total goals</span>
        //             </button>
        //         </h2>
        //         <div id="second-half-total-goals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="Second Half Total Goals" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Home Win">
        //                         <div class="text-yellow prediction">0</div>
        //                         <div class="odds-value">${getOdds('first_half_goals', 'over_1.5')}</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Draw">
        //                         <div class="text-yellow prediction">1</div>
        //                         <div class="odds-value">${getOdds('first_half_goals', 'under_1.5')}</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Away Win">
        //                         <div class="text-yellow prediction">2+</div>
        //                         <div class="odds-value">${getOdds('first_half_goals', 'over')}</div>
        //                     </button>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        // const secondHalfHomeTeamGoals = document.createElement('div');
        // secondHalfHomeTeamGoals.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //             <h2 class="accordion-header">
        //                 <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#2nd-half-home-team-goals" aria-expanded="true" aria-controls="2nd-half-home-team-goals">
        //                     <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                     <span>Second half ${extras.home_team} goals</span>
        //                 </button>
        //             </h2>
        //         <div id="2nd-half-home-team-goals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="2nd Half Home Team Goals" class="accordion-body bg-navy-blue p-1">
                        
        //                 <div class="row g-2 mb-2">
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team over - 0.5">
        //                             <div class="text-yellow prediction">Over 0.5</div>
        //                             <div class="odds-value">1.10</div>
        //                         </button>
        //                     </div>
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team under - 0.5">
        //                             <div class="text-yellow prediction">Under 0.5</div>
        //                             <div class="odds-value">9.56</div> 
        //                         </button>
        //                     </div>
        //                 </div>

        //                 <div class="row g-2 mb-2">
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team over - 1.5">
        //                             <div class="text-yellow prediction">Over 1.5</div>
        //                             <div class="odds-value">1.10</div>
        //                         </button>
        //                     </div>
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team under - 1.5">
        //                             <div class="text-yellow prediction">Under 1.5</div>
        //                             <div class="odds-value">9.56</div> 
        //                         </button>
        //                     </div>
        //                 </div>

        //                 <div class="row g-2 mb-2">
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team over - 2.5">
        //                             <div class="text-yellow prediction">Over 2.5</div>
        //                             <div class="odds-value">1.10</div>
        //                         </button>
        //                     </div>
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team under - 2.5">
        //                             <div class="text-yellow prediction">Under 2.5</div>
        //                             <div class="odds-value">9.56</div> 
        //                         </button>
        //                     </div>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        // const secondHalfAwayTeamGoals = document.createElement('div');
        // secondHalfAwayTeamGoals.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //             <h2 class="accordion-header">
        //                 <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#2nd-half-away-team-goals" aria-expanded="true" aria-controls="2nd-half-away-team-goals">
        //                     <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                     <span>Second half ${extras.away_team} goals</span>
        //                 </button>
        //             </h2>
        //         <div id="2nd-half-away-team-goals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="2nd Half Away Team Goals" class="accordion-body bg-navy-blue p-1">
                        
        //                 <div class="row g-2 mb-2">
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team over - 0.5">
        //                             <div class="text-yellow prediction">Over 0.5</div>
        //                             <div class="odds-value">1.10</div>
        //                         </button>
        //                     </div>
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team under - 0.5">
        //                             <div class="text-yellow prediction">Under 0.5</div>
        //                             <div class="odds-value">9.56</div> 
        //                         </button>
        //                     </div>
        //                 </div>

        //                 <div class="row g-2 mb-2">
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team over - 1.5">
        //                             <div class="text-yellow prediction">Over 1.5</div>
        //                             <div class="odds-value">1.10</div>
        //                         </button>
        //                     </div>
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team under - 1.5">
        //                             <div class="text-yellow prediction">Under 1.5</div>
        //                             <div class="odds-value">9.56</div> 
        //                         </button>
        //                     </div>
        //                 </div>

        //                 <div class="row g-2 mb-2">
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team over - 2.5">
        //                             <div class="text-yellow prediction">Over 2.5</div>
        //                             <div class="odds-value">1.10</div>
        //                         </button>
        //                     </div>
        //                     <div class="col-6 d-grid">
        //                         <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team under - 2.5">
        //                             <div class="text-yellow prediction">Under 2.5</div>
        //                             <div class="odds-value">9.56</div> 
        //                         </button>
        //                     </div>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        // const secondHalfCorrectScore = document.createElement('div');
        // secondHalfCorrectScore.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#secold-half-correct-score" aria-expanded="true" aria-controls="secold-half-correct-score">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>Second half correct score</span>
        //             </button>
        //         </h2>
        //         <div id="secold-half-correct-score" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="2nd Half Correct Score" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction">1:0</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction">0:0</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction">0:1</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction">2:0</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction">1:1</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction">0:2</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction">2:1</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction">2:2</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction">1:2</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-12 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction">Other</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        if(hasMarket(odds, "Win To Nil")){
            const WinToNill = document.createElement('div');
            WinToNill.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#win-to-nil" aria-expanded="true" aria-controls="win-to-nil">
                            <span class="px-2"><i class="fa-solid fa-info"></i></span>
                            <span>Win To Nil</span>
                        </button>
                    </h2>
                    <div id="win-to-nil" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                        <div data-market-type="Win To Nil" class="accordion-body bg-navy-blue row g-1 p-1">
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1">
                                    <div class="text-yellow prediction">Home</div>
                                    <div class="odds-value">${displayOdd('Win To Nil', '1')}</div>
                                </button>
                            </div>
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2">
                                    <div class="text-yellow prediction">Away</div>
                                    <div class="odds-value">${displayOdd('Win To Nil', '2')}</div>
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(WinToNill);
        }


        // const homeWinToNill = document.createElement('div');
        // homeWinToNill.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#home-win-to-nill" aria-expanded="true" aria-controls="home-win-to-nill">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>${extras.home_team} win to nill</span>
        //             </button>
        //         </h2>
        //         <div id="home-win-to-nill" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="Home Win To Nill" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-6 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Home Win">
        //                         <div class="text-yellow prediction">Yes</div>
        //                         <div class="odds-value">${getOdds('1X2', 'vg')}</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-6 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Away Win">
        //                         <div class="text-yellow prediction">No</div>
        //                         <div class="odds-value">${getOdds('1X2', 'no')}</div>
        //                     </button>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        // const awayWinToNill = document.createElement('div');
        // awayWinToNill.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#away-win-to-nill" aria-expanded="true" aria-controls="away-win-to-nill">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>${extras.away_team} win to nill</span>
        //             </button>
        //         </h2>
        //         <div id="away-win-to-nill" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="Away Win To Nill" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-6 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Home Win">
        //                         <div class="text-yellow prediction">Yes</div>
        //                         <div class="odds-value">${getOdds('1X2', 'vg')}</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-6 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Away Win">
        //                         <div class="text-yellow prediction">No</div>
        //                         <div class="odds-value">${getOdds('1X2', 'no')}</div>
        //                     </button>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;


        if(hasMarket(odds, "Odd/Even FT")){
            const oddOrEvenft = document.createElement('div');
            oddOrEvenft.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#odd-or-evenft" aria-expanded="true" aria-controls="odd-or-evenft">
                            <span>Odd/Even FT</span>
                        </button>
                    </h2>
                    <div id="odd-or-evenft" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                        <div data-market-type="Odd/Even FT" class="accordion-body bg-navy-blue row g-1 p-1">
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="odd">
                                    <div class="text-yellow prediction">Odd</div>
                                    <div class="odds-value">${displayOdd('Odd/Even FT', 'odd')}</div>
                                </button>
                            </div>
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="even">
                                    <div class="text-yellow prediction">Even</div>
                                    <div class="odds-value">${displayOdd('Odd/Even FT', 'even')}</div>
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(oddOrEvenft);
        }

        
        if(hasMarket(odds, "Odd/Even 1st Half")){
            const oddOrEven1stHalf = document.createElement('div');
            oddOrEven1stHalf.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#odd-or-even1sthalf" aria-expanded="true" aria-controls="odd-or-even1sthalf">
                            <span>Odd/Even 1st Half</span>
                        </button>
                    </h2>
                    <div id="odd-or-even1sthalf" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                        <div data-market-type="Odd/Even 1st Half" class="accordion-body bg-navy-blue row g-1 p-1">
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="odd">
                                    <div class="text-yellow prediction">Odd</div>
                                    <div class="odds-value">${displayOdd('Odd/Even 1st Half', 'odd')}</div>
                                </button>
                            </div>
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="even">
                                    <div class="text-yellow prediction">Even</div>
                                    <div class="odds-value">${displayOdd('Odd/Even 1st Half', 'even')}</div>
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(oddOrEven1stHalf);
        }


        if(hasMarket(odds, "Odd/Even 2nd Half")){
            const oddOrEven2ndHalf = document.createElement('div');
            oddOrEven2ndHalf.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#odd-or-even2ndhalf" aria-expanded="true" aria-controls="odd-or-even2ndhalf">
                            <span>Odd/Even 2nd Half</span>
                        </button>
                    </h2>
                    <div id="odd-or-even2ndhalf" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                        <div data-market-type="Odd/Even 2nd Half" class="accordion-body bg-navy-blue row g-1 p-1">
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="odd">
                                    <div class="text-yellow prediction">Odd</div>
                                    <div class="odds-value">${displayOdd('Odd/Even 2nd Half', 'odd')}</div>
                                </button>
                            </div>
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="even">
                                    <div class="text-yellow prediction">Even</div>
                                    <div class="odds-value">${displayOdd('Odd/Even 2nd Half', 'even')}</div>
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(oddOrEven2ndHalf);
        }

        // const oddOrEvenAwayTeam = document.createElement('div');
        // oddOrEvenAwayTeam.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#oddOrOddAwayTeam" aria-expanded="true" aria-controls="oddOrOddAwayTeam">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>${extras.away_team} total goals odd/even</span>
        //             </button>
        //         </h2>
        //         <div id="oddOrOddAwayTeam" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="Away Team Total Goals Odd/Even" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-6 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Home Win">
        //                         <div class="text-yellow prediction">Odd</div>
        //                         <div class="odds-value">${getOdds('1X2', 'vg')}</div>
        //                     </button>
        //                 </div>
        //                 <div class="col-6 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Away Win">
        //                         <div class="text-yellow prediction">Even</div>
        //                         <div class="odds-value">${getOdds('1X2', 'away')}</div>
        //                     </button>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;


        if(hasMarket(odds, "Exact Total Goals")){
            const exactTotalGoals = document.createElement('div');
            exactTotalGoals.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#exact-total-goals" aria-expanded="true" aria-controls="exact-total-goals">
                            <span>Exact Total Goals</span>
                        </button>
                    </h2>
                    <div id="exact-total-goals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                        <div data-market-type="Exact Total Goals" class="accordion-body bg-navy-blue row g-1 p-1">
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="0">
                                    <div class="text-yellow prediction">0</div>
                                    <div class="odds-value">${displayOdd('Exact Total Goals', '0')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1">
                                    <div class="text-yellow prediction">1</div>
                                    <div class="odds-value">${displayOdd('Exact Total Goals', '1')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2">
                                    <div class="text-yellow prediction">2</div>
                                    <div class="odds-value">${displayOdd('Exact Total Goals', '2')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="3">
                                    <div class="text-yellow prediction">3</div>
                                    <div class="odds-value">${displayOdd('Exact Total Goals', '3')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="4">
                                    <div class="text-yellow prediction">4</div>
                                    <div class="odds-value">${displayOdd('Exact Total Goals', '4')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="5">
                                    <div class="text-yellow prediction">5</div>
                                    <div class="odds-value">${displayOdd('Exact Total Goals', '5')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="6">
                                    <div class="text-yellow prediction">6</div>
                                    <div class="odds-value">${displayOdd('Exact Total Goals', '6')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="7+">
                                    <div class="text-yellow prediction">7+</div>
                                    <div class="odds-value">${displayOdd('Exact Total Goals', '7+')}</div> 
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(exactTotalGoals);
        }

        // const btsFirstSecondhalf = document.createElement('div');
        // btsFirstSecondhalf.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //         <div class="accordion-item">
        //         <h2 class="accordion-header">
        //             <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#bts-1st-2nd-half" aria-expanded="true" aria-controls="bts-1st-2nd-half">
        //                 <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //                 <span>Both teams to score 1st half/2nd half</span>
        //             </button>
        //         </h2>
        //         <div id="bts-1st-2nd-half" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //             <div data-market-type="BTS 1st/2nd half" class="accordion-body bg-navy-blue row g-1 p-1">
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction">Y/Y</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                         <div class="text-yellow prediction">Y/N</div>
        //                         <div class="odds-value">2.29</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-4 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                         <div class="text-yellow prediction">N/Y</div>
        //                         <div class="odds-value">2.01</div> 
        //                     </button>
        //                 </div>
        //                 <div class="col-12 d-grid">
        //                     <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                         <div class="text-yellow prediction">N/N</div>
        //                         <div class="odds-value">6.80</div> 
        //                     </button>
        //                 </div>
        //             </div>
        //         </div>
        //         </div>
        //     </div>
        // `;

        // const  secondHalf1X2andBts = document.createElement('div');
        // secondHalf1X2andBts.innerHTML = `
        //     <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        //     <div class="accordion-item">
        //     <h2 class="accordion-header">
        //         <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#second-half-1X2-&-bts" aria-expanded="true" aria-controls="second-half-1X2-&-bts">
        //             <span class="px-2"><i class="fa-solid fa-info"></i></span>
        //             <span>Second half 1X2 & bts</span>
        //         </button>
        //     </h2>
        //     <div id="second-half-1X2-&-bts" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
        //         <div data-market-type="Second Half 1X2 & BTS" class="accordion-body bg-navy-blue row g-1 p-1">
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & Y</div>
        //                     <div class="odds-value">2.01</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & Y</div>
        //                     <div class="odds-value">6.80</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & Y</div>
        //                     <div class="odds-value">2.29</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & N</div>
        //                     <div class="odds-value">2.01</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & N</div>
        //                     <div class="odds-value">6.80</div> 
        //                 </button>
        //             </div>
        //             <div class="col-4 d-grid">
        //                 <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
        //                     <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & N</div>
        //                     <div class="odds-value">2.29</div> 
        //                 </button>
        //             </div>
        //         </div>
        //     </div>
        //     </div>
        // </div>
        // `;

        if(hasMarket(odds, "Halftime/Fulltime")){
            const halftimeFulltime = document.createElement('div'); 
            halftimeFulltime.innerHTML = `
                <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
                    <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#Halftime/Fulltime" aria-expanded="true" aria-controls="Halftime/Fulltime">
                            <span>Halftime/Fulltime</span>
                        </button>
                    </h2>
                    <div id="Halftime/Fulltime" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                        <div data-market-type="Halftime/Fulltime" class="accordion-body bg-navy-blue row g-1 p-1">
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1/1">
                                    <div class="text-yellow prediction">1/1</div>
                                    <div class="odds-value">${displayOdd('Halftime/Fulltime', '1/1')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="X/1">
                                    <div class="text-yellow prediction">X/1</div>
                                    <div class="odds-value">${displayOdd('Halftime/Fulltime', 'X/1')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2/1">
                                    <div class="text-yellow prediction">2/1</div>
                                    <div class="odds-value">${displayOdd('Halftime/Fulltime', '2/1')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1/X">
                                    <div class="text-yellow prediction">1/X</div>
                                    <div class="odds-value">${displayOdd('Halftime/Fulltime', '1/X')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="X/X">
                                    <div class="text-yellow prediction">X/X</div>
                                    <div class="odds-value">${displayOdd('Halftime/Fulltime', 'X/X')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2/X">
                                    <div class="text-yellow prediction">2/X</div>
                                    <div class="odds-value">${displayOdd('Halftime/Fulltime', '2/X')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1/2">
                                    <div class="text-yellow prediction">1/2</div>
                                    <div class="odds-value">${displayOdd('Halftime/Fulltime', '1/2')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="X/2">
                                    <div class="text-yellow prediction">X/2</div>
                                    <div class="odds-value">${displayOdd('Halftime/Fulltime', 'X/2')}</div> 
                                </button>
                            </div>
                            <div class="col-4 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2/2">
                                    <div class="text-yellow prediction">2/2</div>
                                    <div class="odds-value">${displayOdd('Halftime/Fulltime', '2/2')}</div> 
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            `;
            allMarkets.appendChild(halftimeFulltime);
        }
    }



    window.basketballMoreOddsInnerHTML = function(data){
        
    }



    // DROPDOWN ODDS FUNCTIONS FOR DIFFERENT SPORTS
    window.footballOddsDropdowns = function(data, containers){
        if(!Array.isArray(containers) && !(containers instanceof NodeList)){
            containers = [containers];
        }

        let oddsDescOptionsArray = [];
        
        containers.forEach((item, index)=>{
            const container = item.container || item;
            const oddsDescOptions = container.querySelectorAll('[id^="odds-desc-options-"]');
            oddsDescOptionsArray = Array.from(oddsDescOptions);

            const macthLinks = container.querySelectorAll('.match-container');
            
            oddsDescOptionsArray.forEach((dropdown)=>{
                dropdown.addEventListener('click', (event)=>{
                    const selectedValue = event.target.value;
                    const dropDownId = event.target.id.split('-').pop();

                    const parentElmnt = event.target.closest('.parent');
                    const oddDescShortcut = parentElmnt.querySelector(`#odds-desc-shortcut${dropDownId}`)
                
                    macthLinks.forEach((macthLink)=>{
                        const gameId = macthLink.getAttribute('data-match-id');
                        const game = data.find(g => g.match_id === gameId); 
                        if(!game) return;

                        const oddsDescContainer = macthLink.querySelector(`.odds-desc-container${dropDownId}`);
                        if (!oddsDescContainer) return;

            
                        // --- Core Helpers ---
                        // Safely get full info object for a market + selection
                        function getOddInfo(market, selection) {
                            if (
                                odds[market] &&
                                odds[market][selection]
                            ) {
                                return odds[market][selection]; // { odd, suspended, handicap }
                            }
                            return null;
                        }

                        // Display odd or fallback if suspended/missing
                        function displayOdd(market, selection) {
                            const info = getOddInfo(market, selection);
                            if (!info) return "-"; // market/selection not found
                            return !info.suspended ? info.odd : "-";
                        }
                        
                        switch(selectedValue){
                            case 'full-time-1X2':
                                oddDescShortcut.innerHTML = `<span>1</span><span>X</span><span class="me-3">2</span>`;
                                oddsDescContainer.setAttribute("data-market-type", "Match Winner");
                                oddsDescContainer.innerHTML = `
                                    <button class="odds-btn big-screen-odds-btn" data-prediction="1">${displayOdd("Match Winner", "1")}</button>
                                    <button class="mx-1 odds-btn big-screen-odds-btn" data-prediction="X">${getOdds('Match Winner', 'X')}</button >
                                    <button class="odds-btn big-screen-odds-btn" data-prediction="2">${getOdds('Match Winner', '2')}</button>`;
                                                            
                                break;

                            case 'over/under-2.5':
                                oddDescShortcut.innerHTML = `<span class="text-navy-blue">GOALS</span><span>OVER</span><span>UNDER</span>`;
                                oddsDescContainer.setAttribute("data-market-type", "Goals Over/Under");
                                oddsDescContainer.innerHTML = `
                                    <span class="w-31">
                                        <span class="line fw-bold">2.5</span>
                                    </span>
                                    <button class="odds-btn big-screen-odds-btn mx-1" data-prediction="over 2.5">${displayOdd("Goals Over/Under", "over 2.5")}</button>
                                    <button class="odds-btn big-screen-odds-btn" data-prediction="under 2.5">${displayOdd("Goals Over/Under", "under 2.5")}</button>`;
                                                        
                                break;

                            case 'over/under-1.5':
                                oddDescShortcut.innerHTML = `<span class="text-navy-blue">GOALS</span><span>OVER</span><span>UNDER</span>`;
                                oddsDescContainer.setAttribute("data-market-type", "Goals Over/Under");
                                oddsDescContainer.innerHTML = `
                                    <span class="w-31">
                                        <span class="line fw-bold">1.5</span>
                                    </span>
                                    <button class="odds-btn big-screen-odds-btn mx-1" data-prediction="over 1.5">${displayOdd("Goals Over/Under", "over 1.5")}</button>
                                    <button class="odds-btn big-screen-odds-btn" data-prediction="under 1.5">${displayOdd("Goals Over/Under", "under 1.5")}</button>`;
                                break;

                            case 'double-chance':
                                oddDescShortcut.innerHTML = `<span>1X</span><span>12</span><span class="me-3">X2</span>`;
                                oddsDescContainer.setAttribute("data-market-type", "Double Chance");
                                oddsDescContainer.innerHTML = `
                                    <button class="odds-btn big-screen-odds-btn " data-prediction="1X">${displayOdd("Double Chance", "1X")}</button>
                                    <button class="mx-1 odds-btn big-screen-odds-btn" data-prediction="12">${displayOdd("Double Chance", "12")}</button >
                                    <button class="odds-btn big-screen-odds-btn" data-prediction="X2">${displayOdd("Double Chance", "X2")}</button>`;
                                break;

                            case 'highest-scoring-half':
                                oddDescShortcut.innerHTML = `<span>FIRST</span><span class="mx-2">EQUAL</span><span>SECOND</span>`;
                                oddsDescContainer.setAttribute("data-market-type", "Highest Scoring Half");
                                oddsDescContainer.innerHTML = `
                                    <button class="odds-btn big-screen-odds-btn" data-prediction="1st">${displayOdd("Highest Scoring Half", "1st half")}</button>
                                    <button class="mx-1 odds-btn big-screen-odds-btn" data-prediction="Equal">${displayOdd("Highest Scoring Half", "X")}</button >
                                    <button class="odds-btn big-screen-odds-btn" data-prediction="2nd">${displayOdd("Highest Scoring Half", "2nd half")}</button>`;                          
                                break;

                            case 'first-half-1X2':
                                oddDescShortcut.innerHTML = `<span>1</span><span>X</span><span class="me-3">2</span>`;
                                oddsDescContainer.setAttribute("data-market-type", "First Half Winner");
                                oddsDescContainer.innerHTML = `
                                    <button class="odds-btn big-screen-odds-btn" data-prediction="1">${displayOdd("First Half Winner", "1")}</button>
                                    <button class="mx-1 odds-btn big-screen-odds-btn" data-prediction="X">${displayOdd("First Half Winner", "X")}</button >
                                    <button class="odds-btn big-screen-odds-btn" data-prediction="2">${displayOdd("First Half Winner", "2")}</button>`;                          
                                break;

                            case 'HT-over/under-1.5':
                                oddDescShortcut.innerHTML = `<span class="text-navy-blue">GOALS</span><span>OVER</span><span>UNDER</span>`;
                                oddsDescContainer.setAttribute("data-market-type", "Goals Over/Under 1st Half");
                                oddsDescContainer.innerHTML = `
                                    <span class="w-31">
                                        <span class="line fw-bold">1.5</span>
                                    </span>
                                    <button class="odds-btn big-screen-odds-btn mx-1" data-prediction="over 1.5">${displayOdd("Goals Over/Under 1st Half", "over 1.5")}</button>
                                    <button class="odds-btn big-screen-odds-btn" data-prediction="under 1.5">${displayOdd("Goals Over/Under 1st Half", "under 1.5")}</}</button>`;                         
                                break;

                            case 'second-half-1X2':
                                oddDescShortcut.innerHTML = `<span>1</span><span>X</span><span class="me-3">2</span>`;
                                oddsDescContainer.setAttribute("data-market-type", "Second Half Winner");
                                oddsDescContainer.innerHTML = `
                                    <button class="odds-btn big-screen-odds-btn" data-prediction="1">${displayOdd("Second Half Winner", "1")}</button>
                                    <button class="mx-1 odds-btn big-screen-odds-btn" data-prediction="X">${displayOdd("Second Half Winner", "X")}</button >
                                    <button class="odds-btn big-screen-odds-btn" data-prediction="2">${displayOdd("Second Half Winner", "2")}</button>`;                          
                                break;

                            case 'btts':
                                oddDescShortcut.innerHTML = `<span class="ms-5 ps-3">YES</span><span class="me-1">NO</span>`;
                                oddsDescContainer.setAttribute("data-market-type", "Both Teams To Score");
                                oddsDescContainer.innerHTML = `
                                    <span class="w-31">
                                        <span class="line fw-bold">bts</span>
                                    </span>
                                    <button class="odds-btn big-screen-odds-btn mx-1" data-prediction="yes">${displayOdd("Both Teams To Score", "yes")}</button>
                                    <button class="odds-btn big-screen-odds-btn" data-prediction="no">${displayOdd("Both Teams To Score", "no")}</button>`;                        
                                break;                                        
                        }
                    })
                })
            })
        })
    }

    
    
    function addSelection(selection) {
        // Remove old selection if exists
        betslipSelections = betslipSelections.filter(
            s => !(s.match_id === selection.match_id)
        );

        // Add new selection
        betslipSelections.push(selection);
       
        // Save to localStorage
        localStorage.setItem("betslipSelections", JSON.stringify(betslipSelections));
    }



    function removeSelection(matchId) {
        betslipSelections = betslipSelections.filter(
            s => !(s.match_id === matchId)
        );
        localStorage.setItem("betslipSelections", JSON.stringify(betslipSelections));
    }



    function removeAllSelectionsInLocalStorage() {
        // Clear the array
        betslipSelections = [];

        // Remove from localStorage
        localStorage.removeItem("betslipSelections");
    }


    function renderBetslip() {
        if (betslipSelections.length > 0) {
            gamesInATicket.innerHTML = ''; // clear container

            someGamesSelected.classList.remove('d-none');
            noGamesSelected.classList.add('d-none'); // hvuguli

            betslipSelections.forEach(sel => {
                const newGame = createGameElement(
                    sel.odds_value, sel.market_type,
                    sel.home_team, sel.away_team,
                    sel.prediction, sel.match_id,
                    sel.sport, sel.date_time,
                    sel.league_id, sel.country, sel.league
                );

                // A button for removing that match element on beslip
                const removeBtn = newGame.querySelector(".btn-close");
                removeBtn.addEventListener("click", function(){
                    newGame.remove();
                    removeSelection(sel.match_id);
                    numberOfSelectedGames.forEach(el => {
                        el.textContent = gamesInATicket.querySelectorAll(".selected-game").length || betslipSelections.length;
                    });

                    betslipSummaryCalculator();
                    const match = document.querySelector(`[data-match-id="${sel.match_id}"]`);
                    if(match){
                        const oddsBtn = match.querySelector('.odds-btn-active');
                        oddsBtn.classList.remove('odds-btn-active');
                    }
                    if(gamesInATicket.innerHTML == ''){
                        if(!someGamesSelected.classList.contains('d-none')){
                            someGamesSelected.classList.add('d-none');
                            noGamesSelected.classList.remove('d-none');
                        }
                    }
                });

                gamesInATicket.appendChild(newGame); 

            });

            numberOfSelectedGames.forEach(el => {
                el.textContent = gamesInATicket.querySelectorAll(".selected-game").length || betslipSelections.length;
            });

            betslipSummaryCalculator();
        } else {
            gamesInATicket.innerHTML = '';
            if(!someGamesSelected.classList.contains('d-none')){
                someGamesSelected.classList.add('d-none');
                noGamesSelected.classList.remove('d-none');
            }
            numberOfSelectedGames.forEach(el => {
                el.textContent = '0';
            });
        }
    }

    

    function activateOddsBtns() {
        // Get selections from localStorage (betslipSelections)

        betslipSelections.forEach(match => {
            // 1️⃣ Find the match container by match_id
            const matchElement = document.querySelector(`[data-match-id="${match.match_id}"]`);
            if (!matchElement) return; // Skip if match is not in the DOM

            // 2️⃣ Find the market container by market_type inside the match
            const marketContainer = matchElement.querySelector(`[data-market-type="${match.market_type}"]`);
            if (!marketContainer) return; // Skip if market is not in the DOM

            // 3️⃣ Find the button by prediction inside the market container
            const predictionButton = marketContainer.querySelector(`[data-prediction="${match.prediction}"]`);
            if (!predictionButton) return; // Skip if button not found

            // 4️⃣ Add the active class
            predictionButton.classList.add('odds-btn-active');
        });
    }


    if(gamesInATicket){
        renderBetslip();
        activateOddsBtns();
    }


});








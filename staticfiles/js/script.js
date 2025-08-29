const stakeInput = document.getElementById('input-stake');
const oddsBtns = document.querySelectorAll('.odds-btn');
const betslipContainer = document.querySelector('.betslip-container');
const noGamesSelected = document.getElementById('betslip-no-games-selected');
const someGamesSelected = document.getElementById('betslip-some-games-selected');
const gamesInATicket = document.querySelector('.games-in-a-ticket-list');
const gamesDisplay = document.getElementById('games-dipslay');
const oddsDescription = document.getElementById('odds-description');
const allEventsContainer = document.getElementById('all-events-container');
const gamesDisplayBtns = document.getElementById('games-display-btns');
const mainNavbar = document.getElementById('main-navbar');
const sportNavbar = document.getElementById('sport-navbar');
const moreOddsPage = document.getElementById('all-odds-page');
const filterGamesBy = document.getElementById('filter-games-by');
const livePage = document.getElementById('live-page');
const userBalance = document.getElementById('user_balance');
const limits = document.getElementById('limits');
const copyrightYear =  document.querySelectorAll('.copyright-year');
const minStakeDisplay = document.getElementById("min-stake-display");
const betslipForm = document.getElementById("betslip-form");
const numberOfSelectedGames = document.getElementById("numberOfSelectedGames");
const oddsChangeAlert = document.getElementById("odds-change-alert");
const acceptOddsBtn = document.getElementById("accept-odds-btn");
const placeBetBtn = document.getElementById("place-bet-btn");
const bookBetBtn = document.getElementById("book-bet-btn");
const spinner = document.createElement('div');
const path = window.location.pathname;
let successModal, bookingModal, currencySymbol, data, Sportleagues, functionName, dropDownName, oddsDescName ;
let currentSport = 'football';      
const now = new Date();

document.addEventListener('DOMContentLoaded', function(){
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
    currencySymbol = limits.dataset.currencySymbol;
}

spinner.className = 'text-center my-5 p-5';
spinner.innerHTML = `
    <div class="spinner-border text-aqua" " role="status">
        <span class="visually-hidden">Loading...</span>
    </div>
`;


document.addEventListener('DOMContentLoaded', function(){
    if(window.location.pathname.includes('/sports/')){
        fetchGamesBySport(currentSport);
    }
})


if(copyrightYear){
    copyrightYear.forEach(cprty => {
        cprty.className = 'text-white text-center';
        cprty.innerHTML = `&copy; Moxbet ${now.getFullYear()} all rights reserverd.`;
    })
}

if(gamesInATicket && gamesInATicket.innerHTML == ''){
    someGamesSelected.classList.add('d-none');
}


if(document.getElementById("successModal")){
    successModal = new bootstrap.Modal(document.getElementById("successModal"));
}


if(document.getElementById("bookingModal")){
    bookingModal = new bootstrap.Modal(document.getElementById("bookingModal"));
}


if(limits && stakeInput){
    const minStake = parseFloat(limits.dataset.minStake);
    if(minStake && currencySymbol){
        minStakeDisplay.textContent = `${currencySymbol} ${minStake}`;
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
            body: JSON.stringify({ selections }), //JSON.stringify({ selections })
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching updated odds:", error);
        return { updated_selections: selections };
    }
}


// Function to Create Bet Item
function createGameElement(oddsValue, marketType, homeTeam, awayTeam, time, date, prediction, matchId, sport, datetime, leagueId, country, league) {
    
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
            <div class="text-small"><span class="text-yellow">${date}</span> ${time}</div>
        </div>
        <div class="col-2 text-center">
            <button class="btn-close" type="button" aria-label="Close"></button>
        </div>
    `;

    const closeBtn = li.querySelector(".btn-close");
    closeBtn.addEventListener("click", function(){
        li.remove();
        numberOfSelectedGames.textContent = gamesInATicket.querySelectorAll(".selected-game").length;
        const match = allEventsContainer.querySelector(`[data-match-id="${matchId}"]`);
        
        if(match){
            const oddsBtn = match.querySelector('.odds-btn-active').classList.remove('odds-btn-active')
        }
        if(gamesInATicket.innerHTML == ''){
            if(!someGamesSelected.classList.contains('d-none')){
                someGamesSelected.classList.add('d-none');
            }
            if(noGamesSelected.classList.contains('d-none')){
                noGamesSelected.classList.remove('d-none');
            }
        }
        betslipSummaryCalculator();
    });

    return li;   
}


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
        betslipSummaryCalculator();
    })
}

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
                selections = data.updated_selections;

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
                    const dt = new Date(datetime);

                    const day = dt.getDate().toString().padStart(2, '0');
                    const month = (dt.getMonth() + 1).toString().padStart(2, '0');
                    const year = dt.getFullYear().toString().slice(-2);
                    const date = `${day}/${month}/${year}`;

                    const hours = dt.getHours().toString().padStart(2, '0');
                    const minutes = dt.getMinutes().toString().padStart(2, '0')
                    const time = `${hours}:${minutes}`;

                    const newGame = createGameElement(oddsValue, marketType, homeTeam, awayTeam, date, time, prediction, matchId, sport, datetime, leagueId, country, league);

                    
                    

                    // const activeBtns = matchContainer.querySelectorAll('.odds-btn-active');
                    // if(activeBtns){
                    //     activeBtns.forEach(btn=>{
                    //         btn.classList.remove('odds-btn-active');
                    //     })
                    // }
                    
                    // if(!button.classList.contains('odds-btn-active')){
                    //     button.classList.add('odds-btn-active');
                    // }

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
                        
                        const containers = gamesDisplay.querySelectorAll(`[data-match-id="${matchId}"]`);
                        
                        containers.forEach(container =>{
                                                                            
                            const buttons = container.querySelectorAll(`[data-prediction="${prediction}"]`);
                            if(buttons){
                                buttons.forEach(btn => {
                                    const mk_type = btn.closest('[data-market-type]');
                                    if(mk_type && mk_type.getAttribute('data-market-type') === marketType){
                                        const activeBtns = mk_type.querySelectorAll('.odds-btn-active');
                                        activeBtns.forEach(btn => {
                                            btn.classList.remove('odds-btn-active');
                                        });
                                        btn.classList.add('odds-btn-active');
                                    }
                                })

                            }
                            
                        });                        
                    }

                    numberOfSelectedGames.textContent = gamesInATicket.querySelectorAll(".selected-game").length;
                    betslipSummaryCalculator();
                
                })
                
            }else{
            }
        })
        .catch(error =>{
            console.log(error)
        })
    })
} 

document.addEventListener('DOMContentLoaded', function(){
    if(livePage && window.location.pathname.includes('/live/')){
        let chosenSport = 'football'
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
})


// Handle Clicking on Odds Button
if(gamesDisplay){
    gamesDisplay.addEventListener("click", function (event) {
        if (event.target.classList.contains("odds-btn")) {
            event.preventDefault();
            event.stopPropagation();
            
            if(someGamesSelected.classList.contains('d-none')){
                someGamesSelected.classList.remove('d-none');
                noGamesSelected.classList.add('d-none');
            }
        
            const button = event.target;
            const oddsValue = button.textContent;
            if (oddsValue) {
                const matchContainer = button.closest(".match-link");
                const marketType = button.closest('[data-market-type]').getAttribute("data-market-type");
                const selectedGames = gamesInATicket.querySelectorAll(".selected-game");
                const homeTeam = matchContainer.querySelector("[data-home-team]").getAttribute("data-home-team");
                const awayTeam = matchContainer.querySelector("[data-away-team]").getAttribute("data-away-team");
                const datetime = matchContainer.querySelector("[data-datetime]").getAttribute('data-datetime');
                const leagueId = matchContainer.querySelector("[data-league-id]").getAttribute('data-league-id');
                const date = matchContainer.querySelector("[data-date]").getAttribute("data-date");
                const time = matchContainer.querySelector("[data-match-time]").getAttribute("data-match-time");
                const matchId = matchContainer.querySelector("[data-match-id]").getAttribute("data-match-id");
                const country = matchContainer.querySelector("[data-country]").getAttribute("data-country");
                const league = matchContainer.querySelector("[data-league]").getAttribute("data-league");
                const sport = matchContainer.querySelector("[data-sport]").getAttribute("data-sport");
                const prediction = button.getAttribute("data-prediction");

               
                const newGame = createGameElement(oddsValue, marketType, homeTeam, awayTeam, date, time, prediction, matchId, sport, datetime, leagueId, country, league);

                const activeBtns = matchContainer.querySelectorAll('.odds-btn-active');
                if(activeBtns){
                    activeBtns.forEach(btn=>{
                        btn.classList.remove('odds-btn-active');
                    })
                }
                
                if(!button.classList.contains('odds-btn-active')){
                    button.classList.add('odds-btn-active');
                }

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
            }
        }
        // if(event.target.classList.contains('prediction')){
        //     event.preventDefault();
        //     event.stopPropagation();

        //     if(someGamesSelected.classList.contains('d-none')){
        //         someGamesSelected.classList.remove('d-none');
        //         noGamesSelected.classList.add('d-none');
        //     }
        
        //     const option = event.target;
        //     const button = option.closest('.odds-btn');
        //     const oddsValue = button.querySelector('.odds-value').textContent;
        //     if (oddsValue) {
        //         const matchContainer = button.closest(".match-link");
        //         const marketType = button.closest('[data-market-type]').getAttribute("data-market-type");
        //         const selectedGames = gamesInATicket.querySelectorAll(".selected-game");
        //         const homeTeam = matchContainer.querySelector("[data-home-team]").getAttribute("data-home-team");
        //         const awayTeam = matchContainer.querySelector("[data-away-team]").getAttribute("data-away-team");
        //         const datetime = matchContainer.querySelector("[data-datetime]").getAttribute("data-datetime");
        //         const leagueId = matchContainer.querySelector("[data-league-id]").getAttribute("data-league-id");
        //         const date = matchContainer.querySelector("[data-date]").getAttribute("data-date");
        //         const time = matchContainer.querySelector("[data-match-time]").getAttribute("data-match-time");
        //         const matchId = matchContainer.querySelector("[data-match-id]").getAttribute("data-match-id");
        //         const sport = matchContainer.querySelector("[data-sport]").getAttribute("data-sport");
        //         const option = button.getAttribute("data-option");

        //         const newGame = createGameElement(oddsValue, marketType, homeTeam, awayTeam, date, time, option, matchId, sport, datetime, leagueId);

        //         const activeBtns = matchContainer.querySelectorAll('.odds-btn-active');
        //         if(activeBtns){
        //             activeBtns.forEach(btn=>{
        //                 btn.classList.remove('odds-btn-active');
        //             })
        //         }
                
        //         if(!button.classList.contains('odds-btn-active')){
        //             button.classList.add('odds-btn-active');
        //         }

        //         let matchFound = false;
        //         selectedGames.forEach((game) => {
        //             if (game.classList.contains(matchId)) {
        //                 game.remove();
        //                 gamesInATicket.appendChild(newGame);
        //                 matchFound = true;
        //             }
        //         });

        //         if (!matchFound) {
        //             gamesInATicket.appendChild(newGame);
        //         }

        //         numberOfSelectedGames.textContent = gamesInATicket.querySelectorAll(".selected-game").length;
        //         betslipSummaryCalculator();

        //     }

        // }
    });
}

async function  WinBoost(number_of_games, totalOdds, stakeAmount){
    const res = await fetch(`/win-boost/?number_of_selections=${number_of_games}`);
    const data = await res.json();
    return  Number((data.win_boost_percentage) * (totalOdds * stakeAmount)).toFixed(2);
}


// Calculate Betslip Summary
function betslipSummaryCalculator() {
    let totalOdds = 1.0, win_boost=0.00, stakeAmount = parseFloat(stakeInput.value || 0).toFixed(2), selections = [];

    let prevSelectionsLength = selections.lenth;

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
        const marketType = selection.querySelector('[data-market-type]').getAttribute('data-market-type');
        const oddsValue = parseFloat(selection.querySelector('[data-odds-value]').getAttribute('data-odds-value')).toFixed(2);
        selections.push({ match_id: matchId, home_team: homeTeam, away_team: awayTeam, market_type: marketType, prediction: prediction, match_odds: oddsValue, sport: sport, status: 'Pending', date_time: datetime, league_id: leagueId, country: country, league: league });
        totalOdds *= parseFloat(oddsValue).toFixed(2); 
    });

    if(selections.length !== prevSelectionsLength){
        WinBoost(selections.length, totalOdds, stakeAmount).then(boost => {
            win_boost = boost;
            // document.getElementById("win_boost").textContent = win_boost;
            
            document.getElementById("total_odds").textContent = totalOdds.toFixed(2);
            document.getElementById("win_boost").textContent = win_boost;
            document.getElementById("potential_win").textContent = (Number(win_boost) + (Number(totalOdds) * Number(stakeAmount))).toFixed(2);

            document.getElementById("selections").value = JSON.stringify(selections);
            document.getElementById("total-odds").value = totalOdds.toFixed(2) || 1;
            document.getElementById("bet-type").value = getFirstPathSegment();
            document.getElementById("win-boost").value = win_boost || 0;
            document.getElementById("potential-win").value = (Number(win_boost) + (stakeAmount * totalOdds)).toFixed(2) || 1;
        });
        
        prevSelectionsLength = selections.length;
    }
   

    function getFirstPathSegment(){
        const path = window.location.pathname;
        const segments = path.replace(/^\/|\/$/g, '').split('/')
        return (segments[0] || '').trim().toLowerCase()
    }

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
        if(clickedButton.value === "place"){
            this.action = placeBetUrl;
            placeBetBtn.disabled = true;
            placeBetBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Placing Bet...';
            
            try {
                let selections = JSON.parse(document.getElementById("selections").value);
                let response = await fetchUpdatedOdds(selections);
                let hasChanges = false;

                // Check for odds changes
                document.querySelectorAll(".selected-game").forEach((selection, index) => {
                    let newOdds = response.updated_selections[index].match_odds;
                    if (parseFloat(selection.querySelector("#odds-value").textContent) !== newOdds) {
                        selection.querySelector("#odds-value").textContent = newOdds;
                        hasChanges = true;
                    }
                });

                if (hasChanges) {  
                    oddsChangeAlert.classList.remove("d-none");
                    return; // Wait for user to accept changes
                }

                // Proceed with bet placement
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
                    // Update balance display if you add it to response
                    if (data.new_balance) {
                        updateBalanceDisplay(data.new_balance);
                    }
                    
                    // Show success modal
                    document.getElementById("user_balance").textContent = `${data.user_balance}`;
                    document.getElementById("ticket-id").textContent = data.ticket_id;
                    document.getElementById("ticket-stake").textContent = `${data.currency_symbol}${data.stake}`;
                    document.getElementById("ticket-potential-win").textContent = `${data.currency_symbol}${data.potential_win}`;
                    successModal.show();
                    
                    // Clear betslip
                    gamesInATicket.innerHTML = '';

                    // deactivate all active oddsbutons
                    const activeBtns = document.querySelectorAll('.odds-btn-active');
                    activeBtns.forEach(btn=>{
                        btn.classList.remove('odds-btn-active');
                    })

                    if(noGamesSelected.classList.contains('d-none')){
                        noGamesSelected.classList.remove('d-none')
                        if(!someGamesSelected.classList.contains('d-none')){
                            someGamesSelected.classList.add('d-none');
                            numberOfSelectedGames.textContent = '0';
                            stakeInput.value = '';
                        }
                    }
                    
                } else {
                    showErrorAlert(data.message || "Failed to place bet");
                }

            } catch (error) {
                console.error("Error:", error);
                showErrorAlert("An error occurred while placing your bet");
            } finally {
                placeBetBtn.disabled = false;
                placeBetBtn.textContent = "Place Bet";
            }
        }
        else if(clickedButton.value === "book"){
            this.action = bookBetUrl;
            bookBetBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Booking Bet...';
            
            try {
                let selections = JSON.parse(document.getElementById("selections").value);
                let response = await fetchUpdatedOdds(selections);
                let hasChanges = false;

                // Check for odds changes
                document.querySelectorAll(".selected-game").forEach((selection, index) => {
                    let newOdds = response.updated_selections[index].match_odds;
                    if (parseFloat(selection.querySelector("#odds-value").textContent) !== newOdds) {
                        selection.querySelector("#odds-value").textContent = newOdds;
                        hasChanges = true;
                    }
                });

                if (hasChanges) {  
                    oddsChangeAlert.classList.remove("d-none");
                    return; // Wait for user to accept changes
                }

                // Proceed with bet placement
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
                    
                    // Show booking modal
                    document.getElementById("booking-code").textContent = data.booking_code;
                    bookingModal.show();
                    // window.alert('Bet booked');
                    
                    // Clear betslip
                    gamesInATicket.innerHTML = '';

                    // deactivate all active oddsbutons
                    const activeBtns = document.querySelectorAll('.odds-btn-active');
                    activeBtns.forEach(btn=>{
                        btn.classList.remove('odds-btn-active');
                    })

                    if(noGamesSelected.classList.contains('d-none')){
                        noGamesSelected.classList.remove('d-none')
                        if(!someGamesSelected.classList.contains('d-none')){
                            someGamesSelected.classList.add('d-none');
                            numberOfSelectedGames.textContent = '0';
                            stakeInput.value = '';
                        }
                    }
                    
                } else {
                    showErrorAlert(data.message || "Failed to book bet");
                }

            } catch (error) {
                console.error("Error:", error);
                showErrorAlert("An error occurred while booking your bet");
            } finally {
                bookBetBtn.textContent = "Book Bet";
            }            

        }
    });

    function updateBalanceDisplay(newBalance) {
        const balanceElement = document.getElementById("user-balance");
        if (balanceElement) {
            // Add animation to highlight balance change
            balanceElement.textContent = newBalance;
            balanceElement.classList.add("balance-update-highlight");
            setTimeout(() => {
                balanceElement.classList.remove("balance-update-highlight");
            }, 1000);
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
        }, 5000);
    }

    // Add this handler for accepting odds changes
    acceptOddsBtn.addEventListener("click", async function() {
        oddsChangeAlert.classList.add("d-none");
        
        try {
            const formData = new FormData(betslipForm);
            const response = await fetch(betslipForm.action, {
                method: "POST",
                body: formData,
                headers: {
                    "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value,
                    "X-Requested-With": "XMLHttpRequest"
                }
            });

            const data = await response.json();
            
            if (data.success) {
                document.getElementById("ticket-id").textContent = data.ticket_id;
                successModal.show();
                
                // Clear betslip
                gamesInATicket.innerHTML = '';
                numberOfSelectedGames.textContent = '0';
                stakeInput.value = '';
            } else {
                showErrorAlert(data.message || "Failed to place bet");
            }
        } catch (error) {
            console.error("Error:", error);
            showErrorAlert("An error occurred while placing your bet");
        }
    });
}


document.addEventListener('DOMContentLoaded', function(){
    if(moreOddsPage && window.location.pathname.includes('/more-odds/')){

        moreOddsPage.addEventListener("click", function (event) {

            if(event.target.classList.contains('filter-odds-by')){
                const selectedFilter = event.target;
                if(!selectedFilter.classList.contains('br-and-b-aqua')){
                    selectedFilter.classList.add('br-and-b-aqua');
                }
                Array.from(moreOddsPage.querySelectorAll('.filter-odds-by')).forEach(filter =>{
                    if(filter != selectedFilter){
                        if(filter.classList.contains('br-and-b-aqua')){
                            filter.classList.remove('br-and-b-aqua');
                        }
                    }
                })
            }

            if (event.target.classList.contains("odds-btn")) {
                
                if(someGamesSelected.classList.contains('d-none')){
                    someGamesSelected.classList.remove('d-none');
                    noGamesSelected.classList.add('d-none');
                }
            
                const button = event.target;
                const oddsValue = button.querySelector('.odds-value').textContent;
                if (oddsValue) {
                    // const matchContainer = button.closest(".match-link");
                    const marketType = button.closest('[data-market-type]').getAttribute("data-market-type");
                    const selectedGames = gamesInATicket.querySelectorAll(".selected-game");
                    const homeTeam = moreOddsPage.querySelector("[data-home-team]").getAttribute("data-home-team");
                    const awayTeam = moreOddsPage.querySelector("[data-away-team]").getAttribute("data-away-team");
                    const datetime = moreOddsPage.querySelector("[data-datetime]").getAttribute('data-datetime');
                    const leagueId = moreOddsPage.querySelector("[data-league-id]").getAttribute('data-league-id');
                    const date = moreOddsPage.querySelector("[data-date]").getAttribute("data-date");
                    const time = moreOddsPage.querySelector("[data-match-time]").getAttribute("data-match-time");
                    const matchId = moreOddsPage.querySelector("[data-match-id]").getAttribute("data-match-id");
                    const country = moreOddsPage.querySelector("[data-country]").getAttribute("data-country");
                    const league = moreOddsPage.querySelector("[data-league]").getAttribute("data-league");
                    const sport = moreOddsPage.querySelector("[data-sport]").getAttribute("data-sport");
                    const prediction = button.getAttribute("data-prediction");
                
                    const newGame = createGameElement(oddsValue, marketType, homeTeam, awayTeam, date, time, prediction, matchId, sport, datetime, leagueId, country, league);

                    const activeBtns = moreOddsPage.querySelectorAll('.odds-btn-active');
                    if(activeBtns){
                        activeBtns.forEach(btn=>{
                            btn.classList.remove('odds-btn-active');
                            btn.querySelector('.prediction').classList.remove('text-black')
                        })
                    }
                    
                    if(!button.classList.contains('odds-btn-active')){
                        button.classList.add('odds-btn-active');
                        const predictionLabel = button.querySelector('.prediction');
                        predictionLabel.classList.add('text-black')
                    }

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
                }
            }
        });
    }
})

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


async function fetchGamesBySport(sport, page = 1) {
    gamesDisplay.appendChild(spinner);

    let url = `/api/fetch-games/?sport=${sport}&page=${page}`;

    let functionName = `${sport}MatchElementInnerHTML`;
    let dropDownName = `${sport}OddsDropdowns`;  
    let oddsDescName = `${sport}OddsDescription`;  
    
    try {
        let response = await fetch(url);
        let combinedData = await response.json();

        // Extract games, topLeagues, highlights
        data = combinedData.games || [];
        let topLeagues = combinedData.top_leagues || [];
        Sportleagues = combinedData.leagues || {}; 
        let highlightGames = combinedData.highlight_games || [];
        let totalMatches = combinedData.total_matches || 0;

        
        // --- Highlight Games ---
        const highlightGamesContainer = document.getElementById('highlist-games-container');
        if (highlightGamesContainer) {
            if (highlightGames.length === 0) {
                highlightGamesContainer.innerHTML = '';
            } else {
                highlightGamesContainer.innerHTML = `
                    <hr class="text-yellow mb-0">
                    <ul id="highlist-games-list"></ul>`;
                const highlightGamesList = document.getElementById('highlist-games-list');

                highlightGames.forEach(game => {
                    const {match_id, country, league, extras} = game;

                    const highlightGame = document.createElement('li');
                    highlightGame.className = 'highlist-game col-12 text-truncate';

                    const matchlink = document.createElement('a');
                    matchlink.href = `/more-odds/?sport=${sport}&match_id=${match_id}`;
                    matchlink.className = `match-link text-decoration-none text-white`;
                    matchlink.innerHTML = `
                        <div class="text-small text-truncate" style="margin-bottom: -5px;">
                            ${country}&nbsp;${league.name}
                        </div>
                        <div class="text-truncate">
                            ${extras.teams?.home?.name} <span class="text-yellow">vs</span> ${extras.teams?.away?.name}
                        </div>
                        <hr class="my-1 text-yellow">`;

                    highlightGame.appendChild(matchlink);
                    highlightGamesList.appendChild(highlightGame);
                });
            }
        }

        // --- Top Leagues (accordion) ---
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
                const topLigItem = document.createElement('a');
                topLigItem.className = 'col-4 col-sm-3 text-decoration-none top-league-item m-1';
                topLigItem.innerHTML = `
                    <div class="card" data-league-id="${topLig.id}" data-country="${topLig.country}" data-league="${topLig.league}">
                        <div class="card-body row g-0 d-flex justify-content-between align-items-center px-2 py-0">
                            <div class="col-11">
                                <div class="card-titte text-truncate text-small fw-bold" style="margin-bottom: -5px;">${topLig.league}</div>
                                <div class="card-text text-truncate text-small">🤣 ${topLig.country}</div>
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
        if(gamesDisplay){
            if (data.length > 0) {
                if(page === 1){
                    Array.from(gamesDisplay.children).forEach(child=>{
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
                        window[functionName](game, `${sport}`, gamesDisplay);
                    }
                });

                if(typeof window[dropDownName] === "function"){
                    window[dropDownName](data, [gamesDisplay]);
                }

                // --- Add Load More button if there are more matches ---
                const loadedGamesCount = page * 100;
                if(totalMatches > loadedGamesCount){
                    let loadMoreBtn = document.getElementById(`${sport}-load-more`);
                    if(!loadMoreBtn){
                        loadMoreBtn = document.createElement('button');
                        loadMoreBtn.id = `${sport}-load-more`;
                        loadMoreBtn.className = 'btn btn-warning my-2 mx-auto';
                        loadMoreBtn.innerText = 'Load More';
                        gamesDisplay.appendChild(loadMoreBtn);
                    }

                    loadMoreBtn.onclick = function(){
                        loadMoreBtn.remove();
                        fetchGamesBySport(sport, page + 1);
                    }
                }

            } else {
                Array.from(gamesDisplay.children).forEach(child =>{
                    if(child != oddsDescription){
                        child.remove();
                    }
                });
                oddsDescription.innerHTML = '';
                const message = document.createElement('div');
                message.innerHTML = `<p class="text-center text-aqua py-5">No matches found for ${sport}.</p>`;
                gamesDisplay.appendChild(message);

                // remove after 30 seconds
                // setTimeout(() => {
                // if (message.parentNode) {
                //     message.remove();
                // }
                // }, 30000);
            }  
        }   

    } catch (error) {
        console.error("Error fetching games:", error);
    } finally {
        if(spinner.parentNode) spinner.parentNode.removeChild(spinner);
    }
}

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
            updateLiveOddsOnPage(data, currentSport);
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



document.addEventListener("DOMContentLoaded", () => {
    initLiveOddsWebSocket(`${currentSport}`);
});


function updateLiveOddsOnPage(matchPayload, currentSport) {
    console.log(`Match payload:`, matchPayload)
    const matchId = matchPayload.match_id;
    const matchEl = document.querySelector(`[data-match-id="${matchId}"]`);
    if (!matchEl) return;

    // convert to local date and time
    let dateObj = new Date(matchPayload.datetime);

    let date = dateObj.toLocaleDateString("en-GB");
    let time = dateObj.toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit"});

    const times = matchEl.querySelectorAll(`[data-match-time="${time}"]`);
    const dates = matchEl.querySelectorAll(`[data-match-date="${date}"]`);
    if (!times) return;
    if (!dates) return;

    times.forEach(t =>{
        t.innerText = `${matchPayload.status.elapsed}`;
    })

    dates.forEach(d =>{
        d.innerText = `${ `Live ${matchPayload.status.short}`}`;
    })

    // Iterate through updated odds
    matchPayload.odds.forEach(market => {
        const marketType = market.market_type;
        const oddsData = market.odds;
        const suspendedData = market.suspended;

        // Find the corresponding container/button
        const oddsContainers = matchEl.querySelectorAll(`[data-market-type="${marketType}"]`);
        if (!oddsContainers) return;
        oddsContainers.forEach(cont => {
            cont.querySelectorAll(".odds-btn").forEach(btn => {
                const prediction = btn.dataset.prediction; // e.g., 'home', 'draw', 'away'
                // console.log(`prediction: ${prediction}, odds: ${oddsData[prediction.toLowerCase()]}`)
                if (oddsData[prediction.toLowerCase()]) {
                    console.log('odds found and inserted')
                    btn.innerText = `${oddsData[prediction.toLowerCase()]}`;
                    if(matchId === 1447008){
                        console.log(`prediction: ${prediction}, odds: ${oddsData[prediction.toLowerCase()]}`)
                    }
                    if (suspendedData && suspendedData[prediction.toLowerCase()]) {
                        btn.disabled = true;
                        btn.classList.add("text-muted");
                    } else {
                        btn.disabled = false;
                        btn.classList.remove("text-muted");
                    }
                }
            });
        })

        
    });
}




async function fetchLiveGamesBySport(sport, page = 1) {
    const gamesDisplay = livePage.querySelector('#games-display');
    const oddsDescription = livePage.querySelector('#odds-description');
    const sportsRaw = livePage.querySelector('#sports-row');

    gamesDisplay.appendChild(spinner);

    let url = `/fetch-live-games/?sport=${sport}&page=${page}`;

    let functionName = `${sport}MatchElementInnerHTML`;
    let dropDownName = `${sport}OddsDropdowns`;  
    let oddsDescName = `${sport}OddsDescription`;  
    
    try {
        let response = await fetch(url);
        let Data = await response.json();

        data = Data.games;
        
        // Update games display
        if(gamesDisplay){
            if (data && data.length > 0) {
                Array.from(gamesDisplay.children).forEach(child=>{
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
                        window[functionName](game, `${sport}`, gamesDisplay);
                    }
                    else{
                        console.log(`${functionName} does not exist`);
                    }
                });
                
                if(typeof window[dropDownName] === "function"){
                    window[dropDownName](data, [gamesDisplay]);
                }

            }
            else {
                Array.from(gamesDisplay.children).forEach(child =>{
                    if(child != oddsDescription && child != sportsRaw){
                        child.remove();
                    }
                });
                oddsDescription.innerHTML = '';
                const message = document.createElement('div');
                message.innerHTML = `<p class="text-center text-aqua py-5">No live ${sport} games found.</p>`;
                gamesDisplay.appendChild(message);
            }  
        }   
    }
    catch (error) {
        console.error("Error fetching games:", error);
    }
}


function footballOddsDescription(container){
    container.innerHTML = `   
                                    <div class="col-6 col-md-4 col-lg-3">
                                        <div class="text-center filter-games-by-parent">
                                            <select id="filter-games-by" class="filter-games-by form-select bg-sky-blue rounded-0 text-small">
                                                <option class="prediction" value="Upcoming">Upcoming</option>
                                                <option class="prediction" value="Leagues">Leagues</option>
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
                        Array.from(gamesDisplay.children).forEach(child=>{
                            if(child != oddsDescription){
                                child.remove();
                            }
                        })

                        UpcomingMatches.forEach(match => {
                            if(typeof window[functionName] === "function"){
                                window[functionName](match, currentSport, gamesDisplay);
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
                        
                        Array.from(gamesDisplay.children).forEach(child=>{
                            if(child != oddsDescription){
                                child.remove();
                            }
                        })

                        const message = document.createElement('div')
                        message.innerHTML =  `<div class="text-center py-5 text-aqua"><p>No upcoming games found.</p></div>`;
                        gamesDisplay.appendChild(message);
                    }

                    break;

                case 'Leagues':
                    showLeaguesModal();
                    break;

                case 'Next-hour':
                    function NextHour(element){
                        const currentDate = now.toISOString().split("T")[0];
                        const currentTime = now.getHours()*60 + now.getMinutes();
                        
                        const commenceDate = element.datetime.split("T")[0];
                        const commenceTimeStr = element.datetime.split("T")[1].slice(0, 5);

                        const [hh, mm] = commenceTimeStr.split(":").map(Number);
                        const commenceTime = hh * 60 + mm;

                        return commenceDate === currentDate && commenceTime - currentTime > 0 && commenceTime - currentTime <= 60;
                    }

                    const nextHour = data.filter(NextHour);
                    
                    if(nextHour.length > 0 ){
                        Array.from(gamesDisplay.children).forEach(child=>{
                            if(child != oddsDescription){
                                child.remove();
                            }
                        })

                        nextHour.forEach(match => {
                            if(typeof window[functionName] === "function"){
                                window[functionName](match, currentSport, gamesDisplay);
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
                        
                        Array.from(gamesDisplay.children).forEach(child=>{
                            if(child != oddsDescription){
                                child.remove();
                            }
                        })

                        const message = document.createElement('div')
                        message.innerHTML =  `<div class="text-center py-5 text-aqua"><p>No ${currentSport} games in the next hour.</p></div>`;
                        gamesDisplay.appendChild(message);
                    }
                    break;

                case 'Next-3-hours':
                    function Next3Hours(element){
                        const currentDate = now.toISOString().split("T")[0];
                        const currentTime = now.getHours()*60 + now.getMinutes();
                        
                        const commenceDate = element.datetime.split("T")[0];
                        const commenceTimeStr = element.datetime.split("T")[1].slice(0, 5);

                        const [hh, mm] = commenceTimeStr.split(":").map(Number);
                        const commenceTime = hh * 60 + mm;

                        return commenceDate === currentDate && commenceTime - currentTime > 0 && commenceTime - currentTime <= 180;
                    }

                    const next3Hours = data.filter(Next3Hours);
                    
                    if(next3Hours.length > 0 ){
                        Array.from(gamesDisplay.children).forEach(child=>{
                            if(child != oddsDescription){
                                child.remove();
                            }
                        })

                        next3Hours.forEach(match => {
                            if(typeof window[functionName] === "function"){
                                window[functionName](match, currentSport, gamesDisplay);
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
                        
                        Array.from(gamesDisplay.children).forEach(child=>{
                            if(child != oddsDescription){
                                child.remove();
                            }
                        })

                        const message = document.createElement('div')
                        message.innerHTML =  `<div class="text-center py-5 text-aqua"><p>No ${currentSport} games in the next 3 hours.</p></div>`;
                        gamesDisplay.appendChild(message);
                    }
                    break;

                case 'Next-5-hours':
                    function Next5Hours(element){
                        const currentDate = now.toISOString().split("T")[0];
                        const currentTime = now.getHours()*60 + now.getMinutes();
                        
                        const commenceDate = element.datetime.split("T")[0];
                        const commenceTimeStr = element.datetime.split("T")[1].slice(0, 5);

                        const [hh, mm] = commenceTimeStr.split(":").map(Number);
                        const commenceTime = hh * 60 + mm;

                        return commenceDate === currentDate && commenceTime - currentTime > 0 && commenceTime - currentTime <= 300;
                    }

                    const next5Hours = data.filter(Next5Hours);
                    
                    if(next5Hours.length > 0 ){
                        Array.from(gamesDisplay.children).forEach(child=>{
                            if(child != oddsDescription){
                                child.remove();
                            }
                        })

                        next5Hours.forEach(match => {
                            if(typeof window[functionName] === "function"){
                                window[functionName](match, currentSport, gamesDisplay);
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
                        
                        Array.from(gamesDisplay.children).forEach(child=>{
                            if(child != oddsDescription){
                                child.remove();
                            }
                        })

                        const message = document.createElement('div')
                        message.innerHTML =  `<div class="text-center py-5 text-aqua"><p>No ${currentSport} games in the next 5 hours.</p></div>`;
                        gamesDisplay.appendChild(message);
                    }
                    break;

                case 'Today':
                    function Today(element){
                        const currentDate = now.toISOString().split("T")[0];
                        const commenceDate = element.datetime.split("T")[0];

                        return commenceDate === currentDate;
                    }

                    const today = data.filter(Today);
                    
                    if(today.length > 0 ){
                        Array.from(gamesDisplay.children).forEach(child=>{
                            if(child != oddsDescription){
                                child.remove();
                            }
                        })
                        
                        today.forEach(match => {
                            if(typeof window[functionName] === "function"){
                                window[functionName](match, currentSport, gamesDisplay);
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
                        
                        Array.from(gamesDisplay.children).forEach(child=>{
                            if(child != oddsDescription){
                                child.remove();
                            }
                        })

                        const message = document.createElement('div')
                        message.innerHTML =  `<div class="text-center py-5 text-aqua"><p>No ${currentSport} games for today.</p></div>`;
                        gamesDisplay.appendChild(message);
                    }
                    break;

                case 'Tomorrow':
                    function Tomorrow(element){
                        const tomorrow = new Date(now);
                        tomorrow.setDate(now.getDate() + 1);
                        const tomorrowsDate = tomorrow.toISOString().split("T")[0]
                        const commenceDate = element.datetime.split("T")[0];

                        return commenceDate === tomorrowsDate;
                    }
                    const tomorrow = data.filter(Tomorrow);
                    
                    if(tomorrow.length > 0 ){
                        Array.from(gamesDisplay.children).forEach(child=>{
                            if(child != oddsDescription){
                                child.remove();
                            }
                        })

                        tomorrow.forEach(match => {                                                           
                            if(typeof window[functionName] === "function"){
                                window[functionName](match, currentSport, gamesDisplay);
                            }
                            else{
                                console.log(`${functionName} does not exist`);
                            }
                        }); 

                        if(typeof window[dropDownName] === "function"){
                            window[dropDownName](data, gamesDisplay);
                        }
                        else{
                            console.log(`${dropDownName} does not exist`);
                        }
                    } 
                    else{
                        Array.from(gamesDisplay.children).forEach(child=>{
                            if(child != oddsDescription){
                                child.remove();
                            }
                        })

                        const message = document.createElement('div')
                        message.innerHTML =  `<div class="text-center py-5 text-aqua"><p>No ${currentSport} games found for tomorrow.</p></div>`;
                        gamesDisplay.appendChild(message);
                    }
                    break;
            }
        });
    }
}


async function fetchGamesByLeagues(leagueIds) {
    try {
        // Fetch games data
        const url = `/api/fetch-leagues/?league_ids=${leagueIds}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const { data: games = [] } = await response.json();

        // Handle empty results
        if (!games.length) {
            window.alert('No games found for selected leagues');
            return;

        }else{
            Array.from(gamesDisplay.children).forEach(child =>{
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
                    gamesDisplay.appendChild(accordionWrapper);
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

            let dropDownName = `${sport}OddsDropdowns`;  
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
        gamesDisplay.innerHTML = `
            <div class="alert alert-danger">
                Failed to load games. Please try again later.
            </div>`;
    }
}


async function fetchMoreOdds() {
    const urlParams = new URLSearchParams(window.location.search);
    const sport = urlParams.get("sport");
    const matchId = urlParams.get("match_id");

    if(document.getElementById("all-odds-page")){
        if (!sport || !matchId) {
            document.getElementById("all-odds-page").innerHTML = "<p>Error: Missing match details.</p>";
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

// Run the function when the page loads
fetchMoreOdds();


document.addEventListener("DOMContentLoaded", ()=>{
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
                        const {id, status, created_at, total_odds, stake, potential_win} = ticket;

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
                                                                <div class="text-small">${currencySymbol}&nbsp;20.77</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div  class="col-3 p-2 text-center" style="border-left: 1px solid aqua;">
                                                        <div class="row g-0 text-small text-yellow" onclick="toggleDisplayNone('TicketId-${id}')">
                                                            <div class="col-12 text-center">${selections.filter(s => s.status !== 'Pending').length}/${selections.length} settled</div>
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
})


function toggleDisplayNone(container_id){
    selections_container = document.querySelectorAll(`.${container_id}`)
    selections_container.forEach(cont =>{
       cont.classList.toggle('d-none');
    })
}


function footballMatchElementInnerHTML(game, sport, container){
    const { match_id, country , league, datetime, extras , odds, status} = game;

    // convert to local date and time
    let dateObj = new Date(datetime);

    let date = dateObj.toLocaleDateString("en-GB");
    let time = dateObj.toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit"});

    // Extract relevant odds
    let marketOdds = {};
    let marketsCount = 0;
    odds.forEach(market => {
        marketOdds[market.market_type] = market.odds;
        if(market.odds){
            marketsCount += Object.keys(market).length
        }
    });

    // Helper function to safely get odds values
    function getOdds(market, selection) {            
        return marketOdds[market] && marketOdds[market][selection] ? marketOdds[market][selection] : "N/A";
    }

    // function getMarket

    const matchElement = document.createElement('a');
    matchElement.href = `/more-odds/?sport=${sport}&match_id=${match_id}`;
    matchElement.classList.add('text-decoration-none', `${match_id}`, 'match-link', 'text-whitesmoke', 'mb-2');
    
    matchElement.innerHTML = `
                <div data-match-id="${match_id}" class="match-container bb-white pt-1 pb-1">
                    <div data-sport="${sport}" class="row g-0 d-md-none">
                        <div class="col-12">
                            <div class="row g-0 text-small">
                                <div class="col-7 text-truncate" style="margin-bottom: -5px;">
                                    <span data-country="${country}">🎟</span>&nbsp;
                                    <span data-country="${country}">${country}</span>&nbsp; 
                                    <span data-league="${league.name}">${league.name}</span>
                                </div>
                            </div>
                            <div class="row g-0" style="margin-bottom: -5px;">
                                <div class="col-6">
                                    <div class="row g-0 d-flex">
                                        <div class="col-10">
                                            <div style="margin-bottom: -5px;" data-home-team="${extras.teams?.home?.name}">${extras.teams?.home?.name}</div>
                                            <div data-away-team="${extras.teams?.away?.name}">${extras.teams?.away?.name}</div>
                                        </div>
                                        <div class="col-2 text-aqua">
                                            <div style="margin-bottom: -5px;">${extras.goals?.home ?? ''}</div>
                                            <div>${extras.goals?.away ?? ''}</div>
                                        </div>
                                    </div>
                                </div>
                                <div id="odds-desc-container1-small" data-market-type="Match Winner" class="col-6 d-flex odds-desc-container1-small">
                                    <button class="odds-btn my-2 big-screen-odds-btn" data-prediction="home">${getOdds('Match Winner', 'home')}</button>
                                    <button class="mx-1 my-2 odds-btn big-screen-odds-btn" data-prediction="draw">${getOdds('Match Winner', 'draw')}</button >
                                    <button class="odds-btn my-2 big-screen-odds-btn" data-prediction="away">${getOdds('Match Winner', 'away')}</button>
                                </div>
                            </div>
                            <div class="row g-0">
                                <div class="col-auto">
                                    <span class="text-small italic"><span data-match-date="${date}">${status.elapsed ?  `Live ${status.short}` : `${date}`} </span><span data-match-time="${time}" class="text-yellow">${status.elapsed ?? `${time}`}</span></span>
                                    <span class="text-small" data-match-id="${match_id}"> ${status.elapsed ?  '' : `id : ${match_id}`}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-0 d-none d-md-block">
                        <div class="col-12">
                            <div class="row g-0 d-flex">
                                <div class="col-6">
                                    <div class="text-small">
                                        <span class="text-truncate" data-datetime="${datetime}"><img src="${league.flag}" class="logo" alt="logo"/></span>&nbsp;
                                        <span class="text-truncate data-country="${country}">${country}</span>&nbsp; 
                                        <span class="text-truncate data-league="${league.name}" data-league-id="${league.id}">${league.name}</span>
                                    </div>
                                </div>
                                <div class="col-6 text-small">
                                    <div class="row g-0 text-end">
                                        <div class="col-12" >
                                            <span class="text-yellow">+${marketsCount} markets</span>
                                        </div>
                                    </div> 
                                    
                                </div>
                            </div>
                            <div class="row g-0">
                                <div class="col-3 col-lg-2">
                                    <div class="text-truncate">${extras.teams?.home?.name}</div>
                                    <div class="text-truncate">${extras.teams?.away?.name}</div>
                                </div>
                                 <div class="col-1 text-center text-aqua"> 
                                    <div>${extras.goals?.home ?? ''}</div>
                                    <div>${extras.goals?.away ?? ''}</div>
                                </div> 
                                <div id="odds-desc-container1" data-market-type="Match Winner" class="col-4 col-lg-3 d-flex pe-1 py-2 odds-desc-container1">
                                    <button class="odds-btn big-screen-odds-btn" data-prediction="home">${getOdds('Match Winner', 'home')}</button>
                                    <button class="mx-1 odds-btn big-screen-odds-btn" data-prediction="draw">${getOdds('Match Winner', 'draw')}</button >
                                    <button class="odds-btn big-screen-odds-btn" data-prediction="away">${getOdds('Match Winner', 'away')}</button>
                                </div>
                                <div id="odds-desc-container2" data-market-type="Goals Over/Under" class="col-4 col-lg-3 d-flex pe-1 py-2 odds-desc-container2">
                                    <span class="w-31">
                                        <span class="line fw-bold">2.5</span>
                                    </span>
                                    <button class="mx-1 odds-btn big-screen-odds-btn" data-prediction="Over">${getOdds('Goals Over/Under', 'over 2.5')}</button >
                                    <button class="odds-btn big-screen-odds-btn" data-prediction="Under">${getOdds('Goals Over/Under', 'under 2.5')}</button>
                                </div>
                                <div id="odds-desc-container3" data-market-type="Double Chance" class="col-4 col-lg-3 d-flex pe-1 py-2 odds-desc-container3">
                                    <button class="odds-btn big-screen-odds-btn " data-prediction="home/draw">${getOdds('Double Chance', 'home/draw')}</button>
                                    <button class="mx-1 odds-btn big-screen-odds-btn" data-prediction="home/away">${getOdds('Double Chance', 'home/away')}</button >
                                    <button class="odds-btn big-screen-odds-btn" data-prediction="draw/away">${getOdds('Double Chance', 'draw/away')}</button>
                                </div>
                            </div>
                            <div style="margin-top: -5px;" class="row g-0 col-3 text-truncate">
                                <div data-match-id="${match_id}"  class="text-small italic"><span data-match-date="${date}">${status.elapsed ?  `Live ${status.short}` : `${date}`}</span> <span data-match-time="${time}" class="text-yellow">${status.elapsed ?? `${time}`}</span> ${status.elapsed ? '' : `id : ${match_id}`}</div>
                            </div>
                        </div>                        
                    </div>
                </div> `;

    if(container.classList.contains('text-center')){
        container.classList.remove('text-center')
    }
    container.appendChild(matchElement);
};


function basketballMatchElementInnerHTML(game, sport){
    const { match_id, country , league, datetime, extras , odds} = game;

    // convert to local date and time
    let dateObj = new Date(datetime);

    let date = dateObj.toLocaleDateString("en-GB");
    let time = dateObj.toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit"});

    // Extract relevant odds
    let marketOdds = {};
    odds.forEach(market => {
        marketOdds[market.market_type] = market.odds;
    });

    // Helper function to safely get odds values
    function getOdds(market, selection) {
        return marketOdds[market] && marketOdds[market][selection] ? marketOdds[market][selection] : "N/A";
    }

    const matchElement = document.createElement('a');
    matchElement.href = `/more-odds/?sport=${sport}&match_id=${match_id}`;
    matchElement.classList.add('text-decoration-none', 'match-link', 'text-whitesmoke', 'mb-2');
    
    matchElement.innerHTML = `
                <div data-match-id="${match_id}" class="match-container bb-white pt-1 pb-1">
                    <div class="row g-0 d-md-none">
                        <div class="col-12">
                            <div class="row g-0 text-small">
                                <div class="col-7 text-truncate" style="margin-bottom: -5px;">
                                    <span data-country="${country}">🎟</span>&nbsp;
                                    <span data-country="${country}">${country}</span>&nbsp; 
                                    <span data-league="${league}">${league}</span>
                                </div>
                            </div>
                            <div class="row g-0" style="margin-bottom: -5px;">
                                <div class="col-6">
                                    <div class="row g-0 d-flex">
                                        <div class="col-10">
                                            <div style="margin-bottom: -5px;" data-home-team="${extras.home_team}">${extras.home_team}</div>
                                            <div data-away-team="${extras.away_team}">${extras.away_team}</div>
                                        </div>
                                        <div class="col-2">
                                            <div style="margin-bottom: -5px;">2</div>
                                            <div>0</div>
                                        </div>
                                    </div>
                                </div>
                                <div id="odds-desc-container1-small" class="col-6 d-flex odds-desc-container1-small">
                                    <button class="odds-btn my-2 big-screen-odds-btn" data-option="FT - home win">${league}</button>
                                    <button class="mx-1 my-2 odds-btn big-screen-odds-btn" data-option="FT - draw">${league}</button >
                                    <button class="odds-btn my-2 big-screen-odds-btn" data-option="FT - away win">${league}</button>
                                </div>
                            </div>
                            <div class="row g-0">
                                <div class="col-auto">
                                    <span class="text-danger italic text-small fw-bold">LIVE</span>
                                    <span class="text-small italic">1H</span>
                                    <span class="text-small" data-match-id="${match_id}">id : ${match_id}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-0 d-none d-md-block">
                        <div class="col-12">
                            <div class="row g-0 d-flex">
                                <div class="col-6">
                                    <div class="text-small">
                                        <span class="text-truncate" data-country-logo="${country}">🎟</span>&nbsp;
                                        <span class="text-truncate data-country="${country}">${country}</span>&nbsp; 
                                        <span class="text-truncate data-league="${league}">${league}</span>
                                    </div>
                                </div>
                                <div class="col-6 text-small">
                                    <div class="row g-0 text-end">
                                        <div class="col-12" >
                                            <span class="text-yellow">+154 markets</span>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>
                            <div class="row g-0">
                                <div class="col-4 col-lg-3">
                                    <div class="text-truncate">${extras.home_team}</div>
                                    <div class="text-truncate">${extras.away_team}</div>
                                </div>
                                <div id="odds-desc-container1" data-market-type="Fulltime" class="col-4 col-lg-3 d-flex pe-1 py-2 odds-desc-container1">
                                    <button class="odds-btn big-screen-odds-btn" data-option="1">${getOdds('1X2', 'home')}</button>
                                    <button class="mx-1 odds-btn big-screen-odds-btn" data-option="X">${getOdds('1X2', 'draw')}</button >
                                    <button class="odds-btn big-screen-odds-btn" data-option="2">${getOdds('1X2', 'away')}</button>
                                </div>
                                <div id="odds-desc-container2" data-market-type="Over/Under 2.5" class="col-4 col-lg-3 d-flex pe-1 py-2 odds-desc-container2">
                                    <span class="w-31 " data-option="DC - home/draw">
                                        <span class="line fw-bold">2.5</span>
                                    </span>
                                    <button class="mx-1 odds-btn big-screen-odds-btn" data-option="Over">${getOdds('over_under_2.5', 'over')}</button >
                                    <button class="odds-btn big-screen-odds-btn" data-option="Under">${getOdds('over_under_2.5', 'under')}</button>
                                </div>
                                <div id="odds-desc-container3" data-market-type="Double Chance" class="col-4 col-lg-3 d-flex pe-1 py-2 odds-desc-container3">
                                    <button class="odds-btn big-screen-odds-btn " data-option="1X">${getOdds('double_chance', 'home_or_draw')}</button>
                                    <button class="mx-1 odds-btn big-screen-odds-btn" data-option="12">${getOdds('double_chance', 'home_or_away')}</button >
                                    <button class="odds-btn big-screen-odds-btn" data-option="X2">${getOdds('double_chance', 'draw_or_away')}</button>
                                </div>
                            </div>
                            <div style="margin-top: -5px;" class="row g-0 col-3 text-truncate">
                                <div data-date="${date}" data-match-id="${match_id}" data-match-time="${time}" class="text-small italic">${date} <span class="text-yellow">${time}</span> id:${match_id}</div>
                            </div>
                        </div>                        
                    </div>
                </div> `;

    gamesDisplay.classList.remove('text-center')
    gamesDisplay.appendChild(matchElement);

};


// MORE ODDS FUNCTIONS FOR DIFFERENT SPORTS
function footballMoreOddsInnerHTML(data){
    console.log(data)
    const { match_id, country ,date, time, league, sport, venue,datetime, extras , odds} = data;
    let container = document.getElementById("all-odds-page");
    const allMarkets = document.getElementById('all-markets');

    // convert to local date and time

    // let date = dateObj.toLocaleDateString("en-GB");
    // let time = dateObj.toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit"});


    container.querySelectorAll('.filter-odds-by').forEach(btn => {
        btn.addEventListener('click', function (event) {
            
            const selectedFilter = event.target.textContent;
            const currentFilter = 'all';
            
            if(selectedFilter !== currentFilter){
                currentFilter = selectedFilter ? selectedFilter.trim() : 'All';
                fetchGamesBySport(currentFilter);
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
                // navItem.style.color = 'yellow';
            }
        })
    })


    // Extract relevant odds
    let marketOdds = {};
    odds.forEach(market => {
        marketOdds[market.market_type] = market.odds;
    });

    // Helper function to safely get odds values
    function getOdds(market, selection) {
        return marketOdds[market] && marketOdds[market][selection] ? marketOdds[market][selection] : "N/A";
    }
    const matchsum = document.createElement('div');
    matchsum.innerHTML = `<div id="wg-api-football-game"
                            data-host="v3.football.api-sports.io"
                            data-key="88cb9e0d29a0a8245c01b0d09ed572e4"
                            data-id="${match_id}"
                            data-theme=""
                            data-refresh="15"
                            data-show-errors="false"
                            data-show-logos="true">
                        </div>`

    const matchSummary = document.createElement('div');
    matchSummary.innerHTML = `
        <div class="row g-0">
            <div class="col-2">
                <a href="{{ request.META.HTTP_REFERER }}">
                    <i class="fa-solid fa-arrow-left-long text-yellow"></i>
                </a>
            </div>
            <div class="col-8 text-center text-yellow text-truncate" data-sport="${sport}" data-country="${country}" data-league="${league.name}" data-league-id="${league.id}"><img src="${league.flag}" class="logo" alt="flag"/> ${country} ${league.name}</div>
            <div class="col-2 text-end">
                <a href="#">
                    <i class="fa-solid fa-chart-simple text-yellow"></i>
                </a>
            </div>
        </div>

        <div id="more-odds-match-summary" class="more-odds-match-summary row gx-0 mb-3 mt-2">
            <div data-datetime="1${datetime}" class="col-4 text-center">
                <div class="fs-3">👕</div>
                    <div data-home-team="${extras.teams?.home?.name}">${extras.teams?.home?.name}</div>
                </div>
                <div class="col-4 text-center">
                    <div data-match-time="${time}" data-date="${date}" class="text-yellow text-small">${date} ${time}</div>
                    <div data-scores="">2 : 2</div>
                    <div data-match-id="${match_id}" class="text-small">id : ${match_id}</div>
                </div>
                <div class="col-4 text-center">
                    <div class="fs-3">👚</div>
                    <div data-away-team="${extras.teams?.away?.name}">${extras.teams?.away?.name}</div>
                </div>
            </div>
        </div>

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

    const fullTime = document.createElement('div');
    fullTime.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#fullTime" aria-expanded="true" aria-controls="fullTime">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Match Winner</span>
                </button>
            </h2>
            <div id="fullTime" class="accordion-collapse collapse show" data-bs-parent="#accordionExample">
                <div data-market-type="Fulltime" class="accordion-body bg-navy-blue row g-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="1">
                            <div class="text-yellow prediction">1</div>
                            <div class="odds-value">${getOdds('Match Winner', 'home')}</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="X">
                            <div class="text-yellow prediction">X</div>
                            <div class="odds-value">${getOdds('Match Winner', 'draw')}</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="2">
                            <div class="text-yellow prediction">2</div>
                            <div class="odds-value">${getOdds('Match Winner', 'away')}</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const doubleChance = document.createElement('div');
    doubleChance.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#doubleChance" aria-expanded="true" aria-controls="doubleChance">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Double chance</span>
                </button>
            </h2>
            <div id="doubleChance" class="accordion-collapse collapse show" data-bs-parent="#accordionExample">
                <div data-market-type="Double Chance" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="DC - Home/Draw">
                            <div class="text-yellow prediction">1X</div>
                            <div class="odds-value">${getOdds('Double Chance', 'home/draw')}</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="DC - Home/Away">
                            <div class="text-yellow prediction">12</div>
                            <div class="odds-value">${getOdds('Double Chance', 'home/away')}</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="DC - Draw/Away">
                            <div class="text-yellow prediction">X2</div>
                            <div class="odds-value">${getOdds('Double Chance', 'draw/away')}</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const btts = document.createElement('div');
    btts.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#btts" aria-expanded="true" aria-controls="btts">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Both teams to score</span>
                </button>
            </h2>
            <div id="btts" class="accordion-collapse collapse show" data-bs-parent="#accordionExample">
                <div data-market-type="Both Teams Score" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Both teams to score - Yes">
                            <div class="text-yellow prediction">Yes</div>
                            <div class="odds-value">${getOdds('Both Teams Score', 'yes')}</div> 
                        </button>
                    </div>
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Both teams to score - No">
                            <div class="text-yellow prediction">No</div>
                            <div class="odds-value">${getOdds('Both Teams Score', 'no')}</div> 
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const goals = document.createElement('div');
    goals.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#goals" aria-expanded="true" aria-controls="goals">
                        <span class="px-2"><i class="fa-solid fa-info"></i></span>
                        <span>Goals Over/Under</span>
                    </button>
                </h2>
            <div id="goals" class="accordion-collapse collapse show" data-bs-parent="#accordionExample">
                <div class="accordion-body bg-navy-blue p-1">
                    <div data-market-type="Goals Over/Under" class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Over - 0.5">
                                <div class="text-yellow prediction">Over 0.5</div>
                                <div class="odds-value">${getOdds('Goals Over/Under', 'over 0.5')}</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Under - 0.5">
                                <div class="text-yellow prediction">Under 0.5</div>
                                <div class="odds-value">${getOdds('Goals Over/Under', 'under 0.5')}</div> 
                            </button>
                        </div>
                    </div>

                    <div data-market-type="Over/Under" class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Over - 1.5">
                                <div class="text-yellow prediction">Over 1.5</div>
                                <div class="odds-value">${getOdds('Goals Over/Under', 'over 1.5')}</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Under - 1.5">
                                <div class="text-yellow prediction">Under 1.5</div>
                                <div class="odds-value">${getOdds('Goals Over/Under', 'under 1.5')}</div> 
                            </button>
                        </div>
                    </div>

                    <div data-market-type="Over/Under" class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Over - 2.5">
                                <div class="text-yellow prediction">Over 2.5</div>
                                <div class="odds-value">${getOdds('Goals Over/Under', 'over 2.5')}</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Under - 2.5">
                                <div class="text-yellow prediction">Under 2.5</div>
                                <div class="odds-value">${getOdds('Goals Over/Under', 'under 2.5')}</div> 
                            </button>
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Over - 3.5">
                                <div class="text-yellow prediction">Over 3.5</div>
                                <div class="odds-value">${getOdds('Goals Over/Under', 'over 3.5')}</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Under - 3.5">
                                <div class="text-yellow prediction">Under 3.5</div>
                                <div class="odds-value">${getOdds('Goals Over/Under', 'under 3.5')}</div> 
                            </button>
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Over - 4.5">
                                <div class="text-yellow prediction">Over 4.5</div>
                                <div class="odds-value">${getOdds('Goals Over/Under', 'over 4.5')}</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Under - 4.5">
                                <div class="text-yellow prediction">Under 4.5</div>
                                <div class="odds-value">${getOdds('Goals Over/Under', 'under 4.5')}</div> 
                            </button>
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Over - 5.5">
                                <div class="text-yellow prediction">Over 5.5</div>
                                <div class="odds-value">${getOdds('Goals Over/Under', 'over 5.5')}</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Under - 5.5">
                                <div class="text-yellow prediction">Under 5.5</div>
                                <div class="odds-value">${getOdds('Goals Over/Under', 'under 5.5')}</div> 
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const firstHalf1X2 = document.createElement('div');
    firstHalf1X2.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#First-half-1X2" aria-expanded="true" aria-controls="First-half-1X2">
                        <span class="px-2"><i class="fa-solid fa-info"></i></span>
                        <span>First Half Winner</span>
                    </button>
                </h2>
                <div id="First-half-1X2" class="accordion-collapse collapse show" data-bs-parent="#accordionExample">
                    <div data-market-type="First Half Winner" class="accordion-body bg-navy-blue row g-1 p-1">
                        <div class="col-4 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half 1X2 - Home Win">
                                <div class="text-yellow prediction">1</div>
                                <div class="odds-value">${getOdds('First Half Winner', 'home')}</div>
                            </button>
                        </div>
                        <div class="col-4 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half 1X2 - Draw">
                                <div class="text-yellow prediction">X</div>
                                <div class="odds-value">${getOdds('First Half Winner', 'draw')}</div>
                            </button>
                        </div>
                        <div class="col-4 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half 1X2 - Away Win">
                                <div class="text-yellow prediction">2</div>
                                <div class="odds-value">${getOdds('First Half Winner', 'away')}</div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const highestScoringHalf = document.createElement('div');
    highestScoringHalf.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#highest-scoring-half" aria-expanded="true" aria-controls="highest-scoring-half">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Highest Scoring Half</span>
                </button>
            </h2>
            <div id="highest-scoring-half" class="accordion-collapse collapse show" data-bs-parent="#accordionExample">
                <div data-market-type="Highest Scoring Half" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Home Win">
                            <div class="text-yellow prediction">First</div>
                            <div class="odds-value">${getOdds('Highest Scoring Half', '1st half')}</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Draw">
                            <div class="text-yellow prediction">Equal</div>
                            <div class="odds-value">${getOdds('Highest Scoring Half', 'draw')}</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Away Win">
                            <div class="text-yellow prediction">Second</div>
                            <div class="odds-value">${getOdds('Highest Scoring Half', '2nd half')}</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const firstHalfGoals = document.createElement('div');
    firstHalfGoals.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#First-half-goals" aria-expanded="true" aria-controls="First-half-goals">
                        <span class="px-2"><i class="fa-solid fa-info"></i></span>
                        <span>Halftime Over/Under</span>
                    </button>
                </h2>
                <div id="First-half-goals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                    <div class="accordion-body bg-navy-blue p-1">
                        <div data-market-type="Halftime Over/Under" class="row g-2 mb-2">
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Half time over - 0.5">
                                    <div class="text-yellow prediction">Over 0.5</div>
                                    <div class="odds-value">1.10</div>
                                </button>
                            </div>
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Half time under - 0.5">
                                    <div class="text-yellow prediction">Under 0.5</div>
                                    <div class="odds-value">9.56</div> 
                                </button>
                            </div>
                        </div>

                        <div data-market-type="Halftime Over/Under" class="row g-2 mb-2">
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Half time over - 1.5">
                                    <div class="text-yellow prediction">Over 1.5</div>
                                    <div class="odds-value">${getOdds('first_half_goals', 'over_1.5')}</div>
                                </button>
                            </div>
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Half time under - 1.5">
                                    <div class="text-yellow prediction">Under 1.5</div>
                                    <div class="odds-value">${getOdds('first_half_goals', 'under_1.5')}</div> 
                                </button>
                            </div>
                        </div>

                        <div data-market-type="Halftime Over/Under" class="row g-2 mb-2">
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Half time over - 2.5">
                                    <div class="text-yellow prediction">Over 2.5</div>
                                    <div class="odds-value">1.10</div>
                                </button>
                            </div>
                            <div class="col-6 d-grid">
                                <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Half time under - 2.5">
                                    <div class="text-yellow prediction">Under 2.5</div>
                                    <div class="odds-value">9.56</div> 
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    `;

    const secondHalf1X2 = document.createElement('div');
    secondHalf1X2.innerHTML = `
      <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#second-half-1X2" aria-expanded="true" aria-controls="second-half-1X2">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Second half 1X2</span>
                </button>
            </h2>
            <div id="second-half-1X2" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Second Half 1X2" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Second half - Home Win">
                            <div class="text-yellow prediction">1</div>
                            <div class="odds-value">${getOdds('second_half_1X2', 'home')}</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Second half - Draw">
                            <div class="text-yellow prediction">X</div>
                            <div class="odds-value">${getOdds('second_half_1X2', 'draw')}</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Second half - Away Win">
                            <div class="text-yellow prediction">2</div>
                            <div class="odds-value">${getOdds('second_half_1X2', 'away')}</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `; 

    const correctScore = document.createElement('div');
    correctScore.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#correct-score" aria-expanded="true" aria-controls="correct-score">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Correct Score</span>
                </button>
            </h2>
            <div id="correct-score" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Correct Score" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">0:0</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">0:1</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">0:2</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">0:3</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">0:4</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">1:0</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">1:1</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">1:2</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">1:3</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">1:4</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">2:0</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">2:1</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">2:2</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">2:3</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">2:4</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">3:0</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">3:1</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">3:2</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">3:3</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">3:4</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">4:0</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">4:1</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">4:2</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">4:3</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">4:4</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">4:5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">Other</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `; 

    const totalGoalRange = document.createElement('div');
    totalGoalRange.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#total-goal-range" aria-expanded="true" aria-controls="total-goal-range">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Total Goal Range</span>
                </button>
            </h2>
            <div id="total-goal-range" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Total Goal Range" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">0</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">1-2</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">1-3</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">1-4</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">1-5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">1-6</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">2-3</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">2-4</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">2-5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">2-6</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">3-4</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">3-5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">3-6</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">4-5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">4-6</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 7+">
                            <div class="text-yellow prediction">5-6</div>
                            <div class="odds-value">1.65</div>
                        </button>
                    </div>
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - No goals">
                            <div class="text-yellow prediction">7+</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>                    
                </div>
            </div>
            </div>
        </div>
        
    `; 

    const whoWillWin = document.createElement('div');
    whoWillWin.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#who-will-win" aria-expanded="true" aria-controls="who-will-win">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Who will win? (If Draw, Money back)</span>
                </button>
            </h2>
            <div id="who-will-win" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Who Will Win" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Who will win - Home">
                            <div class="text-yellow prediction">1</div>
                            <div class="odds-value">1.48</div> 
                        </button>
                    </div>
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Who will win - Away">
                            <div class="text-yellow prediction">2</div>
                            <div class="odds-value">1.57</div> 
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const teamToScoreFirst = document.createElement('div');
    teamToScoreFirst.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#Team-to-score-first" aria-expanded="true" aria-controls="Team-to-score-first">
                        <span class="px-2"><i class="fa-solid fa-info"></i></span>
                        <span>Team to score first</span>
                    </button>
                </h2>
                <div id="Team-to-score-first" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                    <div data-market-type="Team To Score First" class="accordion-body bg-navy-blue row g-1 p-1">
                        <div class="col-4 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                                <div class="text-yellow prediction">1</div>
                                <div class="odds-value">2.01</div> 
                            </button>
                        </div>
                        <div class="col-4 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                                <div class="text-yellow prediction">None</div>
                                <div class="odds-value">6.80</div> 
                            </button>
                        </div>
                        <div class="col-4 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                                <div class="text-yellow prediction">2</div>
                                <div class="odds-value">2.29</div> 
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const first10mins1X2 = document.createElement('div');
    first10mins1X2.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#first-10min-1X2" aria-expanded="true" aria-controls="first-10min-1X2">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>First 10 minutes 1X2</span>
                </button>
            </h2>
            <div id="first-10min-1X2" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-tyep="First 10 mins 1X2" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First 10 min 1X2 - Home Win">
                            <div class="text-yellow prediction">1</div>
                            <div class="odds-value">2.68</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First 10 min 1X2 - Draw">
                            <div class="text-yellow prediction">X</div>
                            <div class="odds-value">1.65</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First 10 min 1X2 - Away Win">
                            <div class="text-yellow prediction">2</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const multiGoals = document.createElement('div');
    multiGoals.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#Multigoals" aria-expanded="true" aria-controls="Multigoals">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Multigoals</span>
                </button>
            </h2>
            <div id="Multigoals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Multigoals" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 1-2">
                            <div class="text-yellow prediction">1-2</div>
                            <div class="odds-value">2.68</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 1-3">
                            <div class="text-yellow prediction">1-3</div>
                            <div class="odds-value">1.65</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 1-4">
                            <div class="text-yellow prediction">1-4</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 1-5">
                            <div class="text-yellow prediction">1-5</div>
                            <div class="odds-value">2.68</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 1-6">
                            <div class="text-yellow prediction">1-6</div>
                            <div class="odds-value">1.65</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 2-3">
                            <div class="text-yellow prediction">2-3</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 2-4">
                            <div class="text-yellow prediction">2-4</div>
                            <div class="odds-value">2.68</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 2-5">
                            <div class="text-yellow prediction">2-5</div>
                            <div class="odds-value">1.65</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 2-6">
                            <div class="text-yellow prediction">2-6</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 3-4">
                            <div class="text-yellow prediction">3-4</div>
                            <div class="odds-value">2.68</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 3-5">
                            <div class="text-yellow prediction">3-5</div>
                            <div class="odds-value">1.65</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 3-6">
                            <div class="text-yellow prediction">3-6</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 4-5">
                            <div class="text-yellow prediction">4-5</div>
                            <div class="odds-value">2.68</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 4-6">
                            <div class="text-yellow prediction">4-6</div>
                            <div class="odds-value">1.65</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 5-6">
                            <div class="text-yellow prediction">5-6</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - 7+">
                            <div class="text-yellow prediction">7+</div>
                            <div class="odds-value">1.65</div>
                        </button>
                    </div>
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - No goals">
                            <div class="text-yellow prediction">No goals</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const homeTeamGoals = document.createElement('div');
    homeTeamGoals.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#HometeamGoals" aria-expanded="true" aria-controls="HometeamGoals">
                        <span class="px-2"><i class="fa-solid fa-info"></i></span>
                        <span>${extras.home_team} goals</span>
                    </button>
                </h2>
            <div id="HometeamGoals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Home Team Goals" class="accordion-body bg-navy-blue p-1">
                    
                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team over - 0.5">
                                <div class="text-yellow prediction">Over 0.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team under - 0.5">
                                <div class="text-yellow prediction">Under 0.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team over - 1.5">
                                <div class="text-yellow prediction">Over 1.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team under - 1.5">
                                <div class="text-yellow prediction">Under 1.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team over - 2.5">
                                <div class="text-yellow prediction">Over 2.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team under - 2.5">
                                <div class="text-yellow prediction">Under 2.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const awayTeamGoals = document.createElement('div');
    awayTeamGoals.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#AwayteamGoals" aria-expanded="true" aria-controls="AwayteamGoals">
                        <span class="px-2"><i class="fa-solid fa-info"></i></span>
                        <span>${extras.away_team} goals</span>
                    </button>
                </h2>
            <div id="AwayteamGoals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Away Team Goals" class="accordion-body bg-navy-blue p-1">
                    
                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Away team over - 0.5">
                                <div class="text-yellow prediction">Over 0.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Away team under - 0.5">
                                <div class="text-yellow prediction">Under 0.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Away team over - 1.5">
                                <div class="text-yellow prediction">Over 1.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Away team under - 1.5">
                                <div class="text-yellow prediction">Under 1.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Away team over - 2.5">
                                <div class="text-yellow prediction">Over 2.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Away team under - 2.5">
                                <div class="text-yellow prediction">Under 2.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const homeTeamMultigoals = document.createElement('div');
    homeTeamMultigoals.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#HomeTeamMultigoals" aria-expanded="true" aria-controls="HomeTeamMultigoals">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>${extras.home_team} multigoals</span>
                </button>
            </h2>
            <div id="HomeTeamMultigoals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Home Team Multigoals" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team multigoals - 1-2">
                            <div class="text-yellow prediction">1-2</div>
                            <div class="odds-value">2.68</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team multigoals - 1-3">
                            <div class="text-yellow prediction">1-3</div>
                            <div class="odds-value">1.65</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team multigoals - 2-3">
                            <div class="text-yellow prediction">2-3</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team multigoals - 4+">
                            <div class="text-yellow prediction">4+</div>
                            <div class="odds-value">1.65</div>
                        </button>
                    </div>
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - No goals">
                            <div class="text-yellow prediction">No goals</div>
                            <div class="odds-value">27.05</div>
                        </button>
                    </div>                                          
                </div>
            </div>
            </div>
        </div>
    `;

    const awayTeamMultiGoals = document.createElement('div');
    awayTeamMultiGoals.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#AwayTeamMultigoals" aria-expanded="true" aria-controls="AwayTeamMultigoals">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>${extras.away_team} multigoals</span>
                </button>
            </h2>
            <div id="AwayTeamMultigoals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Away Team Multigoals" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Away team multigoals - 1-2">
                            <div class="text-yellow prediction">1-2</div>
                            <div class="odds-value">2.68</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Away team multigoals - 1-3">
                            <div class="text-yellow prediction">1-3</div>
                            <div class="odds-value">1.65</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Away team multigoals - 2-3">
                            <div class="text-yellow prediction">2-3</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Away team multigoals - 4+">
                            <div class="text-yellow prediction">4+</div>
                            <div class="odds-value">1.65</div>
                        </button>
                    </div>
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Multigoals - No goals">
                            <div class="text-yellow prediction">No goals</div>
                            <div class="odds-value">27.05</div>
                        </button>
                    </div>                                          
                </div>
            </div>
            </div>
        </div>
    `;

    const firstHalfFirstGoal = document.createElement('div');
    firstHalfFirstGoal.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#first-half-first-goal" aria-expanded="true" aria-controls="first-half-first-goal">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>First half first goal</span>
                </button>
            </h2>
            <div id="first-half-first-goal" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="First Half First Goal" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half first goal - Home Team">
                            <div class="text-yellow prediction">1</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half DC - Home/Away">
                            <div class="text-yellow prediction">No goal</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half first goal - Away Team">
                            <div class="text-yellow prediction">2</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const firstHalfDoubleChance = document.createElement('div');
    firstHalfDoubleChance.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#first-half-double-chance" aria-expanded="true" aria-controls="first-half-double-chance">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>First half double chance</span>
                </button>
            </h2>
            <div id="first-half-double-chance" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="First Half Dounle Chance" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half DC - Home/Draw">
                            <div class="text-yellow prediction">1X</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half DC - Home/Away">
                            <div class="text-yellow prediction">12</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half DC - Draw/Away">
                            <div class="text-yellow prediction">X2</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const firstHalfHandicap = document.createElement('div');
    firstHalfHandicap.innerHTML = `
    <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#first-half-handicap" aria-expanded="true" aria-controls="first-half-handicap">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>First half handicap</span>
                </button>
            </h2>
            <div id="first-half-handicap" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="First Half Handicap" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - 1 (0:1)">
                            <div class="text-yellow prediction">1 (0:1)</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - X (0:1)">
                            <div class="text-yellow prediction">X (0:1)</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - 2 (0:1)">
                            <div class="text-yellow prediction">2 (0:1)</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - 1 (0:2)">
                            <div class="text-yellow prediction">1 (0:2)</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - X (0:2)">
                            <div class="text-yellow prediction">X (0:2)</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - 2 (0:2)">
                            <div class="text-yellow prediction">2 (0:2)</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - 1 (1:0)">
                            <div class="text-yellow prediction">1 (1:0)</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - X (1:0)">
                            <div class="text-yellow prediction">X (1:0)</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half handicap - 2 (1:0)">
                            <div class="text-yellow prediction">2 (1:0)</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const firstHalfHomeTeamGoals = document.createElement('div');
    firstHalfHomeTeamGoals.innerHTML = `
         <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#FirstHalfHometeamGoals" aria-expanded="true" aria-controls="FirstHalfHometeamGoals">
                        <span class="px-2"><i class="fa-solid fa-info"></i></span>
                        <span>First half ${extras.home_team} goals</span>
                    </button>
                </h2>
            <div id="FirstHalfHometeamGoals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="First Half Hometeam Goals" class="accordion-body bg-navy-blue p-1">
                    
                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half Home team over - 0.5">
                                <div class="text-yellow prediction">Over 0.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half Home team under - 0.5">
                                <div class="text-yellow prediction">Under 0.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half Home team over - 1.5">
                                <div class="text-yellow prediction">Over 1.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half Home team under - 1.5">
                                <div class="text-yellow prediction">Under 1.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half Home team over - 2.5">
                                <div class="text-yellow prediction">Over 2.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half Home team under - 2.5">
                                <div class="text-yellow prediction">Under 2.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const firstHalfAwayTeamGoals = document.createElement('div');
    firstHalfAwayTeamGoals.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#FirstHalfAwayteamGoals" aria-expanded="true" aria-controls="FirstHalfAwayteamGoals">
                        <span class="px-2"><i class="fa-solid fa-info"></i></span>
                        <span>First half ${extras.away_team} goals</span>
                    </button>
                </h2>
            <div id="FirstHalfAwayteamGoals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="First Half Awayteam Goals" class="accordion-body bg-navy-blue p-1">
                    
                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half away team over - 0.5">
                                <div class="text-yellow prediction">Over 0.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half away team under - 0.5">
                                <div class="text-yellow prediction">Under 0.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half away team over - 1.5">
                                <div class="text-yellow prediction">Over 1.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half away team under - 1.5">
                                <div class="text-yellow prediction">Under 1.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half away team over - 2.5">
                                <div class="text-yellow prediction">Over 2.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half away team under - 2.5">
                                <div class="text-yellow prediction">Under 2.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const whichTeamToScore = document.createElement('div');
    whichTeamToScore.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#which-team-to-score" aria-expanded="true" aria-controls="which-team-to-score">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Which team to score</span>
                </button>
            </h2>
            <div id="which-team-to-score" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Which Team To Score" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half DC - Home/Draw">
                            <div class="text-yellow text-small prediction">Home only</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half DC - Home/Away">
                            <div class="text-yellow text-small prediction">None</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="First half DC - Draw/Away">
                            <div class="text-yellow text-small prediction">Away only</div>
                            <div class="odds-value">2.98</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `; 

    const ftDoubleChanceAndOorU = document.createElement('div');
    ftDoubleChanceAndOorU.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#fulltime-dc-and-o/u" aria-expanded="true" aria-controls="fulltime-dc-and-o/u">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Full time double chance & O/U</span>
                </button>
            </h2>
            <div id="fulltime-dc-and-o/u" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="FT DC & O/U" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & O 1.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small align-bottom" style="padding-top: 1px;">12 & O 1.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & O 1.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & U 1.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & U 1.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & U 1.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & O 2.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & O 2.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & O 2.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & U 2.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & U 2.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & U 2.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & O 3.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & O 3.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & O 3.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & U 3.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & U 3.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & U 3.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & O 4.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & O 4.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & O 4.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & U 4.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & U 4.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & U 4.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `; 

    const ftDoubleChanceAndBts = document.createElement('div');
    ftDoubleChanceAndBts.innerHTML = `
    <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        <div class="accordion-item">
        <h2 class="accordion-header">
            <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#fulltime-dc-&-bts" aria-expanded="true" aria-controls="fulltime-dc-&-bts">
                <span class="px-2"><i class="fa-solid fa-info"></i></span>
                <span>Full time double chance & bts</span>
            </button>
        </h2>
        <div id="fulltime-dc-&-bts" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
            <div data-market-type="FT DC & BTS" class="accordion-body bg-navy-blue row g-1 p-1">
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & Y</div>
                        <div class="odds-value">2.01</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & Y</div>
                        <div class="odds-value">6.80</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & Y</div>
                        <div class="odds-value">2.29</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & N</div>
                        <div class="odds-value">2.01</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & N</div>
                        <div class="odds-value">6.80</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & N</div>
                        <div class="odds-value">2.29</div> 
                    </button>
                </div>
            </div>
        </div>
        </div>
    </div>
    `;

    const ft1X2and0orU = document.createElement('div');
    ft1X2and0orU.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#fulltime-1X2-and-o/u" aria-expanded="true" aria-controls="fulltime-1X2-and-o/u">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Full time 1X2 & O/U</span>
                </button>
            </h2>
            <div id="fulltime-1X2-and-o/u" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="FT 1X2 & O/U" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & O 1.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small align-bottom" style="padding-top: 1px;">X & O 1.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & O 1.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & U 1.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & U 1.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & U 1.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & O 2.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & O 2.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & O 2.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & U 2.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & U 2.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & U 2.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & O 3.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & O 3.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & O 3.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & U 3.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & U 3.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & U 3.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & O 4.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & O 4.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & O 4.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & U 4.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & U 4.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & U 4.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;
    
    const  ft1X2andBts = document.createElement('div');
    ft1X2andBts.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        <div class="accordion-item">
        <h2 class="accordion-header">
            <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#fulltime-1X2-&-bts" aria-expanded="true" aria-controls="fulltime-1X2-&-bts">
                <span class="px-2"><i class="fa-solid fa-info"></i></span>
                <span>Full time 1X2 & bts</span>
            </button>
        </h2>
        <div id="fulltime-1X2-&-bts" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
            <div data-market-type="FT 1X2 & BTS" class="accordion-body bg-navy-blue row g-1 p-1">
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & Y</div>
                        <div class="odds-value">2.01</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & Y</div>
                        <div class="odds-value">6.80</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & Y</div>
                        <div class="odds-value">2.29</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & N</div>
                        <div class="odds-value">2.01</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & N</div>
                        <div class="odds-value">6.80</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & N</div>
                        <div class="odds-value">2.29</div> 
                    </button>
                </div>
            </div>
        </div>
        </div>
    </div>
    `;

    const btsAndOorU2point5 = document.createElement('div');
    btsAndOorU2point5.innerHTML = `
    <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        <div class="accordion-item">
        <h2 class="accordion-header">
            <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#bts-and-o-or-u-2.5" aria-expanded="true" aria-controls="bts-and-o-or-u-2.5">
                <span class="px-2"><i class="fa-solid fa-info"></i></span>
                <span>Both teams to score & O/U 2.5</span>
            </button>
        </h2>
        <div id="bts-and-o-or-u-2.5" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
            <div data-market-type="BTS & O/U 2.5" class="accordion-body bg-navy-blue row g-1 p-1">
                <div class="col-6 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">Y & Over 2.5</div>
                        <div class="odds-value">2.01</div> 
                    </button>
                </div>
                <div class="col-6 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">Y & Under 2.5</div>
                        <div class="odds-value">6.80</div> 
                    </button>
                </div>
                <div class="col-6 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">N & Over 2.5</div>
                        <div class="odds-value">2.29</div> 
                    </button>
                </div>
                <div class="col-6 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">N & Under 2.5</div>
                        <div class="odds-value">2.01</div> 
                    </button>
                </div>
            </div>
        </div>
        </div>
    </div>
    `;

    const htDoubleChanceAndBts = document.createElement('div');
    htDoubleChanceAndBts.innerHTML = `
    <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        <div class="accordion-item">
        <h2 class="accordion-header">
            <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#halftime-dc-&-bts" aria-expanded="true" aria-controls="halftime-dc-&-bts">
                <span class="px-2"><i class="fa-solid fa-info"></i></span>
                <span>Half time double chance & bts</span>
            </button>
        </h2>
        <div id="halftime-dc-&-bts" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
            <div data-market-type="HT DC & BTS" class="accordion-body bg-navy-blue row g-1 p-1">
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & Y</div>
                        <div class="odds-value">2.01</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & Y</div>
                        <div class="odds-value">6.80</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & Y</div>
                        <div class="odds-value">2.29</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & N</div>
                        <div class="odds-value">2.01</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & N</div>
                        <div class="odds-value">6.80</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & N</div>
                        <div class="odds-value">2.29</div> 
                    </button>
                </div>
            </div>
        </div>
        </div>
    </div>
    `;

    const ht1X2and0orU = document.createElement('div');
    ht1X2and0orU.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#halftime-1X2-and-o/u" aria-expanded="true" aria-controls="halftime-1X2-and-o/u">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Half time 1X2 & O/U</span>
                </button>
            </h2>
            <div id="halftime-1X2-and-o/u" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="HT 1X2 & O/U" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & O 1.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small align-bottom" style="padding-top: 1px;">X & O 1.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & O 1.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & U 1.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & U 1.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & U 1.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const  ht1X2andBts = document.createElement('div');
    ht1X2andBts.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        <div class="accordion-item">
        <h2 class="accordion-header">
            <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#halftime-1X2-&-bts" aria-expanded="true" aria-controls="halftime-1X2-&-bts">
                <span class="px-2"><i class="fa-solid fa-info"></i></span>
                <span>Half time 1X2 & bts</span>
            </button>
        </h2>
        <div id="halftime-1X2-&-bts" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
            <div data-market-type="HT 1X2 & BTS" class="accordion-body bg-navy-blue row g-1 p-1">
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & Y</div>
                        <div class="odds-value">2.01</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & Y</div>
                        <div class="odds-value">6.80</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & Y</div>
                        <div class="odds-value">2.29</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & N</div>
                        <div class="odds-value">2.01</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & N</div>
                        <div class="odds-value">6.80</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & N</div>
                        <div class="odds-value">2.29</div> 
                    </button>
                </div>
            </div>
        </div>
        </div>
    </div>
    `;

    const secondHalhDoubleChanceAndBts = document.createElement('div');
    secondHalhDoubleChanceAndBts.innerHTML = `
    <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        <div class="accordion-item">
        <h2 class="accordion-header">
            <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#2ndhalftime-dc-&-bts" aria-expanded="true" aria-controls="2ndhalftime-dc-&-bts">
                <span class="px-2"><i class="fa-solid fa-info"></i></span>
                <span>2nd half double chance & bts</span>
            </button>
        </h2>
        <div id="2ndhalftime-dc-&-bts" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
            <div data-market-type="2nd Half DC & BTS" class="accordion-body bg-navy-blue row g-1 p-1">
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & Y</div>
                        <div class="odds-value">2.01</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & Y</div>
                        <div class="odds-value">6.80</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & Y</div>
                        <div class="odds-value">2.29</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">1X & N</div>
                        <div class="odds-value">2.01</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">12 & N</div>
                        <div class="odds-value">6.80</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">X2 & N</div>
                        <div class="odds-value">2.29</div> 
                    </button>
                </div>
            </div>
        </div>
        </div>
    </div>
    `;

    const secondHalf1X2and0orU = document.createElement('div');
    secondHalf1X2and0orU.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#2ndhalf-1X2-and-o/u" aria-expanded="true" aria-controls="2ndhalf-1X2-and-o/u">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>2nd half 1X2 & O/U</span>
                </button>
            </h2>
            <div id="2ndhalf-1X2-and-o/u" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="2nd Half 1X2 & O/U" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & O 1.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small align-bottom" style="padding-top: 1px;">X & O 1.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & O 1.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & U 1.5</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & U 1.5</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & U 1.5</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;
    const highestScoringHalfHomeTeam = document.createElement('div');
    highestScoringHalfHomeTeam.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#highest-scoring-half-home-team" aria-expanded="true" aria-controls="highest-scoring-half-home-team">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Highest scoring half : ${extras.home_team}</span>
                </button>
            </h2>
            <div id="highest-scoring-half-home-team" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Highest Scoring Half Home Team" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Home Win">
                            <div class="text-yellow prediction">First</div>
                            <div class="odds-value">${getOdds('highest_scoring_half', 'first')}</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Draw">
                            <div class="text-yellow prediction">Equal</div>
                            <div class="odds-value">${getOdds('highest_scoring_half', 'equal')}</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Away Win">
                            <div class="text-yellow prediction">Second</div>
                            <div class="odds-value">${getOdds('highest_scoring_half', 'second')}</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const highestScoringHalfAwayTeam = document.createElement('div');
    highestScoringHalfAwayTeam.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#highest-scoring-half-away-team" aria-expanded="true" aria-controls="highest-scoring-half-away-team">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Highest scoring half : ${extras.away_team}</span>
                </button>
            </h2>
            <div id="highest-scoring-half-away-team" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Highest Scoring Half Away Team" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Home Win">
                            <div class="text-yellow prediction">First</div>
                            <div class="odds-value">${getOdds('highest_scoring_half', 'first')}</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Draw">
                            <div class="text-yellow prediction">Equal</div>
                            <div class="odds-value">${getOdds('highest_scoring_half', 'equal')}</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Away Win">
                            <div class="text-yellow prediction">Second</div>
                            <div class="odds-value">${getOdds('highest_scoring_half', 'second')}</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const firstHalfTotalGoals = document.createElement('div');
    firstHalfTotalGoals.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#first-half-total-goals" aria-expanded="true" aria-controls="first-half-total-goals">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>First half total goals</span>
                </button>
            </h2>
            <div id="first-half-total-goals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="First Half Total Goals" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Home Win">
                            <div class="text-yellow prediction">0</div>
                            <div class="odds-value">${getOdds('1X2', 'home')}</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Draw">
                            <div class="text-yellow prediction">1</div>
                            <div class="odds-value">${getOdds('1X2', 'draw')}</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Away Win">
                            <div class="text-yellow prediction">2+</div>
                            <div class="odds-value">${getOdds('1X2', 'away')}</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const secondHalfTotalGoals = document.createElement('div');
    secondHalfTotalGoals.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#second-half-total-goals" aria-expanded="true" aria-controls="second-half-total-goals">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Second half total goals</span>
                </button>
            </h2>
            <div id="second-half-total-goals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Second Half Total Goals" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Home Win">
                            <div class="text-yellow prediction">0</div>
                            <div class="odds-value">${getOdds('first_half_goals', 'over_1.5')}</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Draw">
                            <div class="text-yellow prediction">1</div>
                            <div class="odds-value">${getOdds('first_half_goals', 'under_1.5')}</div>
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Away Win">
                            <div class="text-yellow prediction">2+</div>
                            <div class="odds-value">${getOdds('first_half_goals', 'over')}</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const secondHalfHomeTeamGoals = document.createElement('div');
    secondHalfHomeTeamGoals.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#2nd-half-home-team-goals" aria-expanded="true" aria-controls="2nd-half-home-team-goals">
                        <span class="px-2"><i class="fa-solid fa-info"></i></span>
                        <span>Second half ${extras.home_team} goals</span>
                    </button>
                </h2>
            <div id="2nd-half-home-team-goals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="2nd Half Home Team Goals" class="accordion-body bg-navy-blue p-1">
                    
                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team over - 0.5">
                                <div class="text-yellow prediction">Over 0.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team under - 0.5">
                                <div class="text-yellow prediction">Under 0.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team over - 1.5">
                                <div class="text-yellow prediction">Over 1.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team under - 1.5">
                                <div class="text-yellow prediction">Under 1.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team over - 2.5">
                                <div class="text-yellow prediction">Over 2.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team under - 2.5">
                                <div class="text-yellow prediction">Under 2.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const secondHalfAwayTeamGoals = document.createElement('div');
    secondHalfAwayTeamGoals.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#2nd-half-away-team-goals" aria-expanded="true" aria-controls="2nd-half-away-team-goals">
                        <span class="px-2"><i class="fa-solid fa-info"></i></span>
                        <span>Second half ${extras.away_team} goals</span>
                    </button>
                </h2>
            <div id="2nd-half-away-team-goals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="2nd Half Away Team Goals" class="accordion-body bg-navy-blue p-1">
                    
                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team over - 0.5">
                                <div class="text-yellow prediction">Over 0.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team under - 0.5">
                                <div class="text-yellow prediction">Under 0.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team over - 1.5">
                                <div class="text-yellow prediction">Over 1.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team under - 1.5">
                                <div class="text-yellow prediction">Under 1.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team over - 2.5">
                                <div class="text-yellow prediction">Over 2.5</div>
                                <div class="odds-value">1.10</div>
                            </button>
                        </div>
                        <div class="col-6 d-grid">
                            <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Home team under - 2.5">
                                <div class="text-yellow prediction">Under 2.5</div>
                                <div class="odds-value">9.56</div> 
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const secondHalfCorrectScore = document.createElement('div');
    secondHalfCorrectScore.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#secold-half-correct-score" aria-expanded="true" aria-controls="secold-half-correct-score">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Second half correct score</span>
                </button>
            </h2>
            <div id="secold-half-correct-score" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="2nd Half Correct Score" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">1:0</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">0:0</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">0:1</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">2:0</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">1:1</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">0:2</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">2:1</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">2:2</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">1:2</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-12 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">Other</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const homeWinToNill = document.createElement('div');
    homeWinToNill.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#home-win-to-nill" aria-expanded="true" aria-controls="home-win-to-nill">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>${extras.home_team} win to nill</span>
                </button>
            </h2>
            <div id="home-win-to-nill" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Home Win To Nill" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Home Win">
                            <div class="text-yellow prediction">Yes</div>
                            <div class="odds-value">${getOdds('1X2', 'vg')}</div>
                        </button>
                    </div>
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Away Win">
                            <div class="text-yellow prediction">No</div>
                            <div class="odds-value">${getOdds('1X2', 'no')}</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const awayWinToNill = document.createElement('div');
    awayWinToNill.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#away-win-to-nill" aria-expanded="true" aria-controls="away-win-to-nill">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>${extras.away_team} win to nill</span>
                </button>
            </h2>
            <div id="away-win-to-nill" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Away Win To Nill" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Home Win">
                            <div class="text-yellow prediction">Yes</div>
                            <div class="odds-value">${getOdds('1X2', 'vg')}</div>
                        </button>
                    </div>
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Away Win">
                            <div class="text-yellow prediction">No</div>
                            <div class="odds-value">${getOdds('1X2', 'no')}</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const oddOrOddHomeTeam = document.createElement('div');
    oddOrOddHomeTeam.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#oddOrOddHomeTeam" aria-expanded="true" aria-controls="oddOrOddHomeTeam">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>${extras.home_team} total goals odd/even</span>
                </button>
            </h2>
            <div id="oddOrOddHomeTeam" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Home Team Total Goals Odd/Even" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Home Win">
                            <div class="text-yellow prediction">Odd</div>
                            <div class="odds-value">${getOdds('1X2', 'home')}</div>
                        </button>
                    </div>
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Away Win">
                            <div class="text-yellow prediction">Even</div>
                            <div class="odds-value">${getOdds('1X2', 'no')}</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const oddOrOddAwayTeam = document.createElement('div');
    oddOrOddAwayTeam.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#oddOrOddAwayTeam" aria-expanded="true" aria-controls="oddOrOddAwayTeam">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>${extras.away_team} total goals odd/even</span>
                </button>
            </h2>
            <div id="oddOrOddAwayTeam" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Away Team Total Goals Odd/Even" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Home Win">
                            <div class="text-yellow prediction">Odd</div>
                            <div class="odds-value">${getOdds('1X2', 'vg')}</div>
                        </button>
                    </div>
                    <div class="col-6 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="FT - Away Win">
                            <div class="text-yellow prediction">Even</div>
                            <div class="odds-value">${getOdds('1X2', 'away')}</div>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const exactTotalGoals = document.createElement('div');
    exactTotalGoals.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#exact-total-goals" aria-expanded="true" aria-controls="exact-total-goals">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Exact total goals</span>
                </button>
            </h2>
            <div id="exact-total-goals" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Exact Total Goals" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">0</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">1</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">2</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">3</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">4</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">5+</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const btsFirstSecondhalf = document.createElement('div');
    btsFirstSecondhalf.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#bts-1st-2nd-half" aria-expanded="true" aria-controls="bts-1st-2nd-half">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Both teams to score 1st half/2nd half</span>
                </button>
            </h2>
            <div id="bts-1st-2nd-half" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="BTS 1st/2nd half" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">Y/Y</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">Y/N</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">N/Y</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-12 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">N/N</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    const  secondHalf1X2andBts = document.createElement('div');
    secondHalf1X2andBts.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
        <div class="accordion-item">
        <h2 class="accordion-header">
            <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#second-half-1X2-&-bts" aria-expanded="true" aria-controls="second-half-1X2-&-bts">
                <span class="px-2"><i class="fa-solid fa-info"></i></span>
                <span>Second half 1X2 & bts</span>
            </button>
        </h2>
        <div id="second-half-1X2-&-bts" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
            <div data-market-type="Second Half 1X2 & BTS" class="accordion-body bg-navy-blue row g-1 p-1">
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & Y</div>
                        <div class="odds-value">2.01</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & Y</div>
                        <div class="odds-value">6.80</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & Y</div>
                        <div class="odds-value">2.29</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">1 & N</div>
                        <div class="odds-value">2.01</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">X & N</div>
                        <div class="odds-value">6.80</div> 
                    </button>
                </div>
                <div class="col-4 d-grid">
                    <button class="odds-btn ps-2 pe-2 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                        <div class="text-yellow prediction text-small" style="padding-top: 1px;">2 & N</div>
                        <div class="odds-value">2.29</div> 
                    </button>
                </div>
            </div>
        </div>
        </div>
    </div>
    `;

    const halftimeFulltime = document.createElement('div');
    halftimeFulltime.innerHTML = `
        <div class="accordion accordion-flush border-0 br-top-2 bg-dark mb-2" id="accordionExample">
            <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button fw-500" type="button" data-bs-toggle="collapse" data-bs-target="#Halftime/Fulltime" aria-expanded="true" aria-controls="Halftime/Fulltime">
                    <span class="px-2"><i class="fa-solid fa-info"></i></span>
                    <span>Exact total goals</span>
                </button>
            </h2>
            <div id="Halftime/Fulltime" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div data-market-type="Halftime/Fulltime" class="accordion-body bg-navy-blue row g-1 p-1">
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">1/1</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">X/1</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">2/1</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - None">
                            <div class="text-yellow prediction">1/X</div>
                            <div class="odds-value">6.80</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">X/X</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">2/X</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Away">
                            <div class="text-yellow prediction">1/2</div>
                            <div class="odds-value">2.29</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">X/2</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                    <div class="col-4 d-grid">
                        <button class="odds-btn ps-3 pe-3 d-flex justify-content-between more-odds-btns" data-prediction="Team to score first - Home">
                            <div class="text-yellow prediction">2/2</div>
                            <div class="odds-value">2.01</div> 
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `;

    container.prepend(matchsum)
    // container.prepend(matchSummary);

    if(marketOdds['Match Winner']){
        allMarkets.appendChild(fullTime);
    }
    if(marketOdds['Double Chance']){
        allMarkets.appendChild(doubleChance);
    }
    if(marketOdds['both_teams_to_score']){
        allMarkets.appendChild(btts);
    }
    if(marketOdds['highest_scoring_half']){ 
        allMarkets.appendChild(highestScoringHalf);
    }
    if(marketOdds['over_under_1.5']){
        allMarkets.appendChild(goals)
    }
    if(marketOdds['1X2']){ //update marketOdds['  ']
        allMarkets.appendChild(first10mins1X2);
    }
    if(marketOdds['first_half_1X2']){
        allMarkets.appendChild(firstHalf1X2);
    }
    if(marketOdds['first_half_goals']){
        allMarkets.appendChild(firstHalfGoals);
    }
    if(marketOdds['secondHalf1X2']){
        allMarkets.appendChild(secondHalf1X2);
    }
    // update the marketOdds[' '] of each of the following
    if(marketOdds['1X2']){
        allMarkets.appendChild(correctScore);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(totalGoalRange);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(whoWillWin);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(teamToScoreFirst);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(multiGoals);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(homeTeamGoals);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(awayTeamGoals);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(homeTeamMultigoals);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(awayTeamMultiGoals);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(firstHalfFirstGoal);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(firstHalfDoubleChance);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(firstHalfHandicap);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(firstHalfHomeTeamGoals);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(firstHalfAwayTeamGoals);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(whichTeamToScore);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(ftDoubleChanceAndOorU);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(ftDoubleChanceAndBts);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(ft1X2and0orU);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(ft1X2andBts);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(btsAndOorU2point5);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(htDoubleChanceAndBts);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(ht1X2and0orU);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(ht1X2andBts);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(secondHalhDoubleChanceAndBts);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(secondHalf1X2and0orU);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(secondHalf1X2andBts);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(highestScoringHalfHomeTeam);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(highestScoringHalfAwayTeam);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(firstHalfTotalGoals);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(secondHalfTotalGoals);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(secondHalfHomeTeamGoals);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(secondHalfAwayTeamGoals);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(secondHalfCorrectScore);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(homeWinToNill);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(awayWinToNill);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(oddOrOddHomeTeam);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(oddOrOddAwayTeam);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(exactTotalGoals);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(btsFirstSecondhalf);
    }
    if(marketOdds['1X2']){
        allMarkets.appendChild(halftimeFulltime);
    }   
}
 

function basketballMoreOddsInnerHTML(data){
    console.log(data)
    const { match_id, country , league, venue,  date, time, extras , odds} = data;
    let container = document.getElementById("all-odds-page");

    // Extract relevant odds
    let marketOdds = {};
    odds.forEach(market => {
        marketOdds[market.market_type] = market.odds;
    });

    // Helper function to safely get odds values
    function getOdds(market, selection) {
        return marketOdds[market] && marketOdds[market][selection] ? marketOdds[market][selection] : "N/A";
    }

    container.innerHTML = `
        <h4 class="text-center">BASKETBALL MORE ODDS PAGE</h4>
        <p class="text-center">${extras.home_team} vs ${extras.away_team}</p>
        `;
}


// DROPDOWN ODDS FUNCTIONS FOR DIFFERENT SPORTS
function footballOddsDropdowns(data, containers){
    if(!Array.isArray(containers) && !(containers instanceof NodeList)){
        containers = [containers];
    }

    let oddsDescOptionsArray = [];
    
    containers.forEach((item, index)=>{
        const container = item.container || item;
        // window.alert('the')

        if(!container || typeof container.querySelectorAll !== 'function'){
            window.alert(`Invalid container at index , ${index}`);
        }

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

                    // Extract relevant odds
                    let marketOdds = {};
                    game.odds.forEach(market => {
                        marketOdds[market.market_type] = market.odds;
                    });

                    // Helper function to safely get odds values
                    function getOdds(market, selection) {
                        return marketOdds[market]?.[selection] || "N/A";
                    }

                    
                    switch(selectedValue){
                        case 'full-time-1X2':
                            oddDescShortcut.innerHTML = `<span>1</span><span>X</span><span class="me-3">2</span>`;
                            oddsDescContainer.setAttribute("data-market-type", "Fulltime");
                            oddsDescContainer.innerHTML = `
                                <button class="odds-btn big-screen-odds-btn" data-prediction="1">${getOdds('1X2', 'home')}</button>
                                <button class="mx-1 odds-btn big-screen-odds-btn" data-prediction="X">${getOdds('1X2', 'draw')}</button >
                                <button class="odds-btn big-screen-odds-btn" data-prediction="2">${getOdds('1X2', 'away')}</button>`;
                                                        
                            break;

                        case 'over/under-2.5':
                            oddDescShortcut.innerHTML = `<span class="text-navy-blue">GOALS</span><span>OVER</span><span>UNDER</span>`;
                            oddsDescContainer.setAttribute("data-market-type", "Goals Over/Under");
                            oddsDescContainer.innerHTML = `
                                <span class="w-31">
                                    <span class="line fw-bold">2.5</span>
                                </span>
                                <button class="odds-btn big-screen-odds-btn mx-1" data-prediction="Over 2.5">${getOdds('over_under_2.5', 'over 2.5')}</button>
                                <button class="odds-btn big-screen-odds-btn" data-prediction="Under 2.5">${getOdds('over_under_2.5', 'under 2.5')}</button>`;
                                                    
                            break;

                        case 'over/under-1.5':
                            oddDescShortcut.innerHTML = `<span class="text-navy-blue">GOALS</span><span>OVER</span><span>UNDER</span>`;
                            oddsDescContainer.setAttribute("data-market-type", "Over/Under 1.5");
                            oddsDescContainer.innerHTML = `
                                <span class="w-31">
                                    <span class="line fw-bold">1.5</span>
                                </span>
                                <button class="odds-btn big-screen-odds-btn mx-1" data-prediction="Over">${getOdds('over_under_1.5', 'over')}</button>
                                <button class="odds-btn big-screen-odds-btn" data-prediction="Under">${getOdds('over_under_1.5', 'under')}</button>`;
                            break;

                        case 'double-chance':
                            oddDescShortcut.innerHTML = `<span>1X</span><span>12</span><span class="me-3">X2</span>`;
                            oddsDescContainer.setAttribute("data-market-type", "Double Chance");
                            oddsDescContainer.innerHTML = `
                                <button class="odds-btn big-screen-odds-btn " data-prediction="1X">${getOdds('double_chance', 'home_or_draw')}</button>
                                <button class="mx-1 odds-btn big-screen-odds-btn" data-prediction="12">${getOdds('double_chance', 'home_or_away')}</button >
                                <button class="odds-btn big-screen-odds-btn" data-prediction="X2">${getOdds('double_chance', 'draw_or_away')}</button>`;
                            break;

                        case 'highest-scoring-half':
                            oddDescShortcut.innerHTML = `<span>FIRST</span><span class="mx-2">EQUAL</span><span>SECOND</span>`;
                            oddsDescContainer.setAttribute("data-market-type", "Highest Scoring Half");
                            oddsDescContainer.innerHTML = `
                                <button class="odds-btn big-screen-odds-btn" data-prediction="First">${getOdds('highest_scoring_half', 'first')}</button>
                                <button class="mx-1 odds-btn big-screen-odds-btn" data-prediction="Equal">${getOdds('highest_scoring_half', 'equal')}</button >
                                <button class="odds-btn big-screen-odds-btn" data-prediction="Second">${getOdds('highest_scoring_half', 'second')}</button>`;                          
                            break;

                        case 'first-half-1X2':
                            oddDescShortcut.innerHTML = `<span>1</span><span>X</span><span class="me-3">2</span>`;
                            oddsDescContainer.setAttribute("data-market-type", "First Half 1X2");
                            oddsDescContainer.innerHTML = `
                                <button class="odds-btn big-screen-odds-btn" data-prediction="1">${getOdds('first_half_1X2', 'home')}</button>
                                <button class="mx-1 odds-btn big-screen-odds-btn" data-prediction="X">${getOdds('first_half_1X2', 'draw')}</button >
                                <button class="odds-btn big-screen-odds-btn" data-prediction="2">${getOdds('first_half_1X2', 'away')}</button>`;                          
                            break;

                        case 'HT-over/under-1.5':
                            oddDescShortcut.innerHTML = `<span class="text-navy-blue">GOALS</span><span>OVER</span><span>UNDER</span>`;
                            oddsDescContainer.setAttribute("data-market-type", "HT Over/Under 1.5");
                            oddsDescContainer.innerHTML = `
                                <span class="w-31">
                                    <span class="line fw-bold">1.5</span>
                                </span>
                                <button class="odds-btn big-screen-odds-btn mx-1" data-prediction="Over">${getOdds('first_half_goals', 'over_1.5')}</button>
                                <button class="odds-btn big-screen-odds-btn" data-prediction="Under">${getOdds('first_half_goals', 'under_1.5')}</}</button>`;                         
                            break;

                        case 'second-half-1X2':
                            oddDescShortcut.innerHTML = `<span>1</span><span>X</span><span class="me-3">2</span>`;
                            oddsDescContainer.setAttribute("data-market-type", "Second Half 1X2");
                            oddsDescContainer.innerHTML = `
                                <button class="odds-btn big-screen-odds-btn" data-prediction="1">${getOdds('second_half_1X2', 'home')}</button>
                                <button class="mx-1 odds-btn big-screen-odds-btn" data-prediction="X">${getOdds('second_half_1X2', 'draw')}</button >
                                <button class="odds-btn big-screen-odds-btn" data-prediction="2">${getOdds('second_half_1X2', 'away')}</button>`;                          
                            break;

                        case 'btts':
                            oddDescShortcut.innerHTML = `<span class="ms-5 ps-3">YES</span><span class="me-1">NO</span>`;
                            oddsDescContainer.setAttribute("data-market-type", "Both Teams To Score");
                            oddsDescContainer.innerHTML = `
                                <span class="w-31" data-prediction="line">
                                    <span class="line fw-bold">bts</span>
                                </span>
                                <button class="odds-btn big-screen-odds-btn mx-1" data-prediction="Yes">${getOdds('both_teams_to_score', 'yes')}</button>
                                <button class="odds-btn big-screen-odds-btn" data-prediction="No">${getOdds('both_teams_to_score', 'no')}</button>`;                        
                            break;                                        
                    }
                })
            })
        })
    })
}


function showLeaguesModal() {
    // Remove existing modal if it exists
    const existingModal = document.getElementById('leaguesModal');
    if (existingModal) {
        existingModal.remove();
        document.querySelector('.modal-backdrop')?.remove();
    }
   
    const modalHTML = document.createElement('span');

    if(Sportleagues){
        // const SportleaguesContainer = document.getElementById('sport-leagues-container');
        let spt = `${currentSport}`;
        const capitalizedSport = spt.charAt(0).toUpperCase() + spt.slice(1);

        const total_sport_games = Sportleagues.total_games;
        modalHTML.innerHTML = `<div class="modal fade" id="leaguesModal" tabindex="-1" aria-labelledby="leaguesModalLabel" aria-hidden="true">
                                <div class="modal-dialog">
                                    <div class="modal-content">
                                        <div class="modal-header text-black">
                                            <h5 class="modal-title" id="leaguesModalLabel">Select leagues</h5>
                                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                        </div>
                                        <div class="modal-body">
                                            <ul id="sport-leagues-games-list" class="modal-body my-accordion list-unstyled px-0"></ul>
                                        </div>
                                        <div class="modal-footer">
                                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                            <button type="button" class="btn btn-primary" id="applyLeaguesBtn">Apply</button>
                                        </div>
                                    </div>
                                </div>
                            </div>`;


        const SportleaguesGamesList = modalHTML.querySelector(`#sport-leagues-games-list`);

        for(const country in Sportleagues.countries){
            const total_country_games = Sportleagues.countries[country].total_games;
            const countryElement = document.createElement('li');
            countryElement.className = 'sport-league text-truncate';
            countryElement.innerHTML = `
                <div class="accordion accordion-flush" id="accordionExample">
                    <div class="accordion-item custom-accordion">
                        <h2 class="accordion-header">
                            <button class="accordion-button text-small" type="button" data-bs-toggle="collapse" data-bs-target="#${country}-leagues-list" aria-expanded="true" aria-controls="${country}-leagues-list">
                                <div class="col-9 text-truncate"><span class="me-1">⭕</span>${country}</div>
                                <div class="col-2 text-end">${total_country_games}</div>
                            </button>
                        </h2>
                        <ul id="${country}-leagues-list" class="accordion-collapse collapse list-unstyled" data-bs-parent="#accordionExample"></ul>
                    </div>
                    <hr class=" my-0">
                </div>`; 

            const CountryLeagues = Sportleagues.countries[country].leagues;
            const CountryLeaguesList = countryElement.querySelector(`#${country}-leagues-list`)

            if(Array.isArray(CountryLeagues)){
                CountryLeagues.forEach(League => {
                    const {id, league, game_count} = League;
                    const leagueElement = document.createElement('li');
                    leagueElement.innerHTML = `
                        <li class="sub-league row gx-0">
                            <span class="col-10 text-truncate">
                                <div class="row g-0 form-check">
                                    <input data-league="${league}" data-country="${country}" class="form-check-input ms-1" type="checkbox" id="league-${id}">
                                    <label class="form-check-label" for="league-${id}">${league}</label>
                                </div>
                            </span>
                            <span class="col-2 text-start text-small">${game_count}</span>
                        </li>`;

                    CountryLeaguesList.appendChild(leagueElement);   
                })
            }
            
            SportleaguesGamesList.appendChild(countryElement);


    }
    }
    
    
    // Add modal to body
    document.body.appendChild(modalHTML);
    
    // Initialize modal
    const modal = new bootstrap.Modal(document.getElementById('leaguesModal'), {
        backdrop: true,
        keyboard: true
    });
    
    // Show modal
    modal.show();
    
    // Handle apply button
    document.getElementById('applyLeaguesBtn').addEventListener('click', function() {
        const leagueIds = [];
        document.querySelectorAll('#leaguesModal .form-check-input:checked').forEach(checkbox => {
            let leagueId = Number( checkbox.id.split('-')[1]);
            leagueIds.push(leagueId);
        });

        fetchGamesByLeagues(leagueIds);
       
        modal.hide();
    });
    
    // Manually handle outside clicks if still not working
    document.getElementById('leaguesModal').addEventListener('click', function(e) {
        if (e.target === this) {
            modal.hide();
        }
    });
}


function toggleAccordion(accordionId, arrowId){
    const content = document.getElementById(accordionId);
    const arrow = document.getElementById(arrowId);

    // toggle the open on the content and arrow
    content.classList.toggle('open');
    arrow.classList.toggle('open');
}
  















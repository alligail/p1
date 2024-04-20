const http = require('http');
const url = require('url');

// Import our static data
const teams = require('./teams.json');
const all_standings = require('./standings.json');

const years = Array.from(new Set(all_standings.map(s => s.year)));
const leagues = Array.from(new Set(all_standings.map(s => s.league)));
const divisions = Array.from(new Set(all_standings.map(s => s.division)));

const heading = (title) => {
    const html = `
        <!doctype html>
            <html>
                <head>
                    <title>${title}</title>
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.min.css">
                </head>
                <body>
                    <a href='/'>Home</a>
                    <br/>
                    <h1>${title}</h1>
    `;
    return html;
}

const footing = () => {
    return `
        </body>
    </html>
    `;
}

/**
 * Creates a bullet point of the given year's season 
 * and creates a link to the page 
 */
const get_years = (year) => {
    //retrieve the leagues in the year's season
    let get_league = leagues.map(x => get_leagues(year, x)).join("");

    const year_html = `
        <ul>
            <li> 
                <p><a href='/standings/${year}'>${year} Season</a></p> 
                ${get_league}
            </li>
        </ul>`;

    return year_html;
}

/**
 * Creates a bullet point of the league based on the year specified
 * and creates a link to the page 
 */
const get_leagues = (year, league) => {
    //retrieve the divisions of the given year and league 
    const get_division = divisions.map(x => get_divisions(year, league, x)).join("");

    const league_html = `
        <ul>
            <li> 
                <a href='/standings/${year}/${league}'>${league}</a> 
                ${get_division}
            </li>
        </ul>
    `;

    return league_html;
}

/**
 * Creates a bullet point of the division based on year and league
 * and creates a link to the page 
 */
const get_divisions = (year, league, division) =>{
    const div_html = `
        <ul>
            <li> 
                <a href='/standings/${year}/${league}/${division}'>${division}</a>
            </li>
        </ul>`;

    return div_html;
}

/**
 * To create the home page where it'll show a bullet point list 
 * of seasons, leagues, and divisions 
 */
const home_menu = () =>{
    let listResult = "<p>Standings</p>";

    listResult += years.map(x => get_years(x)).join("");

    return listResult;
}

/**
 * Creating the home page of the site that will contain 
 * a menu list of the season year, leagues, and divisions 
 * @param {*} res The request from serve()
 */
const homePage = (res) =>{
    const teamsLink = `<p><a href='/teams'>Teams</a></p>`;
    const menuList = "<body>" + home_menu() + "</body>";

    const altogether = heading('Home') + teamsLink + menuList + footing();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(altogether);
    res.end();
}

/**
 * To create a table from the information in the list
 * @param {*} list An object of data to display
 * @param {*} colNames The names of each column to display on the table
 * @returns Returns a string of html to display the table
 */
const create_table = (showTeams, colNames) =>{
    let table_html = `
        <table> 
            <thead>
                <tr>`;

    //The title for each columns
    for(i in colNames){
        table_html +=  `<th>${colNames[i].toUpperCase()}</th>`;
    }
    table_html += `</tr></thead>`;

    //The content for each row
    for(const x of showTeams){
        let row = `<tr> 
            `;

        for(i in colNames){
            const currCol = colNames[i];
            if(currCol == 'logo'){
                //insert the team image logo
                row += `<td><img src = ${x[currCol]} width = "150" height = "150"></td>`;
            }else{
                //display text info 
                row += `<td>${x[currCol]}</td>`;
            }
        }

        row += `</tr>`;
        table_html += row;
    }

    table_html += `</table>`;

    return table_html;
}

/**
 * To create a page to display all the teams from the 
 * teams.json file 
 * @param {*} res The request from serve()
 */
const teamsPage = (res) => {
    //column titles for the table 
    const colTitle = ["logo", "city", "name", "code"];

    //Create a table 
    const showTable = create_table(teams, colTitle);

    //html string to display content 
    const teamsContent = heading("Teams") + showTable + footing();

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(teamsContent);
    res.end();
}

/**
 * Creates an object of information to display on the page based 
 * on the year, league, and division clicked on the web page  
 */
const createStandsList = (yr, league, division) => {
    //filters through all the standings to get a list 
    //that meets the specified parameters 
    const standList = all_standings.filter(
        function(x) {
            return (yr == x.year) && (league == "" || league == x.league) &&
            (division == "" || division == x.division);
        }
    ); 
    
    //sorting the list in descending order 
    standList.sort(
        function(x,y){
            return y.wins - x.wins;
        }
    );

    //Matching team in standings to team in teams
    for(element in standList){
        for(a in teams){
            if(teams[a].code == standList[element].team){
                standList[element].name = teams[a].name;
                standList[element].city = teams[a].city;
                standList[element].logo = teams[a].logo;
            }
        }
    }

    return standList;
}

/**
 * Creating a page for the standings 
 */
const standingsPage = (res,parts) => {
    //column titles for the table 
    const colTitle = ["logo", "city", "name", "wins","losses"];

    const length = parts.length;
    let pageTitle = "";
    let yr = "";
    let lg = "";
    let division = "";
    let table_html = ``;

    if(length == 2 && parts[1] != ''){
        //showing the standings for the season 
        yr = parts[1]; 
        pageTitle = `Standings - ${yr}`;
    }else if(length == 3 && parts[1] != '' && parts[2] != ''){
        //showing standings for season and league 
        yr = parts[1];
        lg = parts[2];
        pageTitle = `Standings - ${yr} - ${lg}`;
    }else if(length == 4 && parts[1] != '' && parts[2] != '' && parts[3] != ''){
        //showing standings for season, league, and team
        yr = parts[1];
        lg = parts[2];
        division = parts[3];
        pageTitle = `Standings - ${yr} - ${lg} - ${division}`;
    }else{
        //there was an error due to length or empty sections in parts 
        const message = `<p>There was an error and the page couldn't be created. </p>`;
        const displayMessage = heading("Page Not Found") + message + footing();
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.write(displayMessage);
        res.end();
        return;
    }

    let sList = createStandsList(yr, lg, division);
    table_html = create_table(sList, colTitle);
    const standingsContent = heading(pageTitle) + table_html + footing();

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(standingsContent);
    res.end();
}

const serve = (req, res) => {
    const uri = url.parse(req.url).pathname;
    const parts = uri.split('/').splice(1);
    // parts[0] is going to be 'teams', 'standings', or '' - '' (homepage)

    if(parts[0] == 'teams'){
        //go to the teams page 
        teamsPage(res);
        return; 
    }else if (parts[0] == 'standings'){
        //go to the standings page 
        standingsPage(res, parts);
        return;
    }else if(parts[0] == '' || parts.length == 0){
        //go to homepage 
        homePage(res);
        return;
    }else{
        //An error occured 
        const message = `<p>There was an error and the page couldn't be created.</p>`;
        const displayMessage = heading("Page Not Found") + message + footing();
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.write(displayMessage);
        res.end();
        return;
    }
}

http.createServer(serve).listen(3000);
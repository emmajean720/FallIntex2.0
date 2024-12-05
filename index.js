require('dotenv').config(); // Load environment variables from .env file

// ===== Import Required Libraries =====
const express = require("express");
const path = require("path");
const session = require("express-session");

// Initialize Express App
const app = express();
const port = process.env.PORT || 5500; // Port setting from environment variables or default to 5500

// ===== Set Up View Engine =====
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


// Serve Static Files from 'public' Folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Set Up Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key', // Use a secure session secret from .env
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure: true if using HTTPS
}));


// Make User Session Available in All Views
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// ===== Database Connection Using Knex =====
const knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.RDS_HOSTNAME,
        user: process.env.RDS_USERNAME,
        password: String(process.env.RDS_PASSWORD), // Ensure password is a string
        database: process.env.RDS_DB_NAME,
        port: process.env.RDS_PORT || 5432,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false // SSL setting based on DB_SSL env variable
    }
});

// ======= Function to make first letter capalized and others lower case (for city, names, etc)=======
function capitalizeFirstLetter(string) {
    return string
        .split(' ') // Split the string into words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize first letter of each word
        .join(' '); // Join the words back together
}

// State Abbreviations Mapping
const stateAbbreviations = {
    1: 'AL', 2: 'AK', 3: 'AZ', 4: 'AR', 5: 'CA', 6: 'CO', 7: 'CT', 8: 'DE', 9: 'FL', 10: 'GA',
    11: 'HI', 12: 'ID', 13: 'IL', 14: 'IN', 15: 'IA', 16: 'KS', 17: 'KY', 18: 'LA', 19: 'ME', 20: 'MD',
    21: 'MA', 22: 'MI', 23: 'MN', 24: 'MS', 25: 'MO', 26: 'MT', 27: 'NE', 28: 'NV', 29: 'NH', 30: 'NJ',
    31: 'NM', 32: 'NY', 33: 'NC', 34: 'ND', 35: 'OH', 36: 'OK', 37: 'OR', 38: 'PA', 39: 'RI', 40: 'SC',
    41: 'SD', 42: 'TN', 43: 'TX', 44: 'UT', 45: 'VT', 46: 'VA', 47: 'WA', 48: 'WV', 49: 'WI', 50: 'WY'
};

// ===== Helper Functions =====

// Check If User is Authenticated
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.redirect('/login');
    }
}

// Check If User is an Admin
function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.is_admin) {
        return next();
    } else {
        res.redirect('/volunteerhome'); // Redirect to a non-admin page for regular users
    }
}

// ===== Routes =====

// === Public Pages ===

// Home Page
app.get('/', (req, res) => {
    res.render('homepage', { error: null, title: "Turtle Shelter Project" });
});

// About Page
app.get('/about', (req, res) => {
    res.render("about", { error: null, title: "About Us - Turtle Shelter Project" });
});

// Volunteer Page
app.get('/volunteer', (req, res) => {
    res.render("volunteer", { error: null, title: "Volunteer - Turtle Shelter Project" });
});

// Donate Page
app.get('/donate', (req, res) => {
    res.render("donate", { error: null, title: "Donate - Turtle Shelter Project" });
});

// Login Page
app.get('/login', (req, res) => {
    res.render("login", { error: null, title: "Login - Turtle Shelter Project" });
});

// Handle Login Form Submission
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    knex('users')
        .where({ login: username, password }) // Plaintext password matching
        .first()
        .then(user => {
            if (user) {
                req.session.user = {
                    id: user.usercode,
                    username: user.login,
                    firstname: user.firstname, // Store the user's first name for personalized greeting
                    is_admin: user.is_admin
                };
                // Redirect based on the user role (admin or volunteer)
                user.is_admin ? res.redirect('/admin') : res.redirect('/volunteerhome');
            } else {
                res.render("login", { error: "Invalid username or password", title: "Login - Turtle Shelter Project" });
            }
        })
        .catch(err => {
            console.error("Error during login:", err);
            res.render("login", { error: "An unexpected error occurred. Please try again.", title: "Login - Turtle Shelter Project" });
        });
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error("Error during logout:", err);
        res.redirect('/login');
    });
});


// === Protected Pages ===

// Volunteer Landing Page (Luke)
app.get('/volunteerhome', isAuthenticated, (req, res) => {
    const usercode = req.session.user.id; // Get the logged-in user's usercode

    // Fetch only events that are approved and the user hasn't signed up for
    knex('event')
        .leftJoin('volunteersatevents', function() {
            this.on('event.eventcode', '=', 'volunteersatevents.eventcode')
                .andOn('volunteersatevents.usercode', '=', knex.raw('?', [usercode]));
        })
        .select('event.*')
        .where('event.status', 'approved')
        .whereNull('volunteersatevents.eventcode') // Events not signed up for by the user
        .then(events => {
            res.render('volunteerhome', {
                title: "Volunteer Home - Available Events",
                events: events,
                error: null,
                success: null
            });
        })
        .catch(error => {
            console.error('Error fetching events:', error);
            res.render('volunteerhome', {
                title: "Volunteer Home - Available Events",
                events: [],
                error: "Failed to load events. Please try again.",
                success: null
            });
        });
});

// sign up for an event
app.post('/volunteerhome/signup', isAuthenticated, (req, res) => {
    const user = req.session.user;

    if (!user || !user.id) {
        return res.render('login', { error: 'Please log in to sign up for events.' });
    }

    const usercode = user.id;
    const { eventcodes } = req.body;

    if (!eventcodes) {
        return res.redirect('/volunteerhome');
    }

    // Convert eventcodes to an array if it's a single value
    const eventsToSignUp = Array.isArray(eventcodes) ? eventcodes : [eventcodes];

    // Prepare insert data for each event the volunteer signed up for
    const insertData = eventsToSignUp.map(eventcode => ({
        usercode: usercode,
        eventcode: eventcode
    }));

    knex('volunteersatevents')
        .insert(insertData)
        .then(() => {
            // Fetch the events again to show the updated list on the page after sign-up
            knex('event')
                .select('*')
                .where('status', 'approved')
                .then(events => {
                    res.render('volunteerhome', {
                        title: "Volunteer Home - Available Events",
                        events: events,
                        error: null,
                        success: "You have successfully signed up for the selected events!"
                    });
                })
                .catch(error => {
                    console.error('Error fetching events:', error);
                    res.render('volunteerhome', {
                        title: "Volunteer Home - Available Events",
                        events: [],
                        error: "Failed to reload events after sign-up. Please try again.",
                        success: "You have successfully signed up for the selected events!"
                    });
                });
        })
        .catch(error => {
            console.error('Error signing up for events:', error);
            res.render('volunteerhome', {
                title: "Volunteer Home - Available Events",
                events: [],
                error: "Failed to sign up for events. Please try again.",
                success: null
            });
        });
});

//Volunteer my events page(luke)
app.get('/myevents', isAuthenticated, (req, res) => {
    const user = req.session.user;

    if (!user || !user.id) {
        return res.render('login', { error: 'Please log in to view your events.' });
    }

    const usercode = user.id;

    // Query to get the events that the user has signed up for
    knex('volunteersatevents')
        .join('event', 'volunteersatevents.eventcode', '=', 'event.eventcode')
        .select('event.organization', 'event.eventstarttime', 'event.eventstoptime','event.eventcity','event.statecode', 'event.status')
        .where('volunteersatevents.usercode', usercode)
        .then(events => {
            res.render('myevents', {
                title: "My Events - Turtle Shelter Project",
                events: events,
                error: null
            });
        })
        .catch(error => {
            console.error('Error fetching signed up events:', error);
            res.render('myevents', {
                title: "My Events - Turtle Shelter Project",
                events: [],
                error: "Failed to load your events. Please try again."
            });
        });
});

// ====== Admin Page Routes =======

// Admin Landing Page
app.get('/admin', isAuthenticated, isAdmin, (req, res) => {
    res.render("admin", { error: null, title: "Admin Home - Turtle Shelter Project" });
});

// Manage Users Page
// Admin Management Page
app.get('/adminmanage', isAuthenticated, isAdmin, (req, res) => {
    const { search } = req.query;
    let query = knex('users').select('*'); // Initialize the query

    if (search) {
        query = query.andWhere(function() {
            this.where('firstname', 'ilike', `%${search}%`)  // Search in firstname
                .orWhere('lastname', 'ilike', `%${search}%`); // Search in lastname
        });
    }
        
    query
        .orderBy('is_admin', 'desc')
        .orderBy('firstname')
        .orderBy('lastname')
        .then(users => {
            // Map statecode to state_abbr for display in the table
            users = users.map(user => ({
                ...user,
                state_abbr: stateAbbreviations[user.statecode] || 'N/A' // Display state abbreviation
            }));

            res.render("adminmanage", {
                error: null,
                title: "Admin Management - Turtle Shelter Project",
                users,
                stateAbbreviations,
                user: req.session.user // Pass the logged-in user data to the view
            });
        })
        .catch(err => {
            console.error("Error fetching users:", err);
            res.render("adminmanage", {
                error: "An error occurred fetching users",
                title: "Admin Management - Turtle Shelter Project",
                users: [],
                stateAbbreviations,
                user: req.session.user // Pass the logged-in user data to the view
            });
        });
});

// Update Admin Status
app.post('/update-admin-status/:usercode', isAuthenticated, isAdmin, (req, res) => {
    const { usercode } = req.params;
    const { is_admin } = req.body;

    knex('users')
        .where('usercode', usercode)
        .update({ is_admin: is_admin === 'true' })
        .then(() => res.redirect('/adminmanage'))
        .catch(err => {
            console.error("Error updating admin status:", err);
            res.redirect('/adminmanage');
        });
});

// Delete User
app.post('/delete-user/:usercode', isAuthenticated, isAdmin, (req, res) => {
    const { usercode } = req.params;
    
    knex('volunteeravailability')
                .where('volunteercode', usercode)
                .del()
        .then(() => { 
            return knex('volunteersatevents')
                .where('usercode', usercode)
                .del();
        })
        .then(() => { 
            return knex('users')
            .where('usercode', usercode)
            .del();
        })
        .then(() => res.redirect('/adminmanage'))
        .catch(err => {
            console.error("Error deleting user:", err);
            res.redirect('/adminmanage');
        });
});

// Create Admin Account
app.post('/create-admin', isAuthenticated, isAdmin, (req, res) => {
    const firstname = req.body.firstname;
    const lastname = req.body.lastname;
    const email = req.body.email;
    const phone = req.body.phone;
    const city = req.body.city;
    const state_abbr = req.body.state_abbr;
    const login = req.body.login;
    const password = req.body.password;

    // Find the statecode based on the abbreviation selected
    const statecode = Object.keys(stateAbbreviations).find(key => stateAbbreviations[key] === state_abbr);

    // If the state_abbr is not valid, return an error
    if (!statecode) {
        return res.render("adminmanage", {
            error: "Invalid state abbreviation",
            title: "Admin Management - Turtle Shelter Project",
            users: []
        });
    }

// Insert new admin user into the 'users' table (no password hashing)
    knex('users')
        .insert({
            firstname: firstname.toLowerCase(),
            lastname: lastname.toLowerCase(),
            email: email,
            phone: phone,
            city: city,
            statecode: parseInt(statecode), // Save the numeric state code
            login: login,
            password: password,  // Store the password as is (not hashed)
            is_admin: true
        })
        .then(() => {
            res.redirect('/adminmanage');
        })
        .catch(err => {
            console.error("Error creating new admin:", err);
            res.render("adminmanage", {
                error: "An error occurred while creating the admin account. Please try again.",
                title: "Admin Management - Turtle Shelter Project",
                users: []
            });
        });
});

// Event Management Page - McKenna
app.get('/eventmanage', isAuthenticated, isAdmin, (req, res) => {
    knex('event')
        .leftJoin('eventsummary', 'event.eventcode', 'eventsummary.eventcode')  // Join eventsummary table on eventcode
        .leftJoin('state', 'event.statecode', 'state.statecode')
        .leftJoin('discovered', 'event.discoveredcode', 'discovered.discoveredcode')
        .leftJoin('servicetypes', 'event.servicetypecode', 'servicetypes.servicetypecode')
        .select('event.*' || null, 
            'state.description as state_description',
            'discovered.description as discovered_description',
            'servicetypes.servicedescription',
            'eventsummary.vestcut' || 0, 
            'eventsummary.vestpin' || 0, 
            'eventsummary.collarcut' || 0, 
            'eventsummary.vestsewn' || 0, 
            'eventsummary.collarpin' || 0, 
            'eventsummary.collarsewn' || 0, 
            'eventsummary.envelopecut' || 0, 
            'eventsummary.envelopesewn' || 0, 
            'eventsummary.envelopecut' || 0, 
            'eventsummary.envelopepin' || 0, 
            'eventsummary.pocketcut' || 0, 
            'eventsummary.pocketssewn' || 0, 
            'eventsummary.pocketpin' || 0, 
            'eventsummary.xscompleted' || 0, 
            'eventsummary.scompleted' || 0, 
            'eventsummary.mcompleted' || 0, 
            'eventsummary.lcompleted' || 0, 
            'eventsummary.xlcompleted' || 0, 
            'eventsummary.xxlcompleted' || 0, 
            'eventsummary.xxxlcompleted' || 0, 
            'eventsummary.xxxxlcompleted' || 0,)  // Select all columns from both tables
        .then(events => {
            res.render("eventmanage", { error: null, title: "Event Management - Turtle Shelter Project", events });
        })
        .catch(err => {
            console.error("Error fetching events:", err);
            res.render("eventmanage", { error: "An error occurred fetching events", title: "Event Management - Turtle Shelter Project", events: [] });
        });
});

// Update Event Status
app.post('/update-event-status/:eventcode', isAuthenticated, isAdmin, (req, res) => {
    const { eventcode } = req.params;
    const status = req.body.status;

    knex('event')
        .where('eventcode', eventcode)
        .update({
            status: status.toLowerCase() })
        .then(() => res.redirect('/eventmanage'))
        .catch(err => {
            console.error("Error updating event status:", err);
            res.redirect('/eventmanage');
        });
});

// Delete Event
app.post('/delete-event/:eventcode', isAuthenticated, isAdmin, (req, res) => {
    const { eventcode } = req.params;

    knex('event')
        .where('eventcode', eventcode)
        .del()
        .then(() => res.redirect('/eventmanage'))
        .catch(err => {
            console.error("Error deleting event:", err);
            res.redirect('/eventmanage');
        });
});

// Edit Event OG
app.post('/edit-event/:eventcode', isAuthenticated, isAdmin, (req, res) => {
    const { eventcode } = req.params;
    const organization = req.body.organization;
    const eventstarttime = req.body.eventstarttime;
    const eventstoptime = req.body.eventstoptime;
    const orgfirstname = req.body.orgfirstname;
    const orglastname = req.body.orglastname;
    const status = req.body.status;
    const orgemail = req.body.orgemail;
    const orgphone = req.body.phone;
    const discoveredcode = req.body.discoveredcode;
    const servicetypecode = req.body.servicetypecode;
    const basicskills = req.body.basicskills;
    const advanced = req.body.advanced;
    const sewingmachines = req.body.sewingmachines;
    const sergers = req.body.sergers;
    const comments = req.body.comments;
    const expectedparticipants = req.body.expectedparticipants;
    const storyshared = req.body.storyshared;
    const newsletter = req.body.newsletter;
    const eventcity = req.body.city;
    const statecode = req.body.statecode;
    const eventaddress = req.body.eventaddress;
    const payfor = req.body.payfor;

    knex('event')
        .where('eventcode', eventcode)
        .update({ 
            organization: organization.toLowerCase(),
            orgfirstname: orgfirstname.toLowerCase(),
            orglastname: orglastname.toLowerCase(),
            orgemail: orgemail.toLowerCase(),
            orgphone: orgphone,
            eventstarttime: eventstarttime,
            eventstoptime: eventstoptime,
            eventaddress: eventaddress.toLowerCase(),
            eventcity: eventcity.toLowerCase(),
            statecode: parseInt(statecode),
            discoveredcode: parseInt(discoveredcode),
            expectedparticipants: parseInt(expectedparticipants),
            servicetypecode: parseInt(servicetypecode),
            basicskills: parseInt(basicskills),
            advancedskills: parseInt(advanced),
            sewingmachines: parseInt(sewingmachines),
            sergers: parseInt(sergers),
            payfor: payfor,
            storyshared: storyshared,
            orgnewsletter: newsletter,
            comments: comments,
            status: status.toLowerCase()
        })
        .then(() => res.redirect('/eventmanage'))
        .catch(err => {
            console.error("Error updating event:", err);
            res.redirect('/eventmanage');
        });
});


// Add event summary details - McKenna OG
app.post('/complete-event/:eventcode', isAuthenticated, isAdmin, (req, res) => {
    console.log('Route reached');
    console.log('Event Code:', req.params.eventcode);
    console.log('Request Body:', req.body);
    const { eventcode } = req.params;
    const { actualparticipation, vestcut, vestpin, vestsewn, collarcut, collarpin, collarsewn, envelopecut, envelopepin, envelopesewn, pocketcut, pocketpin, pocketssewn, xscompleted, scompleted, mcompleted, lcompleted, xlcompleted, xxlcompleted, xxxlcompleted, xxxxlcompleted, status } = req.body;
    knex('eventsummary')
        .insert({
            actualparticipation: parseInt(actualparticipation, 10) || 0,
            vestcut: parseInt(vestcut, 10) || 0,
            vestpin: parseInt(vestpin, 10) || 0,
            vestsewn: parseInt(vestsewn, 10) || 0,
            collarcut: parseInt(collarcut, 10) || 0,
            collarpin: parseInt(collarpin, 10) || 0,
            collarsewn: parseInt(collarsewn, 10) || 0,
            envelopecut: parseInt(envelopecut, 10) || 0,
            envelopepin: parseInt(envelopepin, 10) || 0,
            envelopesewn: parseInt(envelopesewn, 10) || 0,
            pocketcut: parseInt(pocketcut, 10) || 0,
            pocketpin: parseInt(pocketpin, 10) || 0,
            pocketssewn: parseInt(pocketssewn, 10) || 0,
            xscompleted: parseInt(xscompleted, 10) || 0,
            scompleted: parseInt(scompleted, 10) || 0,
            mcompleted: parseInt(mcompleted, 10) || 0,
            lcompleted: parseInt(lcompleted, 10) || 0,
            xlcompleted: parseInt(xlcompleted, 10) || 0,
            xxlcompleted: parseInt(xxlcompleted, 10) || 0,
            xxxlcompleted: parseInt(xxxlcompleted, 10) || 0,
            xxxxlcompleted: parseInt(xxxxlcompleted, 10) || 0,
            eventcode: eventcode
        })
        .then(() => {
            return knex('event')
            .where('eventcode', eventcode)  // Find the event by its eventcode
            .update({
                status: 'completed',  // Update the status field
            });
            res.send('Event summary uploaded successfully!')
            res.redirect('/eventmanage');}
            
        )
        .catch(err => {
            console.error("Error adding summary:", err);
            res.redirect('/eventmanage');
        });
});

// ===== Test the Database Connection =====
(async () => {
    try {
        const result = await knex.raw('SELECT 1+1 AS result'); // Simple query to test connection
        console.log("Database connected successfully:", result.rows);
    } catch (error) {
        console.error("Database connection failed:", error.message);
    }
})();

//create account feature
app.post('/create-account', (req, res) => {
    let dayofWeek = ["m", "t", "w", "th", "f", "s"];
    
    // Initialize availability variables for each day
    let mavailability = 0, tavailability = 0, wavailability = 0, thavailability = 0, favailability = 0, savailability = 0;
    
    // Extract form data
    const firstname = req.body.firstname || ' ';
    const lastname = req.body.lastname || ' '; 
    const email = req.body.email || ' '; 
    const phone = req.body.phone; 
    const city = req.body.city;
    const startdate = req.body.startdate || new Date().toISOString().split('T')[0];
    const statecode = parseInt(req.body.statecode, 10); 
    const discoveredcode = parseInt(req.body.discoveredcode, 10); 
    const skilllevelcode = parseInt(req.body.skilllevelcode, 10);
    const commithours = parseInt(req.body.commithours, 10);
    const traveldistance = parseInt(req.body.traveldistance, 10);
    const is_leading = req.body.leading;
    const newsletter = req.body.newsletter;
    const login = req.body.login;
    const password = req.body.password;
    const confirmpassword = req.body.confirmpassword;
    const admin = req.body.admin;
    
    // Starting point for availability codes
    let availabilityBase = {
        "m": 1,  // Monday starts at 1
        "t": 9,  // Tuesday starts at 9 (multiples of 8)
        "w": 17, // Wednesday starts at 17
        "th": 25, // Thursday starts at 25
        "f": 33, // Friday starts at 33
        "s": 41  // Saturday starts at 41
    };

    // Loop through days of the week to capture availability
    for (let i = 0; i < dayofWeek.length; i++) {
        let dayKey = dayofWeek[i] + "availability";
        let morning = req.body[dayofWeek[i] + "m"];
        let afternoon = req.body[dayofWeek[i] + "a"];
        let evening = req.body[dayofWeek[i] + "e"];
        let none = req.body[dayofWeek[i] + "n"];

        // Assign availability codes based on checked boxes for each day
        let availabilityCode = availabilityBase[dayofWeek[i]];  // Starting point for that day

        if (morning === 'm' && afternoon === 'a' && evening === 'e') {
            availabilityCode += 6; // Morning, Afternoon, Evening
        } else if (morning === 'm' && afternoon === 'a') {
            availabilityCode += 3; // Morning and Afternoon
        } else if (morning === 'm' && evening === 'e') {
            availabilityCode += 4; // Morning and Evening
        } else if (morning === 'm') {
            availabilityCode += 0; // Morning only
        } else if (afternoon === 'a' && evening === 'e') {
            availabilityCode += 5; // Afternoon and Evening
        } else if (evening === 'e') {
            availabilityCode += 2; // Evening only
        } else if (afternoon === 'a') {
            availabilityCode += 1; // Afternoon only
        } else if (none === 'n') {
            availabilityCode += 7; // None
        }

        // Assign these calculated values to the corresponding availability variables
        switch(dayofWeek[i]) {
            case "m": mavailability = availabilityCode; break;
            case "t": tavailability = availabilityCode; break;
            case "w": wavailability = availabilityCode; break;
            case "th": thavailability = availabilityCode; break;
            case "f": favailability = availabilityCode; break;
            case "s": savailability = availabilityCode; break;
        }
    }

    // Check if passwords match
    if (password !== confirmpassword) {
        return res.render("login", { error: "Passwords do not match", title: "Create Account - Turtle Shelter Project" });
    }

    // Insert the new user into the database
    knex('users')
        .insert({
            firstname: firstname.toLowerCase(),
            lastname: lastname.toLowerCase(),
            email: email,
            phone: phone,
            city: city.toLowerCase(),
            statecode: parseInt(statecode),
            discoveredcode: parseInt(discoveredcode), 
            skilllevelcode: parseInt(skilllevelcode), 
            commithours: parseInt(commithours), 
            traveldistance: parseInt(traveldistance), 
            is_leading: is_leading, 
            newsletter: newsletter, 
            login: login,
            password: password, // Store plaintext password (Note: NOT SECURE)
            startdate: startdate,
            is_admin: admin // Default role for new users
        })
        .returning('usercode')
    .then((result) => {
        // Access the first element of the result array, which contains the usercode
        const usercode = result[0].usercode;
        
        console.log("Availability codes being inserted:", mavailability, tavailability, wavailability, thavailability, favailability, savailability);

        // Now insert the availability data using the correct usercode
        return knex('volunteeravailability')
            .insert([
                { volunteercode: usercode, availabilitycode: mavailability },
                { volunteercode: usercode, availabilitycode: tavailability },
                { volunteercode: usercode, availabilitycode: wavailability },
                { volunteercode: usercode, availabilitycode: thavailability },
                { volunteercode: usercode, availabilitycode: favailability },
                { volunteercode: usercode, availabilitycode: savailability }
            ])
            .onConflict(['volunteercode', 'availabilitycode'])  // Check for conflict based on both columns
            .ignore();  // Ignore the insert if a duplicate combination of volunteercode and availabilitycode exists
    })
    .then(() => {
        res.redirect("/login");
    })
    .catch(err => {
        console.error("Error creating account:", err);
        res.render("homepage", { error: "An unexpected error occurred when trying to create the account. Please try again.", title: "Turtle Shelter Project" });
    });
});

//Admin Calendar (luke)
    app.get('/admincalendar', isAuthenticated, isAdmin, (req, res) => {
        // Get today's date in the format needed for querying (e.g., '2024-12-04')
        const today = new Date();
        const todayFormatted = today.toISOString().split('T')[0];
    
        // Calculate one week from today
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        const nextWeekFormatted = nextWeek.toISOString().split('T')[0];
    
        // Fetch events from the database for the upcoming week
        knex('event')
            .select('*')
            .where('eventstarttime', '>=', todayFormatted) // Start from today
            .andWhere('eventstarttime', '<', nextWeekFormatted) // Until the end of the next week
            .then(events => {
                res.render("admincalendar", { 
                    error: null, 
                    title: "Admin Calendar - Turtle Shelter Project",
                    events: events // Pass fetched events to the template
                });
            })
            .catch(error => {
                console.error("Error fetching events:", error);
                res.render("admincalendar", {
                    error: "Failed to load events",
                    title: "Admin Calendar - Turtle Shelter Project",
                    events: []
                });
            });
    });

// Handle Event Request Form - Kylee
app.post('/eventrequest', (req, res) => {
    const organization = (req.body.organization || '').toLowerCase();
    const orgfirstname = (req.body.orgfirstname || '').toLowerCase();
    const orglastname = (req.body.orglastname || '').toLowerCase();
    const orgemail = (req.body.orgemail || '').toLowerCase();
    const orgphone = req.body.orgphone || null;
    const eventstarttime = req.body.eventstarttime || null;
    const eventstoptime = req.body.eventstoptime || null;
    const eventaddress = (req.body.eventaddress || '').toLowerCase();
    const eventcity = (req.body.eventcity || '').toLowerCase();
    const statecode = parseInt(req.body.statecode) || null;
    const discoveredcode = parseInt(req.body.discoveredcode) || null;
    const expectedparticipants = parseInt(req.body.expectedparticipants) || null;
    const servicetypecode = parseInt(req.body.servicetypecode) || null;
    const basicskills = parseInt(req.body.basicskills) || null;
    const advancedskills = parseInt(req.body.advanced) || null;
    const sewingmachines = parseInt(req.body.sewingmachines) || null;
    const sergers = parseInt(req.body.sergers) || null;
    const payfor = req.body.payfor === 'true';
    const storyshared = req.body.storyshared === 'true';
    const newsletter = req.body.newsletter === 'true';
    const comments = req.body.comments || '';
    const status = "pending";

    knex('event')
        .insert({
            organization,
            orgfirstname,
            orglastname,
            orgemail,
            orgphone,
            eventstarttime,
            eventstoptime,
            eventaddress,
            eventcity,
            statecode,
            discoveredcode,
            expectedparticipants,
            servicetypecode,
            basicskills,
            advancedskills,
            sewingmachines,
            sergers,
            payfor,
            storyshared,
            orgnewsletter: newsletter,
            comments,
            status
        })
        .then(() => {
            res.redirect('/');
        })
        .catch(err => {
            console.error("Error creating event:", err);
            res.render("homepage", {
                error: "An unexpected error occurred while trying to create the event. Please try again.",
                title: "Turtle Shelter Project"
            });
        });
});


// Handle Event Request Form from admin- McKenna (using Kylee's)
app.post('/eventrequestadmin', (req, res) => {
    const organization = req.body.organization || ' ';
    const orgfirstname = req.body.orgfirstname || ' ';
    const orglastname = req.body.orglastname || ' ';
    const orgemail = req.body.orgemail || ' ';
    const orgphone = req.body.orgphone;
    const eventstarttime = req.body.eventstarttime;
    const eventstoptime = req.body.eventstoptime;
    const eventaddress = req.body.eventaddress;
    const eventcity = req.body.eventcity
    const statecode = req.body.statecode
    const discoveredcode = req.body.discoveredcode
    const expectedparticipants = req.body.expectedparticipants
    const servicetypecode = req.body.servicetypecode
    const basicskills = req.body.basicskills || null;
    const advanced = req.body.advanced || null;
    const sewingmachines = req.body.sewingmachines || null;
    const sergers = req.body.sergers || null;
    const payfor = req.body.payfor === 'true' ? true : false;
    const storyshared = req.body.storyshared === 'true' ? true : false;
    const newsletter = req.body.newsletter=== 'true' ? true : false;
    const comments = req.body.comments;
    const status = "pending";

    knex('event')
    .insert({
        organization: organization.toLowerCase(),
        orgfirstname: orgfirstname.toLowerCase(),
        orglastname: orglastname.toLowerCase(),
        orgemail: orgemail.toLowerCase(),
        orgphone: orgphone,
        eventstarttime: eventstarttime,
        eventstoptime: eventstoptime,
        eventaddress: eventaddress.toLowerCase(),
        eventcity: eventcity.toLowerCase(),
        statecode: parseInt(statecode),
        discoveredcode: parseInt(discoveredcode),
        expectedparticipants: parseInt(expectedparticipants),
        servicetypecode: parseInt(servicetypecode),
        basicskills: parseInt(basicskills),
        advancedskills: parseInt(advanced),
        sewingmachines: parseInt(sewingmachines),
        sergers: parseInt(sergers),
        payfor: payfor,
        storyshared: storyshared,
        orgnewsletter: newsletter,
        comments: comments,
        status: status.toLowerCase()

    })
    .then(() => {
        res.redirect('/eventmanage');
    })
    .catch(err => {
        console.error("Error creating account:", err);
        res.render("homepage", { error: "An unexpected error when trying to create the event. Please try again.", title: "Request Event - Turtle Shelter Project" });
    });
})

//vest receiver form (luke)
// Display the form for vest receivers and the current year's records
// Display the form for vest receivers and the current year's records
app.get('/adminvest-receiver', isAuthenticated, isAdmin, async (req, res) => {
    const currentYear = new Date().getFullYear();
    const { search } = req.query;

    try {
        let query = knex('receivers')
            .select('*')
            .whereRaw('EXTRACT(YEAR FROM date) = ?', [currentYear]);

        // If search query is provided, filter by name
        if (search) {
            query = query.andWhere(function() {
                this.where('recfirstname', 'ilike', `%${search}%`)
                    .orWhere('reclastname', 'ilike', `%${search}%`);
            });
        }

        const receivers = await query;

        // Render the form and pass the records to the view
        res.render('vestReceiverForm', { 
            title: "Add Vest Receiver - Admin",
            error: null,
            success: null,
            receivers: receivers // Pass receivers data to the template
        });
    } catch (error) {
        console.error('Error fetching receivers:', error);
        res.render('vestReceiverForm', { 
            title: "Add Vest Receiver - Admin",
            error: "Failed to load receivers data.",
            success: null,
            receivers: [] // Pass an empty array if there's an error
        });
    }
});


// Handle the form submission to add a new vest receiver
app.post('/adminvest-receiver', isAuthenticated, isAdmin, async (req, res) => {
    const recfirstname = req.body.recfirstname;
    const reclastname = req.body.reclastname;
    const date = req.body.date;
    const city = req.body.city;
    const statecode = req.body.statecode; 
    const age = req.body.age
    const gender = req.body.gender 
    const size = req.body.size

    try {
        // Check for existing record to prevent duplicates
        const existingRecord = await knex('receivers')
            .select('*')
            .where({
                recfirstname,
                reclastname,
                date,
            })
            .first();

        if (existingRecord) {
            throw new Error("Record already exists for this person and date.");
        }

        // Insert the new receiver data into the receivers table
        await knex('receivers').insert({
            recfirstname: recfirstname.toLowerCase(),
            reclastname: reclastname.toLowerCase(),
            date : date,
            city : city.toLowerCase(),
            statecode: statecode,
            age: parseInt(age),
            gender: gender,
            size: size
        });

        // Fetch the updated list of vest receivers for the current year
        const currentYear = new Date().getFullYear();
        const receivers = await knex('receivers')
            .select('*')
            .whereRaw('EXTRACT(YEAR FROM date) = ?', [currentYear]);

        // Reload the form after successful submission and pass updated records
        res.render('vestReceiverForm', { 
            title: "Add Vest Receiver - Admin",
            error: null,
            success: "Vest receiver added successfully!",
            receivers: receivers // Pass updated receivers to the template
        });
    } catch (error) {
        console.error('Error inserting vest receiver:', error);
        
        // Fetch the list of vest receivers even if there is an error
        const currentYear = new Date().getFullYear();
        let receivers = [];
        try {
            receivers = await knex('receivers')
                .select('*')
                .whereRaw('EXTRACT(YEAR FROM date) = ?', [currentYear]);
        } catch (fetchError) {
            console.error('Error fetching receivers:', fetchError);
        }

        res.render('vestReceiverForm', { 
            title: "Add Vest Receiver - Admin",
            error: error.message || "Failed to add vest receiver. Please try again.",
            success: null,
            receivers: receivers // Pass receivers to the template to show in case of error
        });
    }
});

// ===== Start the Server =====
app.listen(port, () => console.log(`Express App has started and server is listening on port ${port}!`));

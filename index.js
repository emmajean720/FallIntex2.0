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
                    is_admin: user.is_admin
                };
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
    const user = req.session.user;

    if (!user || !user.id) {
        return res.render('login', { error: 'Please log in to view volunteer opportunities.' });
    }

    knex('event')
        .select('*')
        .where('status', 'approved') // Fetch only events that volunteers can join
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

//my events page(luke)
app.get('/myevents', isAuthenticated, (req, res) => {
    const user = req.session.user;

    if (!user || !user.id) {
        return res.render('login', { error: 'Please log in to view your events.' });
    }

    const usercode = user.id;

    // Query to get the events that the user has signed up for
    knex('volunteersatevents')
        .join('event', 'volunteersatevents.eventcode', '=', 'event.eventcode')
        .select('event.organization', 'event.eventstarttime', 'event.eventstoptime', 'event.status')
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


// Admin Landing Page
app.get('/admin', isAuthenticated, isAdmin, (req, res) => {
    res.render("admin", { error: null, title: "Admin Home - Turtle Shelter Project" });
});

// Admin Management Page
app.get('/adminmanage', isAuthenticated, isAdmin, (req, res) => {
    knex('users')
        .select('*')
        .then(users => {
            users = users.map(user => ({
                ...user,
                state_abbr: stateAbbreviations[user.statecode] || 'N/A'
            }));
            res.render("adminmanage", { error: null, title: "Admin Management - Turtle Shelter Project", users });
        })
        .catch(err => {
            console.error("Error fetching users:", err);
            res.render("adminmanage", { error: "An error occurred fetching users", title: "Admin Management - Turtle Shelter Project", users: [] });
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

    knex('users')
        .where('usercode', usercode)
        .del()
        .then(() => res.redirect('/adminmanage'))
        .catch(err => {
            console.error("Error deleting user:", err);
            res.redirect('/adminmanage');
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
    const { status } = req.body;

    knex('event')
        .where('eventcode', eventcode)
        .update({ status })
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
    const { organization, eventstarttime, eventstoptime, orgfirstname, orglastname, status } = req.body;

    knex('event')
        .where('eventcode', eventcode)
        .update({ organization, eventstarttime, eventstoptime, orgfirstname, orglastname, status })
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

// Handle Account Creation Form Submission - Kylee
app.post('/create-account', (req, res) => {
    let dayofWeek = ["m", "t","w", "th", "f", "s"];
    let availability = { 
        "m": 1,
        "t": 2,
        "w": 3,
        "th": 4,
        "f": 5,
        "s": 6
    }
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
    let iCount = 0;

    // Loop through days of the week
    for (let i = 0; i < dayofWeek.length; i++) {
        let dayKey = dayofWeek[i] + "availability";
        let morning = req.body[dayofWeek[i] + "m"];  // Access checkbox value dynamically
        let afternoon = req.body[dayofWeek[i] + "a"];
        let evening = req.body[dayofWeek[i] + "e"];
        let none = req.body[dayofWeek[i] + "n"];

        //debugging
        console.log(morning, afternoon, evening, none)

        // Check for combinations of availability and log accordingly
        if (morning === 'm' && afternoon === 'a' && evening === 'e') {
            availability[dayKey] = 7 + iCount;
            console.log(`${dayKey}: ${availability[dayKey]}`);

        } else if (morning === 'm' && afternoon === 'a') {
            console.log("M + A is working!");
            availability[dayKey] = 4 + iCount;
            console.log(`${dayKey}: ${availability[dayKey]}`);

        } else if (morning === 'm' && evening === 'e') {
            console.log("M + E is working!");
            availability[dayKey] = 5 + iCount;
            console.log(`${dayKey}: ${availability[dayKey]}`);

        } else if (morning === 'm') {
            console.log("Morning is working!");
            availability[dayKey] = 1 + iCount;
            console.log(`${dayKey}: ${availability[dayKey]}`);

        } else if (afternoon === 'a' && evening === 'e') {
            console.log("A + E is working!");
            availability[dayKey] = 6 + iCount;
            console.log(`${dayKey}: ${availability[dayKey]}`);

        } else if (evening === 'e') {
            console.log("Evening is working!");
            availability[dayKey] = 3 + iCount;
            console.log(`${dayKey}: ${availability[dayKey]}`);

        } else if (afternoon === 'a') {
            console.log("Afternoon is working!");
            availability[dayKey] = 2 + iCount;
            console.log(`${dayKey}: ${availability[dayKey]}`);

        } else if (none === 'n') {
            console.log("None is working!");
            availability[dayKey] = 8 + iCount;
            console.log(`${dayKey}: ${availability[dayKey]}`);

        } else {
            console.log("It's broken :(");
        }

        // Increment iCount by 8
        iCount += 8;
    }

    if (password !== confirmpassword) {
        return res.render("login", { error: "Passwords do not match", title: "Create Account - Turtle Shelter Project" });
    }
    // Now proceed to insert into database using Knex
    // Your knex logic here to save to the database
    knex('users')
        .insert({
            firstname: firstname.toLowerCase(),
            lastname: lastname.toLowerCase(),
            email: email,
            phone: phone,
            city: city,
            statecode: statecode,
            discoveredcode: discoveredcode, 
            skilllevelcode: skilllevelcode, 
            commithours: commithours, 
            traveldistance: traveldistance, 
            is_leading: is_leading, 
            newsletter: newsletter, 
            login: login,
            password: password, // Store plaintext password (Note: NOT SECURE)
            startdate: startdate,
            is_admin: admin // Default role for new users

        })
        .then(() => {
            return knex('volunteeravailability').insert({
                volunteercode: usercode,
                availabilitycode: mavailability
            })

        })
        .then(() => {
            res.redirect("/admin");
        })
        .catch(err => {
            console.error("Error creating account:", err);
            res.render("homepage", { error: "An unexpected error when trying to create the event. Please try again.", title: "Request Event - Turtle Shelter Project" });
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
    const status = req.body.status;

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
        statecode: statecode,
        discoveredcode: discoveredcode,
        expectedparticipants: expectedparticipants,
        servicetypecode: servicetypecode,
        basicskills: basicskills,
        advancedskills: advanced,
        sewingmachines: sewingmachines,
        sergers: sergers,
        payfor: payfor,
        storyshared: storyshared,
        orgnewsletter: newsletter,
        comments: comments,
        status: status.toLowerCase()

    })
    .then(() => {
        res.redirect('/');
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
    const {
        recfirstname, 
        reclastname, 
        date, 
        city, 
        statecode, 
        age, 
        gender, 
        size
    } = req.body;

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
            recfirstname,
            reclastname,
            date,
            city,
            statecode,
            age,
            gender,
            size
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

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

// ===== Middleware Setup =====

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

// Volunteer Landing Page
app.get('/volunteerhome', isAuthenticated, (req, res) => {
    res.render("volunteerhome", { error: null, title: "Volunteer Home - Turtle Shelter Project" });
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

// Event Management Page
app.get('/eventmanage', isAuthenticated, isAdmin, (req, res) => {
    knex('event')
        .select('*')
        .whereNot('status', 'completed')
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

// Edit Event
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
    const is_leading = req.body.leading === 'true';
    const newsletter = req.body.newsletter === 'true';
    const login = req.body.login;
    const password = req.body.password;
    const confirmpassword = req.body.confirmpassword;
    const admin = req.body.admin === 'false'
    if (password !== confirmpassword) {
        return res.render("login", { error: "Passwords do not match", title: "Create Account - Turtle Shelter Project" });
    }

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
            res.redirect("/admin");
        })
        .catch(err => {
            console.error("Error creating account:", err);
            res.render("login", { error: "An unexpected error occurred during account creation. Please try again.", title: "Create Account - Turtle Shelter Project" });
        });
});

// ===== Start the Server =====
app.listen(port, () => console.log(`Express App has started and server is listening on port ${port}!`));

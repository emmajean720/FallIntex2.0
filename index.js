
//2nd one
// let express = require("express");
// let app = express();
// let path = require("path");

// const port = process.env.PORT || 5500;

// app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "views"));

// // Serve static files from the 'public' folder
// app.use(express.static(path.join(__dirname, 'public')));
// app.use(express.urlencoded({ extended: true }));

// // Routes to Pages

// // Home
// app.get('/', (req, res) => {
//     const error = null;
//     const title = "Turtle Shelter Project"; // Define title for homepage
//     res.render('homepage', { error, title });
// });

// // About
// app.get('/about', (req, res) => {
//     const error = null;
//     const title = "About Us - Turtle Shelter Project"; // Define title for about page
//     res.render("about", { error, title });
// });

// // Volunteer
// app.get('/volunteer', (req, res) => {
//     const error = null;
//     const title = "Volunteer - Turtle Shelter Project"; // Define title for volunteer page
//     res.render("volunteer", { error, title });
// });

// // Donate
// app.get('/donate', (req, res) => {
//     const error = null;
//     const title = "Donate - Turtle Shelter Project"; // Define title for donate page
//     res.render("donate", { error, title });
// });

// // Login
// app.get('/login', (req, res) => {
//     const error = null;
//     const title = "Login - Turtle Shelter Project"; // Define title for login page
//     res.render("login", { error, title });
// });

// // Handle Login Form Submission
// app.post('/login', (req, res) => {
//     const { username, password } = req.body;
//     // Placeholder for authentication logic (e.g., database lookup)
//     if (username === "testuser" && password === "password") {
//         res.send('Login successful!');
//     } else {
//         res.render("login", { error: "Invalid username or password", title: "Login - Turtle Shelter Project" });
//     }
// });

// // Handle Account Creation Form Submission
// app.post('/create-account', (req, res) => {
//     const { firstname, lastname, email, city, state, phonenumber, username, password, confirmPassword } = req.body;
//     if (password !== confirmPassword) {
//         return res.render("login", { error: "Passwords do not match", title: "Create Account - Turtle Shelter Project" });
//     }
//     // Placeholder for saving the user to the database
//     res.send('Account created successfully!');
// });

// // Direct to volunteer landing page
// app.get('/volunteerhome', (req, res) => {
//     const error = null;
//     const title = "Volunteer Home - Turtle Shelter Project"; // Define title for Volunteer Landing Page
//     res.render("volunteerhome", { error, title });
// });

// // Direct to admin landing page
// app.get('/admin', (req, res) => {
//     const error = null;
//     const title = "Admin Home - Turtle Shelter Project"; // Define title for Admin Landing Page
//     res.render("admin", { error, title });
// });

// // Direct to admin manage page
// app.get('/adminmanage', (req, res) => {
//     const error = null;
//     const title = "Admin Management - Turtle Shelter Project"; // Define title for Admin Management Page
//     res.render("adminmanage", { error, title });
// });

// // Direct to admin manage page
// app.get('/volunteermanage', (req, res) => {
//     const error = null;
//     const title = "Volunteer Management - Turtle Shelter Project"; // Define title for Volunteer Management Page
//     res.render("volunteermanage", { error, title });
// });

// // Direct to Event Management page
// app.get('/eventmanage', (req, res) => {
//     const error = null;
//     const title = "Event Management - Turtle Shelter Project"; // Define title for  Event Management Page
//     res.render("eventmanage", { error, title });
// });

// // Direct to Admin Calendar page
// app.get('/admincalendar', (req, res) => {
//     const error = null;
//     const title = "Calendar - Turtle Shelter Project"; // Define title for  Admin Calendar Page
//     res.render("admincalendar", { error, title });
// });

// // Database connection using Knex
// const knex = require("knex")({
//     client: "pg",
//     connection: {
//         host: process.env.RDS_HOSTNAME || "localhost",
//         user: process.env.RDS_USERNAME || "kyleebrown",
//         password: process.env.RDS_PASSWORD || "Admin",
//         database: process.env.RDS_DB_NAME || "assignment3",
//         port: process.env.RDS_PORT || 5432,
//         ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false
//     }
// });

// // Start server
// app.listen(port, () => console.log("Express App has started and server is listening!"));

// let express = require("express");
// let app = express();
// let path = require("path");
// let session = require("express-session");

// const port = process.env.PORT || 5500;

// app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "views"));

// // Serve static files from the 'public' folder
// app.use(express.static(path.join(__dirname, 'public')));
// app.use(express.urlencoded({ extended: true }));

// // Set up session middleware
// app.use(session({
//     secret: 'your_secret_key', // Replace this with a secure secret key
//     resave: false,
//     saveUninitialized: true,
//     cookie: { secure: false } // Note: Set secure: true if using HTTPS
// }));

// // Middleware to make the user session available in all views
// app.use((req, res, next) => {
//     res.locals.user = req.session.user;
//     next();
// });

// // Database connection using Knex
// const knex = require("knex")({
//     client: "pg",
//     connection: {
//         host: process.env.RDS_HOSTNAME,
//         user: process.env.RDS_USERNAME,
//         password: process.env.RDS_PASSWORD,
//         database: process.env.RDS_DB_NAME, 
//         port: process.env.RDS_PORT || 5432,
//         // ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false
//     }
// });

// // Middleware to check if the user is authenticated
// function isAuthenticated(req, res, next) {
//     if (req.session.user) {
//         return next();
//     } else {
//         res.redirect('/login');
//     }
// }

// // Middleware to check if the user is an admin
// function isAdmin(req, res, next) {
//     if (req.session.user && req.session.user.admin) {
//         return next();
//     } else {
//         res.redirect('/volunteerhome'); // Redirect to a non-admin page for regular users
//     }
// }

// // Routes to Pages

// // Home
// app.get('/', (req, res) => {
//     const error = null;
//     const title = "Turtle Shelter Project"; // Define title for homepage
//     res.render('homepage', { error, title });
// });

// // About
// app.get('/about', (req, res) => {
//     const error = null;
//     const title = "About Us - Turtle Shelter Project"; // Define title for about page
//     res.render("about", { error, title });
// });

// // Volunteer
// app.get('/volunteer', (req, res) => {
//     const error = null;
//     const title = "Volunteer - Turtle Shelter Project"; // Define title for volunteer page
//     res.render("volunteer", { error, title });
// });

// // Donate
// app.get('/donate', (req, res) => {
//     const error = null;
//     const title = "Donate - Turtle Shelter Project"; // Define title for donate page
//     res.render("donate", { error, title });
// });

// // Login Page
// app.get('/login', (req, res) => {
//     const error = null;
//     const title = "Login - Turtle Shelter Project"; // Define title for login page
//     res.render("login", { error, title });
// });

// // Handle Login Form Submission
// app.post('/login', (req, res) => {
//     const { username, password } = req.body;

//     // Query database for user with matching username and password
//     knex('users')
//         .where({ login: username, password: password }) // Note: Storing plaintext passwords is insecure; use bcrypt for hashing
//         .first()
//         .then(user => {
//             if (user) {
//                 // Save user info in session
//                 req.session.user = {
//                     id: user.usercode,
//                     username: user.login,
//                     admin: user.admin
//                 };

//                 // Redirect based on user role
//                 if (user.admin === true) {
//                     res.redirect('/admin');
//                 } else {
//                     res.redirect('/volunteerhome');
//                 }
//             } else {
//                 // User not found or incorrect credentials
//                 res.render("login", { error: "Invalid username or password", title: "Login - Turtle Shelter Project" });
//             }
//         })
//         .catch(err => {
//             console.error("Error during login:", err);
//             res.render("login", { error: "An unexpected error occurred. Please try again.", title: "Login - Turtle Shelter Project" });
//         });
// });

// // Logout Route
// app.get('/logout', (req, res) => {
//     req.session.destroy((err) => {
//         if (err) {
//             console.error("Error during logout:", err);
//         }
//         res.redirect('/login');
//     });
// });

// // Handle Account Creation Form Submission
// app.post('/create-account', (req, res) => {
//     const { firstname, lastname, email, city, state, phonenumber, username, password, confirmPassword } = req.body;

//     if (password !== confirmPassword) {
//         return res.render("login", { error: "Passwords do not match", title: "Create Account - Turtle Shelter Project" });
//     }

//     // Insert the new user into the database with admin set to false by default
//     knex('users')
//         .insert({
//             firstname,
//             lastname,
//             email,
//             phone: phonenumber,
//             city,
//             statecode: state, // Assuming 'state' is saved using statecode foreign key
//             login: username,
//             password, // Note: Hash the password before storing
//             admin: false // Default role for new users
//         })
//         .then(() => {
//             res.send('Account created successfully!');
//         })
//         .catch(err => {
//             console.error("Error creating account:", err);
//             res.render("login", { error: "An unexpected error occurred during account creation. Please try again.", title: "Create Account - Turtle Shelter Project" });
//         });
// });

// // Volunteer Landing Page (protected route)
// app.get('/volunteerhome', isAuthenticated, (req, res) => {
//     const error = null;
//     const title = "Volunteer Home - Turtle Shelter Project"; // Define title for Volunteer Landing Page
//     res.render("volunteerhome", { error, title });
// });

// // Admin Landing Page (protected route)
// app.get('/admin', isAuthenticated, isAdmin, (req, res) => {
//     const error = null;
//     const title = "Admin Home - Turtle Shelter Project"; // Define title for Admin Landing Page
//     res.render("admin", { error, title });
// });

// // Admin Management Page (protected route)
// app.get('/adminmanage', isAuthenticated, isAdmin, (req, res) => {
//     const error = null;
//     const title = "Admin Management - Turtle Shelter Project"; // Define title for Admin Management Page
//     res.render("adminmanage", { error, title });
// });

// // Volunteer Management Page (protected route)
// app.get('/volunteermanage', isAuthenticated, (req, res) => {
//     const error = null;
//     const title = "Volunteer Management - Turtle Shelter Project"; // Define title for Volunteer Management Page
//     res.render("volunteermanage", { error, title });
// });

// // Event Management Page (protected route)
// app.get('/eventmanage', isAuthenticated, isAdmin, (req, res) => {
//     const error = null;
//     const title = "Event Management - Turtle Shelter Project"; // Define title for Event Management Page
//     res.render("eventmanage", { error, title });
// });

// // Admin Calendar Page (protected route)
// app.get('/admincalendar', isAuthenticated, isAdmin, (req, res) => {
//     const error = null;
//     const title = "Calendar - Turtle Shelter Project"; // Define title for Admin Calendar Page
//     res.render("admincalendar", { error, title });
// });

// // Test the database connection
// (async () => {
//     try {
//     const result = await knex.raw('SELECT 1+1 AS result'); // Simple query to test connection
//     console.log("Database connected successfully:", result.rows);
//     } catch (error) {
//     console.error("Database connection failed:", error.message);
//     }
// })();

// // Start server
// app.listen(port, () => console.log("Express App has started and server is listening!"));

//3rd time
require('dotenv').config(); // Load environment variables from .env file

let express = require("express");
let app = express();
let path = require("path");
let session = require("express-session");

// Port setting from environment variables or default to 5500
const port = process.env.PORT || 5500;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Set up session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key', // Use a secure session secret from .env
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure: true if using HTTPS
}));

// Middleware to make the user session available in all views
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// Database connection using Knex
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

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.redirect('/login');
    }
}

// Middleware to check if the user is an admin
function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.admin) {
        return next();
    } else {
        res.redirect('/volunteerhome'); // Redirect to a non-admin page for regular users
    }
}

// Routes to Pages

// Home
app.get('/', (req, res) => {
    const error = null;
    const title = "Turtle Shelter Project"; // Define title for homepage
    res.render('homepage', { error, title });
});

// About
app.get('/about', (req, res) => {
    const error = null;
    const title = "About Us - Turtle Shelter Project"; // Define title for about page
    res.render("about", { error, title });
});

// Volunteer
app.get('/volunteer', (req, res) => {
    const error = null;
    const title = "Volunteer - Turtle Shelter Project"; // Define title for volunteer page
    res.render("volunteer", { error, title });
});

// Donate
app.get('/donate', (req, res) => {
    const error = null;
    const title = "Donate - Turtle Shelter Project"; // Define title for donate page
    res.render("donate", { error, title });
});

// Login Page
app.get('/login', (req, res) => {
    const error = null;
    const title = "Login - Turtle Shelter Project"; // Define title for login page
    res.render("login", { error, title });
});

// Handle Login Form Submission
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Query database for user with matching username and password
    knex('users')
        .where({ login: username, password: password }) // Plaintext password matching
        .first()
        .then(user => {
            if (user) {
                // Save user info in session
                req.session.user = {
                    id: user.usercode,
                    username: user.login,
                    admin: user.admin
                };

                // Redirect based on user role
                if (user.admin === true) {
                    res.redirect('/admin');
                } else {
                    res.redirect('/volunteerhome');
                }
            } else {
                // User not found or incorrect credentials
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
        if (err) {
            console.error("Error during logout:", err);
        }
        res.redirect('/login');
    });
});

// Handle Account Creation Form Submission
app.post('/create-account', (req, res) => {
    const { firstname, lastname, email, city, state, phonenumber, username, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render("login", { error: "Passwords do not match", title: "Create Account - Turtle Shelter Project" });
    }

    // Insert the new user into the database with admin set to false by default
    knex('users')
        .insert({
            firstname,
            lastname,
            email,
            phone: phonenumber,
            city,
            statecode: state, // Assuming 'state' is saved using statecode foreign key
            login: username,
            password, // Store plaintext password (Note: NOT SECURE)
            admin: false // Default role for new users
        })
        .then(() => {
            res.send('Account created successfully!');
        })
        .catch(err => {
            console.error("Error creating account:", err);
            res.render("login", { error: "An unexpected error occurred during account creation. Please try again.", title: "Create Account - Turtle Shelter Project" });
        });
});

// Volunteer Landing Page (protected route)
app.get('/volunteerhome', isAuthenticated, (req, res) => {
    const error = null;
    const title = "Volunteer Home - Turtle Shelter Project"; // Define title for Volunteer Landing Page
    res.render("volunteerhome", { error, title });
});

// Admin Landing Page (protected route)
app.get('/admin', isAuthenticated, isAdmin, (req, res) => {
    const error = null;
    const title = "Admin Home - Turtle Shelter Project"; // Define title for Admin Landing Page
    res.render("admin", { error, title });
});

// Test the database connection
(async () => {
    try {
        const result = await knex.raw('SELECT 1+1 AS result'); // Simple query to test connection
        console.log("Database connected successfully:", result.rows);
    } catch (error) {
        console.error("Database connection failed:", error.message);
    }
})();

// Start server
app.listen(port, () => console.log("Express App has started and server is listening!"));

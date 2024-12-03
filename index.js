// let express = require("express");
// let app = express();
// let path = require("path");
// let security = false;
// const port = process.env.PORT || 5500;
// app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "views"));
// // Serve static files from the 'public' folder
// app.use(express.static(path.join(__dirname, 'public')));
// app.use(express.urlencoded({extended: true}));
// // Routes to Pages
// // home
// app.get('/', (req, res) => {
//     const error = null;
//     res.render('homepage', { error });
// });
// //about
// app.get('/about', (req, res) => {
//     const error = null;
//     res.render("about", { error }); // Pass 'error' to the template
// });
// //Volunteer
// app.get('/volunteer', (req, res) => {
//     const error = null;
//     res.render("volunteer", { error }); // Pass 'error' to the template
// });
// //donate
// app.get('/donate', (req, res) => {
//     const error = null;
//     res.render("donate", { error }); // Pass 'error' to the template
// });
// const knex = require("knex") ({
//     client : "pg",
//     connection : {
//         host : process.env.RDS_HOSTNAME || "localhost",
//         user : process.env.RDS_USERNAME || "kyleebrown",
//         password : process.env.RDS_PASSWORD || "Admin",
//         database : process.env.RDS_DB_NAME || "assignment3",
//         port : process.env.RDS_PORT || 5432,
//         ssl : process.env.DB_SSL ? {rejectUnauthorized : false} : false
//     }
// });
// app.listen(port, () => console.log("Express App has started and server is listening!"));

let express = require("express");
let app = express();
let path = require("path");

const port = process.env.PORT || 5500;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

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

// Login
app.get('/login', (req, res) => {
    const error = null;
    const title = "Login - Turtle Shelter Project"; // Define title for login page
    res.render("login", { error, title });
});

// Handle Login Form Submission
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Placeholder for authentication logic (e.g., database lookup)
    if (username === "testuser" && password === "password") {
        res.send('Login successful!');
    } else {
        res.render("login", { error: "Invalid username or password", title: "Login - Turtle Shelter Project" });
    }
});

// Handle Account Creation Form Submission
app.post('/create-account', (req, res) => {
    const { firstname, lastname, email, city, state, phonenumber, username, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
        return res.render("login", { error: "Passwords do not match", title: "Create Account - Turtle Shelter Project" });
    }
    // Placeholder for saving the user to the database
    res.send('Account created successfully!');
});

// Database connection using Knex
const knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.RDS_HOSTNAME || "localhost",
        user: process.env.RDS_USERNAME || "kyleebrown",
        password: process.env.RDS_PASSWORD || "Admin",
        database: process.env.RDS_DB_NAME || "assignment3",
        port: process.env.RDS_PORT || 5432,
        ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false
    }
});

// Start server
app.listen(port, () => console.log("Express App has started and server is listening!"));


const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

// Create a connection to the MySQL database
const db = mysql.createConnection({
    host: 'bhd6etwlauimbd4c6tiw-mysql.services.clever-cloud.com',
    user: 'u0xy0iaquntg8py8',
    password: 'GN6ahWSuoaXW9pJpZKn0', // Replace with your MySQL password
    database: 'bhd6etwlauimbd4c6tiw'
});

// Connect to the database
db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to database.');
});

// In-memory storage for votes (for simplicity)
let votes = {
    "Nshimiyimana. ": 0,
    "Ishimwe. ": 0,
    "Ntirenganya Juma. ": 0,
    "Gatesi. ": 0,
    "Muteteri H. ": 0
};

// In-memory storage for user data (for simplicity)
let userNames = {};
let voters = new Set(); // Set to track phone numbers that have already voted
let userLanguages = {}; // Object to store the language preference of each user

app.post('/ussd', (req, res) => {
    let response = '';

    // Extract USSD input
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    // Parse user input
    const userInput = text.split('*').map(option => option.trim());

    // Determine next action based on user input
    if (userInput.length === 1 && userInput[0] === '') {
        // First level menu: Language selection
        response = `CON Welcome to NEC ease voting\n`;
        response += `1. English\n`;
        response += `2. Kinyarwanda`;
    } else if (userInput.length === 1 && userInput[0] !== '') {
        // Save user's language choice and move to the name input menu
        userLanguages[phoneNumber] = userInput[0] === '1' ? 'en' : 'rw';
        response = userLanguages[phoneNumber] === 'en' ? 
            `CON Please enter your name:` : 
            `CON Injiza izina ryawe:`;
    } else if (userInput.length === 2) {
        // Save user's name
        userNames[phoneNumber] = userInput[1];

        // Third level menu: Main menu
        response = userLanguages[phoneNumber] === 'en' ? 
            `CON Hi ${userNames[phoneNumber]}, choose an option:\n1. Vote Candidate\n2. View Votes` : 
            `CON Muraho ${userNames[phoneNumber]}, hitamo uburyo:\n1. Tora umukandida\n2. Reba amajwi`;
    } else if (userInput.length === 3) {
        if (userInput[2] === '1') {
            // Check if the phone number has already voted
            if (voters.has(phoneNumber)) {
                response = userLanguages[phoneNumber] === 'en' ? 
                    `END You have already voted. Thank you!` : 
                    `END Biragara ko Mwatoye rimwe ryemewe. !`;
            } else {
                // Voting option selected
                response = userLanguages[phoneNumber] === 'en' ? 
                    `CON Select a candidate:\n1. Nshimiyimana Isaac\n2. Ishimwe Christian\n3. Ntirenganya Juma\n4. Gatesi Kevine\n5. Muteteri H`: 
                    `CON Hitamo umukandida:\n1. Nshimiyimana Isaac\n2. Ishimwe Christian\n3. Ntirenganya Juma\n4. Gatesi Kevine\n5. Muteteri H`;
            }
        } else if (userInput[2] === '2') {
            // View votes option selected
            response = userLanguages[phoneNumber] === 'en' ? 
                `END Votes:\n` : 
                `END Amajwi:\n`;
            for (let candidate in votes) {
                response += `${candidate}: ${votes[candidate]} votes\n`;
            }
        }
    } else if (userInput.length === 4) {
        // Fourth level menu: Voting confirmation
        let candidateIndex = parseInt(userInput[3]) - 1;
        let candidateNames = Object.keys(votes);
        if (candidateIndex >= 0 && candidateIndex < candidateNames.length) {
            votes[candidateNames[candidateIndex]] += 1;
            voters.add(phoneNumber); // Mark this phone number as having voted
            response = userLanguages[phoneNumber] === 'en' ? 
                `END Thank you for voting for ${candidateNames[candidateIndex]}!` : 
                `END Murakoze gutora ${candidateNames[candidateIndex]}!`;

            // Insert voting record into the database
            const voteData = {
                session_id: sessionId,
                phone_number: phoneNumber,
                user_name: userNames[phoneNumber],
                language_used: userLanguages[phoneNumber],
                voted_candidate: candidateNames[candidateIndex],
                voting_time: new Date() // Add current timestamp
            };

            const query = 'INSERT INTO voting_data SET ?';
            db.query(query, voteData, (err, result) => {
                if (err) {
                    console.error('Error inserting data into database:', err.stack);
                }
            });
        } else {
            response = userLanguages[phoneNumber] === 'en' ? 
                `END Invalid selection. Please try again.` : 
                `END Amahitamo Adahwitse. Ongera ugerageze.`; 
        }
    }

    res.send(response);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

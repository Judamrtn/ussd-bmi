const express = require('express');
const app = express();

// Middleware to parse incoming form data
app.use(express.urlencoded({ extended: true }));

app.post('/ussd', (req, res) => {
    const { sessionId, phoneNumber, text } = req.body;

    let response = '';
    const inputs = text.split('*');

    // Debug logs
    console.log(`Session: ${sessionId}, Phone: ${phoneNumber}, Text: ${text}, Inputs:`, inputs);

    if (text === '') {
        // Step 1: Language selection
        response = `CON Welcome to Health BMI App
1. English
2. Kinyarwanda`;
    } else if (inputs.length === 1) {
        // Step 2: Ask for weight
        response = `CON Enter your weight in KG:`;
    } else if (inputs.length === 2) {
        // Step 3: Ask for height
        response = `CON Enter your height in CM:`;
    } else if (inputs.length === 3) {
        // Step 4: Calculate BMI
        const weight = parseFloat(inputs[1]);
        const height = parseFloat(inputs[2]);

        if (isNaN(weight) || isNaN(height)) {
            response = 'END Invalid weight or height. Please enter valid numbers.';
        } else {
            const bmi = weight / ((height / 100) ** 2);
            let status = '';

            if (bmi < 18.5) status = 'Underweight';
            else if (bmi < 25) status = 'Normal';
            else if (bmi < 30) status = 'Overweight';
            else status = 'Obese';

            response = `CON Your BMI is ${bmi.toFixed(1)} (${status})
Would you like health tips?
1. Yes
2. No`;
        }
    } else if (inputs.length === 4) {
        // Step 5: Provide health tips
        const lang = inputs[0]; // 1 = English, 2 = Kinyarwanda
        const weight = parseFloat(inputs[1]);
        const height = parseFloat(inputs[2]);
        const wantTips = inputs[3];

        const bmi = weight / ((height / 100) ** 2);

        let tip = '';
        if (bmi < 18.5) {
            tip = lang === '1'
                ? 'Eat more calories and protein. Consult a doctor.'
                : 'Fata ibiryo birimo intungamubiri nyinshi. Ganira na muganga.';
        } else if (bmi < 25) {
            tip = lang === '1'
                ? 'You are healthy. Maintain balanced meals.'
                : 'Uri muzima. Kurikiza indyo yuzuye.';
        } else if (bmi < 30) {
            tip = lang === '1'
                ? 'Exercise often and avoid junk food.'
                : 'Jya ukora imyitozo kandi wirinde ibiryo bibi.';
        } else {
            tip = lang === '1'
                ? 'See a doctor. Follow a strict diet.'
                : 'Ganira na muganga. Kurikiza indyo ikomeye.';
        }

        if (wantTips === '1') {
            response = `END ${tip}`;
        } else if (wantTips === '2') {
            response = lang === '1'
                ? 'END Thank you for using our service.'
                : 'END Murakoze gukoresha serivisi yacu.';
        } else {
            response = 'END Invalid option for health tips.';
        }
    } else {
        // Handle too many or invalid inputs
        response = 'END Invalid input. Please restart and follow the instructions.';
    }

    res.set('Content-Type', 'text/plain');
    res.send(response);
});

// Start server
const PORT = 7000;
app.listen(PORT, () => {
    console.log(` USSD app running at http://localhost:${PORT}/ussd`);
});

const express = require('express');
const app = express();

// Middleware to parse incoming form data
app.use(express.urlencoded({ extended: true }));

app.post('/ussd', (req, res) => {
    const { sessionId, phoneNumber, text } = req.body;

    let response = '';
    const inputs = text.split('*');

    console.log(`Session: ${sessionId}, Phone: ${phoneNumber}, Text: ${text}, Inputs:`, inputs);

    const lang = inputs[0]; // 1 = English, 2 = Kinyarwanda

    if (text === '') {
        // Step 1: Language selection
        response = `CON Welcome to Health BMI App\n1. English\n2. Kinyarwanda`;
    } else if (inputs.length === 1) {
        // Step 2: Ask for weight
        response = lang === '1'
            ? 'CON Enter your weight in KG:'
            : 'CON Andika ibiro byawe mu kiro:';
    } else if (inputs.length === 2) {
        // Step 3: Ask for height
        response = lang === '1'
            ? 'CON Enter your height in CM:'
            : 'CON Andika uburebure bwawe muri CM:';
    } else if (inputs.length === 3) {
        // Step 4: Calculate BMI
        const weight = parseFloat(inputs[1]);
        const height = parseFloat(inputs[2]);

        if (isNaN(weight) || isNaN(height)) {
            response = lang === '1'
                ? 'END Invalid weight or height. Please enter valid numbers.'
                : 'END Watanze ibipimo bidahuye. Ongera ugerageze.';
        } else {
            const bmi = weight / ((height / 100) ** 2);
            let status = '';

            if (bmi < 18.5) status = lang === '1' ? 'Underweight' : 'Ufite ibiro bike cyane';
            else if (bmi < 25) status = lang === '1' ? 'Normal' : 'Ibiro bisanzwe';
            else if (bmi < 30) status = lang === '1' ? 'Overweight' : 'Ufite ibiro byinshi';
            else status = lang === '1' ? 'Obese' : 'Ufite umubyibuho ukabije';

            response = lang === '1'
                ? `CON Your BMI is ${bmi.toFixed(1)} (${status})\nWould you like health tips?\n1. Yes\n2. No`
                : `CON BMI yawe ni ${bmi.toFixed(1)} (${status})\nWifuza inama z’ubuzima?\n1. Yego\n2. Oya`;
        }
    } else if (inputs.length === 4) {
        // Step 5: Provide health tips
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
            response = lang === '1'
                ? 'END Invalid option for health tips.'
                : 'END Igisubizo si cyo. Ongera ugerageze.';
        }
    } else {
        // Invalid or too many inputs
        response = lang === '1'
            ? 'END Invalid input. Please restart and follow the instructions.'
            : 'END Igisubizo si cyo. Tangira bundi bushya ukurikize amabwiriza.';
    }

    res.set('Content-Type', 'text/plain');
    res.send(response);
});

// Start server
const PORT = 7000;
app.listen(PORT, () => {
    console.log(`✅ USSD app running at http://localhost:${PORT}/ussd`);
});

const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.urlencoded({ extended: true }));

// PostgreSQL connection setup
const pool = new Pool({
    connectionString: 'postgresql://bmi_owner:npg_80fSItQlYyvU@ep-crimson-breeze-a85vky17-pooler.eastus2.azure.neon.tech/bmi?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

// USSD endpoint
app.post('/ussd', async (req, res) => {
    let { sessionId, phoneNumber, text } = req.body;

    // Split inputs or empty array if text is empty
    let inputs = text === '' ? [] : text.split('*');

    // Language is first input if exists
    const lang = inputs[0] || '';

    // Handle Back button (input = '0')
    if (inputs.length > 0 && inputs[inputs.length - 1] === '0') {
        inputs.pop(); // Remove '0'

        // Back behavior:
        // If user is at weight input (inputs.length == 0 after pop), going back means restart to language selection (empty inputs)
        // Otherwise, remove previous input to go back one step
        if (inputs.length === 0) {
            // At weight input, back goes to language select
            text = '';
            inputs = [];
        } else {
            inputs.pop(); // remove previous input to go back one step
            text = inputs.join('*');
            inputs = text === '' ? [] : text.split('*');
        }
    }

    let response = '';

    try {
        // Save session if new (avoid FK errors)
        await pool.query(
            'INSERT INTO sessions (session_id, phone_number) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [sessionId, phoneNumber]
        );

        if (inputs.length === 0) {
            // Step 1: Language selection
            response = `CON Welcome to Health BMI App / Ikaze kuri porogaramu ya BMI\n1. English\n2. Kinyarwanda`;
        } else if (inputs.length === 1) {
            // Step 2: Ask for weight + Back option
            response = lang === '1'
                ? 'CON Enter your weight in Kilograms:\n0. Back'
                : 'CON Andika ibiro byawe mu kiro:\n0. Subira inyuma';
        } else if (inputs.length === 2) {
            // Validate weight input before going to age
            const weight = parseFloat(inputs[1]);
            if (isNaN(weight) || weight <= 0 || weight > 300) {
                response = lang === '1'
                    ? 'CON Invalid weight. Please enter a valid weight in Kilograms:\n0. Back'
                    : 'CON Ibiro ntibikwiye. Ongera wandike ibiro mu kiro:\n0. Subira inyuma';
            } else {
                response = lang === '1'
                    ? 'CON Enter your age:\n0. Back'
                    : 'CON Andika imyaka yawe:\n0. Subira inyuma';
            }
        } else if (inputs.length === 3) {
            // Validate age input before going to height
            const age = parseInt(inputs[2]);
            if (isNaN(age) || age <= 0 || age > 120) {
                response = lang === '1'
                    ? 'CON Invalid age. Please enter a valid age:\n0. Back'
                    : 'CON Imyaka ntikwiye. Ongera wandike imyaka yawe:\n0. Subira inyuma';
            } else {
                response = lang === '1'
                    ? 'CON Enter your height in centimeters:\n0. Back'
                    : 'CON Andika uburebure bwawe muri sanimetero:\n0. Subira inyuma';
            }
        } else if (inputs.length === 4) {
            // Validate height input and calculate BMI
            const weight = parseFloat(inputs[1]);
            const age = parseInt(inputs[2]);
            const height = parseFloat(inputs[3]);

            if (isNaN(height) || height < 30 || height > 250) {
                response = lang === '1'
                    ? 'CON Invalid height. Please enter a valid height in centimeters:\n0. Back'
                    : 'CON Uburebure ntibukwiye. Ongera wandike uburebure muri sanimetero:\n0. Subira inyuma';
            } else {
                const bmi = weight / ((height / 100) ** 2);

                await pool.query(
                    'INSERT INTO measurements (session_id, age, weight, height, bmi) VALUES ($1, $2, $3, $4, $5)',
                    [sessionId, age, weight, height, bmi]
                );

                let status = '';
                if (bmi < 18.5) status = lang === '1' ? 'Underweight' : 'Ufite ibiro bike cyane';
                else if (bmi < 25) status = lang === '1' ? 'Normal' : 'Ibiro bisanzwe';
                else if (bmi < 30) status = lang === '1' ? 'Overweight' : 'Ufite ibiro byinshi';
                else status = lang === '1' ? 'Obese' : 'Ufite umubyibuho ukabije';

                response = lang === '1'
                    ? `CON Your BMI is ${bmi.toFixed(1)} (${status})\nWould you like health tips?\n1. Yes\n2. No\n0. Back`
                    : `CON BMI yawe ni ${bmi.toFixed(1)} (${status})\nWifuza inama z’ubuzima?\n1. Yego\n2. Oya\n0. Subira inyuma`;
            }
        } else if (inputs.length === 5) {
            // Step 6: Provide health tips or exit
            const weight = parseFloat(inputs[1]);
            const age = parseInt(inputs[2]);
            const height = parseFloat(inputs[3]);
            const wantTips = inputs[4];
            const bmi = weight / ((height / 100) ** 2);

            let tip = '';
            if (bmi < 18.5) tip = lang === '1'
                ? 'Eat more calories and protein. Consult a doctor.'
                : 'Fata ibiryo birimo intungamubiri nyinshi. Ganira na muganga.';
            else if (bmi < 25) tip = lang === '1'
                ? 'You are healthy. Maintain balanced meals.'
                : 'Uri muzima. Kurikiza indyo yuzuye.';
            else if (bmi < 30) tip = lang === '1'
                ? 'Exercise often and avoid junk food.'
                : 'Jya ukora imyitozo kandi wirinde ibiryo bibi.';
            else tip = lang === '1'
                ? 'See a doctor. Follow a strict diet.'
                : 'Ganira na muganga. Kurikiza indyo ikomeye.';

            if (wantTips === '1') {
                response = `END ${tip}`;
            } else if (wantTips === '2') {
                response = lang === '1'
                    ? 'END Thank you for using our service.'
                    : 'END Murakoze gukoresha serivisi yacu.';
            } else if (wantTips === '0') {
                // User pressed Back from tips menu, go back to BMI result menu
                inputs.pop(); // Remove last input
                // Rebuild BMI result prompt
                let status = '';
                if (bmi < 18.5) status = lang === '1' ? 'Underweight' : 'Ufite ibiro bike cyane';
                else if (bmi < 25) status = lang === '1' ? 'Normal' : 'Ibiro bisanzwe';
                else if (bmi < 30) status = lang === '1' ? 'Overweight' : 'Ufite ibiro byinshi';
                else status = lang === '1' ? 'Obese' : 'Ufite umubyibuho ukabije';

                response = lang === '1'
                    ? `CON Your BMI is ${bmi.toFixed(1)} (${status})\nWould you like health tips?\n1. Yes\n2. No\n0. Back`
                    : `CON BMI yawe ni ${bmi.toFixed(1)} (${status})\nWifuza inama z’ubuzima?\n1. Yego\n2. Oya\n0. Subira inyuma`;
            } else {
                response = lang === '1'
                    ? 'END Invalid option for health tips.'
                    : 'END Igisubizo si cyo. Ongera ugerageze.';
            }
        } else {
            response = lang === '1'
                ? 'END Invalid input. Please restart and follow the instructions.'
                : 'END Igisubizo si cyo. Tangira bundi bushya ukurikize amabwiriza.';
        }

        res.set('Content-Type', 'text/plain');
        res.send(response);

    } catch (err) {
        console.error('❌ Error:', err);
        res.send('END Internal server error. Try again later.');
    }
});

// Start server
const PORT = 7000;
app.listen(PORT, () => {
    console.log(`✅ USSD app running at http://localhost:${PORT}/ussd`);
});
